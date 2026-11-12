import db from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const getSuppliersData = async (canShowAll) => {
  const [suppliers] = await db.query(
    `SELECT * FROM suppliers ORDER BY created_at DESC`,
  );

  const [orders] = await db.query(
    `SELECT * FROM supplier_orders 
     WHERE ${canShowAll ? "1=1" : "order_type = 'PAKKA'"} 
     ORDER BY created_at DESC`,
  );

  const [orderItems] = await db.query(`SELECT * FROM supplier_order_items`);

  const [bills] = await db.query(
    `SELECT sb.* FROM supplier_bills sb
     LEFT JOIN supplier_orders so ON sb.po_id = so.id
     WHERE ${canShowAll ? "1=1" : "(so.order_type = 'PAKKA' OR sb.po_id IS NULL)"}
     ORDER BY sb.bill_date DESC`,
  );

  const [billItems] = await db.query(`SELECT * FROM supplier_bill_items`);

  const [payments] = await db.query(
    `SELECT * FROM supplier_payments ORDER BY payment_date DESC`,
  );

  return {
    suppliers: suppliers || [],
    orders: orders || [],
    orderItems: orderItems || [],
    bills: bills || [],
    billItems: billItems || [],
    payments: payments || [],
  };
};

export const getSupplierByIdDB = async (id) => {
  const [rows] = await db.query(`SELECT * FROM suppliers WHERE id = ?`, [id]);

  return rows[0] || null;
};

export const getSupplierOrderByIdDB = async (orderId) => {
  const connection = await db.getConnection();

  try {
    const [orders] = await connection.query(
      `SELECT * FROM supplier_orders WHERE id = ?`,
      [orderId],
    );

    if (!orders || orders.length === 0) return null;

    const order = orders[0];

    const [items] = await connection.query(
      `SELECT * FROM supplier_order_items WHERE order_id = ?`,
      [orderId],
    );

    order.items = items || [];

    return order;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

export const insertSupplier = async (data) => {
  const query = `INSERT INTO suppliers (id, name, email, mobile, address, opening_balance, gstNumber, pan, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
  await db.query(query, [
    data.id,
    data.name,
    data.email,
    data.mobile,
    data.address,
    data.openingBalance,
    data.gstNumber,
    data.pan,
    data.creator,
  ]);
};

export const updateSupplierInDB = async (id, data) => {
  const query = `UPDATE suppliers SET name = ?, email = ?, mobile = ?, address = ?, opening_balance = ?, gstNumber = ?, pan = ?, updated_at = NOW() WHERE id = ?`;
  const [result] = await db.query(query, [
    data.name,
    data.email,
    data.mobile,
    data.address,
    data.openingBalance,
    data.gstNumber,
    data.pan,
    id,
  ]);
  return result.affectedRows;
};

export const deleteSupplierFromDB = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [ledgerEntries] = await connection.query(
      "SELECT id FROM internal_ledgers WHERE entity_id = ? AND entity_type = 'SUPPLIER'",
      [id],
    );

    if (ledgerEntries.length > 0) {
      const ledgerIds = ledgerEntries.map((l) => l.id);

      await connection.query(
        "DELETE FROM internal_payments WHERE ledger_id IN (?)",
        [ledgerIds],
      );

      await connection.query("DELETE FROM internal_ledgers WHERE id IN (?)", [
        ledgerIds,
      ]);
    }

    await connection.query(
      "DELETE FROM supplier_payments WHERE supplier_id = ?",
      [id],
    );

    await connection.query(
      "DELETE FROM supplier_bill_items WHERE bill_id IN (SELECT id FROM supplier_bills WHERE supplier_id = ?)",
      [id],
    );

    await connection.query("DELETE FROM supplier_bills WHERE supplier_id = ?", [
      id,
    ]);

    await connection.query(
      "DELETE FROM supplier_order_items WHERE order_id IN (SELECT id FROM supplier_orders WHERE supplier_id = ?)",
      [id],
    );

    await connection.query(
      "DELETE FROM supplier_orders WHERE supplier_id = ?",
      [id],
    );

    const [result] = await connection.query(
      "DELETE FROM suppliers WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      throw new Error("SUPPLIER_NOT_FOUND");
    }

    await connection.commit();
    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const insertSupplierOrderTx = async (data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO supplier_orders (
        id, supplier_id, order_number, order_date, order_type,
        billing_name, billing_email, billing_mobile, billing_address, billing_gst,
        shipping_name, shipping_email, shipping_mobile, shipping_address, shipping_gst,
        gst_type, subtotal, total_gst_amount, total_amount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.supplierId,
        data.orderNumber,
        data.orderDate,
        data.orderType,
        data.billingName,
        data.billingEmail,
        data.billingMobile,
        data.billingAddress,
        data.billingGst,
        data.shippingName,
        data.shippingEmail,
        data.shippingMobile,
        data.shippingAddress,
        data.shippingGst,
        data.gstType,
        data.subtotal,
        data.totalGstAmount,
        data.totalAmount,
        data.created_by,
      ],
    );

    if (data.items && data.items.length > 0) {
      const itemQueries = data.items.map((item) => {
        return connection.query(
          `INSERT INTO supplier_order_items (
            id, order_id, productId, hsn, name, qty, price, disc_percent, 
            cgst, sgst, igst, gst_amount, price_after_gst, base_price, conversion_rate, size, unit, selected_unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id || uuidv4(),
            data.id,
            item.productId || null,
            item.hsn,
            item.name,
            item.qty,
            item.price,
            item.discPercent,
            item.cgst,
            item.sgst,
            item.igst,
            item.gstAmount,
            item.priceAfterGst,
            item.basePrice,
            item.conversionRate,
            item.size,
            item.unit,
            item.selectedUnit || item.unit,
          ],
        );
      });
      await Promise.all(itemQueries);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateSupplierOrderTx = async (orderId, data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE supplier_orders SET 
        supplier_id = ?, order_number = ?, order_date = ?, 
        billing_name = ?, billing_email = ?, billing_mobile = ?, billing_address = ?, billing_gst = ?,
        shipping_name = ?, shipping_email = ?, shipping_mobile = ?, shipping_address = ?, shipping_gst = ?,
        gst_type = ?, subtotal = ?, total_gst_amount = ?, total_amount = ?
       WHERE id = ?`,
      [
        data.supplierId,
        data.orderNumber,
        data.orderDate,
        data.billingName,
        data.billingEmail,
        data.billingMobile,
        data.billingAddress,
        data.billingGst,
        data.shippingName,
        data.shippingEmail,
        data.shippingMobile,
        data.shippingAddress,
        data.shippingGst,
        data.gstType,
        data.subtotal,
        data.totalGstAmount,
        data.totalAmount,
        orderId,
      ],
    );

    await connection.query(
      `DELETE FROM supplier_order_items WHERE order_id = ?`,
      [orderId],
    );

    if (data.items && data.items.length > 0) {
      const itemQueries = data.items.map((item) => {
        return connection.query(
          `INSERT INTO supplier_order_items (
            id, order_id, productId, hsn, name, qty, price, disc_percent, 
            cgst, sgst, igst, gst_amount, price_after_gst, base_price, conversion_rate, size, unit, selected_unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id || uuidv4(),
            orderId,
            item.productId || null,
            item.hsn,
            item.name,
            item.qty,
            item.price,
            item.discPercent,
            item.cgst,
            item.sgst,
            item.igst,
            item.gstAmount,
            item.priceAfterGst,
            item.basePrice,
            item.conversionRate,
            item.size,
            item.unit,
            item.selectedUnit || item.unit,
          ],
        );
      });
      await Promise.all(itemQueries);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteSupplierOrderTx = async (orderId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM supplier_order_items WHERE order_id = ?`,
      [orderId],
    );

    await connection.query(`DELETE FROM supplier_orders WHERE id = ?`, [
      orderId,
    ]);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const insertSupplierBillTx = async (
  billData,
  items,
  paymentData,
  inventoryType,
) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO supplier_bills (
        id, supplier_id, po_id, po_number, po_date, bill_number, bill_date, 
        vehicle_number, subtotal, total_gst_amount, freight_charges, 
        total_amount, amount_paid, balance_amount, discount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billData.id,
        billData.supplierId,
        billData.purchaseOrderId,
        billData.poNumber,
        billData.poDate,
        billData.billNumber,
        billData.billDate,
        billData.vehicleNumber,
        billData.subtotal,
        billData.totalGst,
        billData.freight,
        billData.totalAmount,
        billData.amountPaid,
        billData.balance,
        billData.discount,
        billData.created_by,
      ],
    );

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.query(
          `INSERT INTO supplier_bill_items (
            id, bill_id, product_id, hsn, name, ordered_qty, received_qty, 
            price, disc_percent, cgst, sgst, igst, taxable_value, price_after_gst, base_price, conversion_rate, unit, size, selected_unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            billData.id,
            item.productId,
            item.hsn,
            item.name,
            item.qty,
            item.receivedQty,
            item.price,
            item.discPercent,
            item.cgst,
            item.sgst,
            item.igst,
            item.taxableValue,
            item.priceAfterGst,
            item.basePrice,
            item.conversionRate,
            item.unit,
            item.size,
            item.selectedUnit || item.unit,
          ],
        );

        const newBuyingPrice = Number(item.buyingPrice) || 0;
        const newSellingPrice = Number(item.sellingPrice) || 0;

        if (item.productId) {
          const [inv] = await connection.query(
            `SELECT buying_price, selling_price FROM inventory WHERE id = ?`,
            [item.productId],
          );

          const currentBuyingPrice = Number(inv[0]?.buying_price) || 0;
          const currentSellingPrice = Number(inv[0]?.selling_price) || 0;

          const finalAverageBuyingPrice =
            currentBuyingPrice > 0
              ? (currentBuyingPrice + newBuyingPrice) / 2
              : newBuyingPrice;

          const stockQty = (item.selectedUnit && item.altUnitConversion && item.selectedUnit !== item.unit)
            ? Number(item.receivedQty) * Number(item.altUnitConversion)
            : item.receivedQty;

          await connection.query(
            `UPDATE inventory SET available_stock = available_stock + ?, buying_price = ?, selling_price = ?, hsn = ? WHERE id = ?`,
            [
              stockQty,
              finalAverageBuyingPrice.toFixed(2),
              newSellingPrice
                ? newSellingPrice.toFixed(2)
                : currentSellingPrice.toFixed(2),
              item.hsn,
              item.productId,
            ],
          );
        } else {
          await connection.query(
            `INSERT INTO inventory (
                id, hsn, name, available_stock, inventory_type, unit, size, conversion_rate, buying_price, selling_price, created_by, alt_unit, alt_unit_conversion
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              item.hsn,
              item.name,
              item.receivedQty,
              inventoryType,
              item.unit,
              item.size,
              item.conversionRate,
              newBuyingPrice.toFixed(2),
              newSellingPrice.toFixed(2),
              billData.created_by,
              item.altUnit || null,
              item.altUnitConversion || null,
            ],
          );
        }
      }
    }

    if (Number(paymentData.amount) > 0) {
      await connection.query(
        `INSERT INTO supplier_payments (
          id, supplier_id, bill_id, amount, method, payment_date, reference_number, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          billData.supplierId,
          billData.id,
          paymentData.amount,
          paymentData.method,
          billData.billDate,
          paymentData.reference,
          billData.created_by,
        ],
      );
    }
    if (Number(billData.discount) > 0) {
      await connection.query(
        `INSERT INTO internal_ledgers (
          id, entity_type, entity_id, bill_id, amount, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          "SUPPLIER",
          billData.supplierId,
          billData.id,
          billData.discount,
          billData.created_by,
        ],
      );
    }

    if (billData.purchaseOrderId) {
      await connection.query(
        `UPDATE supplier_orders SET is_billed = 1 WHERE id = ?`,
        [billData.purchaseOrderId],
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const addBillPaymentTx = async (data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO supplier_payments 
      (id, bill_id, supplier_id, amount, method, payment_date, reference_number, created_by, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data.paymentId,
        data.billId,
        data.supplierId,
        data.amount,
        data.method,
        data.paymentDate,
        data.referenceNumber,
        data.remarks,
        data.creator,
      ],
    );

    await connection.query(
      `UPDATE supplier_bills 
       SET amount_paid = amount_paid + ?, 
           balance_amount = balance_amount - ? 
       WHERE id = ?`,
      [data.amount, data.amount, data.billId],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteBillPaymentTx = async (id, billId, amount) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM supplier_payments WHERE id = ?`, [id]);

    await connection.query(
      `UPDATE supplier_bills 
       SET amount_paid = amount_paid - ?, 
           balance_amount = balance_amount + ? 
       WHERE id = ?`,
      [amount, amount, billId],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPaymentByIdDB = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM supplier_payments WHERE id = ?`,
    [id],
  );
  return rows[0];
};
