import { v4 as uuidv4 } from "uuid";
import * as repo from "../repositories/salesRepo.js";
import * as inventoryRepo from "../repositories/inventoryRepo.js";
import * as settingsRepo from "../repositories/settingRepo.js";
import { sanitizeResponse, toCamelCase } from "../utils/formatter.js";
import {
  processNewNotification,
  removeRelatedNotifications,
  sendSystemEmail,
} from "./notificationServices.js";
import nodemailer from "nodemailer";
import * as employeeRepo from "../repositories/employeeRepo.js";
import * as customerRepo from "../repositories/customerRepo.js";
import { emitGlobalUpdate } from "../socket.js";

export const getFormattedSales = async (user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const { sales, items, payments } = await repo.getAllSalesData(canShowAll);
  const salesWithItems = sales.map((sale) => ({
    ...sale,
    items: items.filter((item) => item.sale_id === sale.id),
    payments: payments.filter((payment) => payment.sale_id === sale.id),
  }));

  const camelData = toCamelCase(salesWithItems);

  return sanitizeResponse(camelData, canShowAll);
};

export const processNewSale = async (data, creator, user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const saleId = uuidv4();
  let finalCustomerId = data.customerId || null;

  if (!finalCustomerId) {
    if (!data.customerMobile || data.customerMobile.trim().length === 0) {
      throw new Error("Mobile number is mandatory for new customers.");
    }
    
    // Check for duplicate mobile
    const existingCustomer = await customerRepo.getCustomerByMobileDB(data.customerMobile);
    if (existingCustomer) {
      throw new Error(`Mobile number ${data.customerMobile} already belongs to an existing customer. Please select them from the dropdown.`);
    }

    finalCustomerId = uuidv4();
    await customerRepo.insertCustomer({
      id: finalCustomerId,
      name: data.customerName || "Unknown Customer",
      email: data.customerEmail || null,
      mobile: data.customerMobile,
      address: data.customerAddress || null,
      gstNumber: data.gstNumber || null,
      opening_balance: 0,
    });
    emitGlobalUpdate(["Customers"]);
  }

  const saleData = {
    id: saleId,
    invoiceNumber: data.invoiceNumber,
    customerName: data.customerName,
    customerEmail: data.customerEmail || null,
    customerMobile: data.customerMobile,
    customerAddress: data.customerAddress,
    gstNumber: data.gstNumber,
    saleDate: data.saleDate,
    shippingName: data.shippingName,
    shippingMobile: data.shippingMobile,
    shippingEmail: data.shippingEmail,
    shippingAddress: data.shippingAddress,
    shippingGst: data.shippingGst,
    poNumber: data.poNumber,
    poDate: data.poDate,
    vehicleNo: data.vehicleNo,
    saleType: data.saleType,
    gstType: data.gstType,
    subtotal: data.subtotal,
    totalGstAmount: data.totalGstAmount,
    discount: data.discount || 0,
    totalAmount: data.totalAmount,
    amountPaid: data.amountPaid || 0,
    balance: data.balance || 0,
    paymentMode: data.paymentMode,
    referenceNumber: data.referenceNumber,
    paymentStatus: data.paymentStatus,
    creator,
    referenceId: data.referenceId || null,
    earnedPoints: data.earnedPoints,
    freightCharges: data.freightCharges,
    customerId: finalCustomerId,
  };

  const itemsData = data.items.map((item) => ({
    ...item,
    itemId: uuidv4(),
    basePrice: Number(item.basePrice),
    price: Number(item.price),
    conversionRate: Number(item.conversionRate),
    itemDiscPercent: Number(item.itemDiscPercent),
    unit: item.unit,
    selectedUnit: item.selectedUnit || item.unit,
    altUnitConversion: Number(item.altUnitConversion) || null,
    hsn: item.hsn || null,
    cgst: item.cgst || 0,
    sgst: item.sgst || 0,
    igst: item.igst || 0,
    gstAmount: item.gstAmount || 0,
    priceAfterGst: item.priceAfterGst || 0,
  }));

  await repo.createSaleTx(saleData, itemsData);

  emitGlobalUpdate([
    "Sales",
    "Inventory",
    "References",
    "InternalLedger",
    "Notifications",
  ]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

  if (!canShowAll && data.saleType === "PAKKA") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "NEW_SALE",
      title: "New Sale Recorded",
      message: `Invoice ${data.invoiceNumber} generated for ${data.customerName}. Total: ₹${data.totalAmount} By ${user.name} (${user.role})`,
      reference_module: "sales",
      reference_id: saleId,
    },
    targets,
  );

  const soldProductIds = itemsData.map((item) => item.id);

  if (soldProductIds.length > 0) {
    const isEnabled = await settingsRepo.getSettingValueByKeyDB(
      "notification_enabled",
    );
    if (isEnabled === true || isEnabled === "true") {
      const lowStockItems = await inventoryRepo.checkLowStockThresholdsDB(
        soldProductIds,
        canShowAll,
      );

      if (lowStockItems && lowStockItems.length > 0) {
        let inventoryNotificationTargets = [
          { target_type: "ROLE", target_value: "SUPER_ADMIN" },
        ];

        const superAdmins =
          await employeeRepo.getEmployeesByRoleDB("SUPER_ADMIN");
        const emailTargets = [...superAdmins.map((u) => u.email)];

        if (!canShowAll && data.saleType === "PAKKA") {
          inventoryNotificationTargets.push(
            { target_type: "ROLE", target_value: "ADMIN" },
            { target_type: "ROLE", target_value: "INVENTORY_MANAGER" },
          );

          const admins = await employeeRepo.getEmployeesByRoleDB("ADMIN");
          const inventoryManagers =
            await employeeRepo.getEmployeesByRoleDB("INVENTORY_MANAGER");

          emailTargets.push(...admins.map((u) => u.email));
          emailTargets.push(...inventoryManagers.map((u) => u.email));
        }

        let consolidatedEmailMessage =
          "The following items have dropped below their stock threshold value:<br><br>";

        for (const item of lowStockItems) {
          await processNewNotification(
            {
              type: "LOW_STOCK",
              title: "Low Stock Alert",
              message: `Stock for ${item.product_name} has dropped below the threshold value (${item.threshold_value}).`,
              reference_module: "inventory",
              reference_id: item.product_id,
            },
            inventoryNotificationTargets,
          );

          consolidatedEmailMessage += `• <b>${item.product_name}</b> (Available: ${item.current_stock}) (Threshold: ${item.threshold_value})<br>`;
        }

        await sendSystemEmail(
          "Low Stock Alert - Action Required",
          consolidatedEmailMessage,
          emailTargets,
        );
      }
    }
  }

  return saleId;
};

export const modifySale = async (id, data, user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const oldSale = await repo.getSaleByIdDB(id, canShowAll);

  const updateData = {
    customerId: data.customerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerMobile: data.customerMobile,
    customerAddress: data.customerAddress,
    gstNumber: data.gstNumber,
    shippingName: data.shippingName,
    shippingMobile: data.shippingMobile,
    shippingEmail: data.shippingEmail,
    shippingAddress: data.shippingAddress,
    shippingGst: data.shippingGst,
    poNumber: data.poNumber,
    poDate: data.poDate,
    vehicleNo: data.vehicleNo,
    billNo: data.billNo,
    subtotal: data.subtotal,
    totalGstAmount: data.totalGstAmount,
    freightCharges: data.freightCharges,
    discount: data.discount,
    totalAmount: data.totalAmount,
    balance: data.balance,
    items: data.items,
  };

  await repo.updateSaleTx(id, updateData);

  emitGlobalUpdate([
    "Sales",
    "Inventory",
    "References",
    "InternalLedger",
    "Notifications",
  ]);

  let changes = [];
  if (oldSale.customer_name !== updateData.customerName) {
    changes.push(
      `Name: ${oldSale.customer_name} -> ${updateData.customerName}`,
    );
  }
  if (Number(oldSale.total_amount) !== Number(updateData.totalAmount)) {
    changes.push(
      `Total: ₹${oldSale.total_amount} -> ₹${updateData.totalAmount}`,
    );
  }

  if (changes.length > 0) {
    const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
    if (
      !canShowAll &&
      (data.saleType === "PAKKA" || oldSale.sale_type === "PAKKA")
    ) {
      targets.push({ target_type: "ROLE", target_value: "ADMIN" });
    }
    await processNewNotification(
      {
        type: "SALE_UPDATED",
        title: `Sale Modified: ${oldSale.invoice_number || updateData.billNo}`,
        message: `${user.name} modified ${oldSale.invoice_number || updateData.billNo}. Changes: ${changes.join(", ")}`,
        reference_module: "sales",
        reference_id: id,
      },
      targets,
    );
  }
};

export const addSalePayment = async (id, data, user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const oldSale = await repo.getSaleByIdDB(id, canShowAll);
  const { amount, paymentMode, referenceNumber, paymentDate } = data;

  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error("INVALID_PAYMENT_AMOUNT");
  }

  if (paymentMode !== "CASH" && !referenceNumber) {
    throw new Error("REFERENCE_NUMBER_REQUIRED");
  }

  const finalPaymentDate = paymentDate || new Date();

  const result = await repo.addPartialPaymentTx(id, {
    amount: Number(amount),
    paymentMode,
    referenceNumber: paymentMode === "CASH" ? "CASH_PAYMENT" : referenceNumber,
    paymentDate: finalPaymentDate,
  });

  emitGlobalUpdate(["Sales", "Notifications"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  if (!canShowAll && oldSale.sale_type === "PAKKA") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "PAYMENT_RECEIVED",
      title: `Payment Received: ₹${amount}`,
      message: `${user.name} ${user.role} recorded ₹${amount} via ${paymentMode} on ${new Date(finalPaymentDate).toLocaleDateString()}. New Balance: ₹${result.updatedBalance}`,
      reference_module: "sales",
      reference_id: oldSale.id,
    },
    targets,
  );

  return result;
};
export const removePayment = async (paymentId, user) => {
  const isSuperAdminAction = user?.role === "SUPER_ADMIN";

  const paymentData = await repo.getPaymentByIdDB(paymentId);
  const paymentDetails = toCamelCase(paymentData);

  if (!paymentDetails) {
    throw new Error("Payment record not found");
  }

  const { saleId, amount } = paymentDetails;
  const saleData = await repo.getSaleByIdDB(saleId);
  const saleDetails = toCamelCase(saleData);

  const result = await repo.deletePaymentTx(paymentId);

  emitGlobalUpdate(["Sales", "Notifications"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  if (!isSuperAdminAction && saleDetails.saleType === "PAKKA") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "PAYMENT_DELETED",
      title: "Payment Entry Removed",
      message: `A payment of ₹${amount} for Sale ID ${saleId} was deleted by ${user.name} (${user.role}).`,
      reference_module: "sales",
      reference_id: saleId,
    },
    targets,
  );

  return result;
};

export const removeSale = async (id, user) => {
  const isSuperAdminAction = user?.role === "SUPER_ADMIN";
  const saleData = await repo.getSaleByIdDB(id, isSuperAdminAction);
  const saleDetails = toCamelCase(saleData);

  if (!saleDetails) {
    throw new Error("Sale record not found");
  }

  await repo.deleteSaleTx(id);
  await removeRelatedNotifications(id, "sales");
  await removeRelatedNotifications(id, "returns");

  emitGlobalUpdate([
    "Sales",
    "Notifications",
    "Inventory",
    "References",
    "InternalLedger",
  ]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

  if (!isSuperAdminAction && saleDetails.saleType === "PAKKA") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "SALE_DELETED",
      title: "Critical: Sale Deleted",
      message: `Invoice ${saleDetails.invoiceNumber} worth ₹${saleDetails.totalAmount} was deleted by ${user.name} (${user.role}).`,
      reference_module: "sales",
      reference_id: id,
    },
    targets,
  );
};

export const processNewReturn = async (data, creator, user) => {
  const isSuperAdminAction = user?.role === "SUPER_ADMIN";
  const returnId = uuidv4();
  const returnData = {
    id: returnId,
    original_sale_id: data.original_sale_id,
    return_number: data.return_number,
    customer_name: data.customer_name,
    customer_email: data.customer_email || null,
    customer_mobile: data.customer_mobile,
    customer_address: data.customer_address,
    gst_number: data.gst_number,
    sale_date: data.sale_date,
    shipping_name: data.shipping_name,
    shipping_mobile: data.shipping_mobile,
    shipping_email: data.shipping_email,
    shipping_address: data.shipping_address,
    shipping_gst: data.shipping_gst,
    po_number: data.po_number,
    po_date: data.po_date,
    vehicle_no: data.vehicle_no,
    return_date: data.return_date,
    remarks: data.remarks || null,
    sale_type: data.sale_type,
    gst_type: data.gst_type,
    subtotal: data.subtotal,
    total_gst_amount: data.total_gst_amount,
    total_amount: data.total_amount,
    original_discount: data.original_discount,
    original_sale_total: data.original_sale_total,
    creator,
  };

  const returnItemsData = data.items.map((item) => ({
    ...item,
    itemId: uuidv4(),
    hsn: item.hsn || null,
    base_price: item.base_price,
    price: item.price,
    conversion_rate: item.conversion_rate,
    item_disc_percent: item.item_disc_percent,
    unit: item.unit,
    selected_unit: item.selected_unit || item.unit,
    alt_unit_conversion: Number(item.alt_unit_conversion) || null,
    cgst: item.cgst || 0,
    sgst: item.sgst || 0,
    igst: item.igst || 0,
    gst_amount: item.gst_amount || 0,
    price_after_gst: item.price_after_gst || 0,
  }));

  await repo.createReturnTx(returnData, returnItemsData);

  emitGlobalUpdate(["Sales", "Notifications", "Inventory"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

  if (!isSuperAdminAction && data.sale_type === "PAKKA") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "NEW_RETURN",
      title: "New Sales Return",
      message: `Return ${returnData.return_number} recorded for ${returnData.customer_name}. Refund Amount: ₹${returnData.total_amount} by ${user.name} (${user.role}).`,
      reference_module: "returns",
      reference_id: data.original_sale_id,
    },
    targets,
  );

  return returnId;
};

export const getFormattedReturns = async (user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const { returns, items } = await repo.getAllReturnsData(canShowAll);
  const returnsWithItems = returns.map((ret) => ({
    ...ret,
    items: items.filter((item) => item.return_id === ret.id),
  }));
  return toCamelCase(returnsWithItems);
};

export const sendInvoiceAndTrack = async ({
  email,
  subject,
  message,
  pdfFile,
}) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `<${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    text: message,
    attachments: [
      {
        filename: pdfFile.originalname || "Invoice.pdf",
        content: pdfFile.buffer,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Email sent successfully!",
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const removeReturn = async (returnId, user) => {
  const isSuperAdminAction = user?.role === "SUPER_ADMIN";
  
  await repo.deleteReturnTx(returnId);
  await removeRelatedNotifications(returnId, "returns");

  emitGlobalUpdate([
    "Sales",
    "Notifications",
    "Inventory",
    "References",
    "InternalLedger",
  ]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  
  await processNewNotification(
    {
      type: "RETURN_DELETED",
      title: "Critical: Return Deleted",
      message: `A sale return was deleted by ${user.name} (${user.role}).`,
      reference_module: "sales",
      reference_id: returnId,
    },
    targets,
  );
};

export const getAnomalies = async (user) => {
  if (user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  
  const brokenSales = await repo.getAnomaliesDB();
  const results = [];
  
  for (const sale of brokenSales) {
    let anomalyType = (!sale.customer_id) ? "NULL_CUSTOMER_ID" : "ORPHANED_SALE";
    let matchConfidence = "NO_MATCH";
    let matchedProfiles = [];
    const seenIds = new Set();

    const safeMobile = sale.customer_mobile ? sale.customer_mobile.trim() : "";
    const safeName = sale.customer_name ? sale.customer_name.trim() : "";

    // Step 1: Exact mobile match (highest confidence)
    if (safeMobile) {
      const mobileMatch = await customerRepo.getCustomerByMobileDB(safeMobile);
      if (mobileMatch) {
        matchConfidence = "EXACT_MOBILE";
        matchedProfiles.push({ ...mobileMatch, _matchType: "EXACT_MOBILE" });
        seenIds.add(mobileMatch.id);
      }
    }

    // Step 2: Exact name match
    if (safeName) {
      const nameMatches = await customerRepo.getCustomersByNameDB(safeName);
      if (nameMatches && nameMatches.length > 0) {
        for (const nm of nameMatches) {
          if (!seenIds.has(nm.id)) {
            matchedProfiles.push({ ...nm, _matchType: "EXACT_NAME" });
            seenIds.add(nm.id);
          }
        }
        if (matchConfidence === "NO_MATCH") {
          matchConfidence = nameMatches.length === 1 ? "EXACT_NAME" : "MULTIPLE_NAME_MATCHES";
        }
      }
    }

    // Step 3: Fuzzy/partial name match (if still no matches found)
    if (matchedProfiles.length === 0 && safeName) {
      const partialMatches = await customerRepo.searchCustomersByPartialNameDB(safeName);
      if (partialMatches && partialMatches.length > 0) {
        matchConfidence = "PARTIAL_NAME";
        for (const pm of partialMatches) {
          if (!seenIds.has(pm.id)) {
            matchedProfiles.push({ ...pm, _matchType: "PARTIAL_NAME" });
            seenIds.add(pm.id);
          }
        }
      }
    }
    
    results.push({
      ...sale,
      anomalyType,
      matchConfidence,
      matchedProfiles
    });
  }
  return toCamelCase(results);
};

export const resolveAnomaly = async (saleId, action, payload, user) => {
  if (user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  
  if (action === "CREATE_NEW" && (!payload.customerId || payload.customerId.length === 0)) {
    payload.customerId = uuidv4();
  }
  
  await repo.resolveAnomalyTx(saleId, action, payload);
  emitGlobalUpdate(["Sales", "Customers", "Inventory"]);
};

/**
 * Returns { productId: lastPrice } for the given customer.
 * Tier 1 lookup – O(1) from customer_item_prices cache table.
 */
export const getCustomerItemPrices = async (customerId) => {
  return await repo.getCustomerItemPricesDB(customerId);
};
