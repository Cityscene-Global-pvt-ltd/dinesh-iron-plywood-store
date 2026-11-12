import db from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const getAllSalesData = async (canShowAll) => {
  const [sales] = await db.query(
    `SELECT * FROM sales 
     WHERE ${canShowAll ? "1=1" : "sale_type = 'PAKKA'"} 
     ORDER BY sale_date DESC, created_at DESC`,
  );
  const [items] = await db.query(`SELECT * FROM sale_items ORDER BY item_index ASC`);
  const [payments] = await db.query(`SELECT * FROM sales_payments`);
  return { sales, items, payments };
};

export const getSaleByIdDB = async (id, canShowAll) => {
  const [sale] = await db.query(
    `SELECT * FROM sales 
   WHERE id = ? 
   AND (${canShowAll ? "1=1" : "sale_type = 'PAKKA'"})`,
    [id],
  );

  if (sale.length === 0) return null;

  const [items] = await db.query(`SELECT * FROM sale_items WHERE sale_id = ? ORDER BY item_index ASC`, [
    id,
  ]);
  const [payments] = await db.query(
    `SELECT * FROM sales_payments WHERE sale_id = ?`,
    [id],
  );
  return { ...sale[0], items, payments };
};

export const getPaymentByIdDB = async (paymentId) => {
  const [rows] = await db.query(`SELECT * FROM sales_payments WHERE id = ?`, [
    paymentId,
  ]);
  return rows.length > 0 ? rows[0] : null;
};

// ───────────────────────────────────────────────────────────────
// Price history helpers
// ───────────────────────────────────────────────────────────────

/**
 * Update customer_item_prices, product_last_prices and inventory.last_sold_price
 * inside an already-open transaction connection.
 */
export const updatePriceHistoryTx = async (connection, customerId, items, saleId, saleDate) => {
  if (!items || !items.length) return;
  for (const item of items) {
    const prodId = item.id || item.productId || item.product_id;
    const priceToRecord = Number(item.basePrice || item.base_price || item.price || 0);
    if (!prodId || priceToRecord <= 0) continue;

    // 1. Update global last price for the product
    await connection.query(
      `INSERT INTO product_last_prices (product_id, last_price, last_sale_id, last_sale_date, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         last_price = VALUES(last_price),
         last_sale_id = VALUES(last_sale_id),
         last_sale_date = VALUES(last_sale_date),
         updated_at = NOW()`,
      [prodId, priceToRecord, saleId, saleDate || new Date()],
    );

    // 2. Keep inventory.last_sold_price in sync (fast lookup)
    await connection.query(
      `UPDATE inventory SET last_sold_price = ? WHERE id = ?`,
      [priceToRecord, prodId],
    );

    // 3. Customer-specific price record
    if (customerId) {
      await connection.query(
        `INSERT INTO customer_item_prices (id, customer_id, product_id, last_price, last_sale_id, last_sale_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           last_price = VALUES(last_price),
           last_sale_id = VALUES(last_sale_id),
           last_sale_date = VALUES(last_sale_date),
           updated_at = NOW()`,
        [uuidv4(), customerId, prodId, priceToRecord, saleId, saleDate || new Date()],
      );
    }
  }
};

/**
 * Fetch { productId -> lastPrice } map for a given customer.
 * Returns an empty object when no history exists.
 */
export const getCustomerItemPricesDB = async (customerId) => {
  if (!customerId) return {};
  const [rows] = await db.query(
    `SELECT product_id, last_price FROM customer_item_prices WHERE customer_id = ?`,
    [customerId],
  );
  const priceMap = {};
  for (const row of rows) {
    priceMap[row.product_id] = Number(row.last_price);
  }
  return priceMap;
};

export const createSaleTx = async (saleData, itemsData) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const item of itemsData) {
      const [rows] = await connection.query(
        `SELECT available_stock FROM inventory WHERE id = ? FOR UPDATE`,
        [item.id],
      );
      if (!rows.length) throw new Error(`Product not found: ${item.name}`);
      // const currentStock = rows[0].available_stock;
      // if (item.qty > currentStock)
      //   throw new Error(
      //     `Insufficient stock for ${item.name}. Available: ${currentStock}`,
      //   );

      const stockQty = (item.selectedUnit && item.altUnitConversion && item.selectedUnit !== item.unit)
        ? Number(item.qty) * Number(item.altUnitConversion)
        : item.qty;

      await connection.query(
        `UPDATE inventory SET available_stock = available_stock - ?, updated_at = NOW() WHERE id = ?`,
        [stockQty, item.id],
      );
    }

    await connection.query(
      `INSERT INTO sales (
    id, invoice_number, customer_name, customer_email, customer_mobile, 
    customer_address, gst_number, sale_date, sale_type, gst_type, 
    subtotal, total_gst_amount, discount, total_amount, amount_paid, 
    balance, payment_status, created_by, reference_id,
    shipping_name, shipping_mobile, shipping_email, shipping_address, shipping_gst,
    po_number, po_date, vehicle_no, freight_charges, customer_id,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        saleData.id,
        saleData.invoiceNumber,
        saleData.customerName,
        saleData.customerEmail,
        saleData.customerMobile,
        saleData.customerAddress,
        saleData.gstNumber,
        saleData.saleDate,
        saleData.saleType,
        saleData.gstType,
        saleData.subtotal,
        saleData.totalGstAmount,
        saleData.discount,
        saleData.totalAmount,
        saleData.amountPaid,
        saleData.balance,
        saleData.paymentStatus,
        saleData.creator,
        saleData.referenceId,
        saleData.shippingName,
        saleData.shippingMobile,
        saleData.shippingEmail,
        saleData.shippingAddress,
        saleData.shippingGst,
        saleData.poNumber,
        saleData.poDate,
        saleData.vehicleNo,
        saleData.freightCharges,
        saleData.customerId || null,
      ],
    );

    const itemQueries = itemsData.map((item, index) => {
      return connection.query(
        `INSERT INTO sale_items (id, sale_id, product_id, name, hsn, qty, base_price, price, cgst, sgst, igst, gst_amount, price_after_gst, conversion_rate, item_disc_percent, unit, selected_unit, item_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.itemId,
          saleData.id,
          item.id,
          item.name,
          item.hsn,
          item.qty,
          item.basePrice,
          item.price,
          item.cgst,
          item.sgst,
          item.igst,
          item.gstAmount,
          item.priceAfterGst,
          item.conversionRate,
          item.itemDiscPercent,
          item.unit,
          item.selectedUnit,
          index,
        ],
      );
    });

    if (Number(saleData.amountPaid) > 0) {
      await connection.query(
        `INSERT INTO sales_payments (sale_id, payment_mode, reference_number, amount, payment_date) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          saleData.id,
          saleData.paymentMode || "CASH",
          saleData.referenceNumber || "INITIAL_PAYMENT",
          saleData.amountPaid,
          saleData.saleDate,
        ],
      );
    }

    if (Number(saleData.discount) > 0) {
      await connection.query(
        `INSERT INTO internal_ledgers (id, entity_type, entity_id, bill_id, amount, amount_paid, created_at, updated_at) 
         VALUES (?, 'CUSTOMER', ?, ?, ?, 0, NOW(), NOW())`,
        [uuidv4(), saleData.customerId || null, saleData.id, saleData.discount],
      );
    }

    if (saleData.referenceId && Number(saleData.earnedPoints) > 0) {
      await connection.query(
        "UPDATE `references` SET points = points + ?, updated_at = NOW() WHERE id = ?",
        [saleData.earnedPoints, saleData.referenceId],
      );
    }

    await Promise.all(itemQueries);

    // Update price history tables for all items
    await updatePriceHistoryTx(connection, saleData.customerId, itemsData, saleData.id, saleData.saleDate);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateSaleTx = async (id, data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [saleExists] = await connection.query(
      `SELECT id FROM sales WHERE id = ?`,
      [id],
    );
    if (saleExists.length === 0) throw new Error("SALE_NOT_FOUND");

    await connection.query(
      `UPDATE sales SET 
        customer_id = ?, customer_name = ?, customer_email = ?, customer_mobile = ?, customer_address = ?,
        gst_number = ?, shipping_name = ?, shipping_mobile = ?, shipping_email = ?,
        shipping_address = ?, shipping_gst = ?, po_number = ?, po_date = ?,
        vehicle_no = ?, invoice_number = ?,
        subtotal = ?, total_gst_amount = ?, freight_charges = ?, discount = ?,
        total_amount = ?, balance = ?, updated_at = NOW() 
      WHERE id = ?`,
      [
        data.customerId || null,
        data.customerName,
        data.customerEmail,
        data.customerMobile,
        data.customerAddress,
        data.gstNumber,
        data.shippingName,
        data.shippingMobile,
        data.shippingEmail,
        data.shippingAddress,
        data.shippingGst,
        data.poNumber,
        data.poDate,
        data.vehicleNo,
        data.billNo,
        data.subtotal,
        data.totalGstAmount,
        data.freightCharges,
        data.discount,
        data.totalAmount,
        data.balance,
        id,
      ],
    );

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.isNew) {
        await connection.query(
          `INSERT INTO sale_items (
            sale_id, id, product_id, name, hsn, qty, base_price,
            price, cgst, sgst, igst, gst_amount, price_after_gst, 
            conversion_rate, item_disc_percent, unit, selected_unit, item_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            uuidv4(),
            item.productId,
            item.name,
            item.hsn,
            item.qty,
            item.basePrice,
            item.price,
            item.cgst,
            item.sgst,
            item.igst,
            item.gstAmount,
            item.priceAfterGst,
            item.conversionRate,
            item.itemDiscPercent,
            item.unit,
            item.selectedUnit || item.unit,
            i,
          ],
        );

        const stockQty = (item.selectedUnit && item.altUnitConversion && item.selectedUnit !== item.unit)
          ? Number(item.qty) * Number(item.altUnitConversion)
          : item.qty;

        await connection.query(
          `UPDATE inventory SET available_stock = available_stock - ?, updated_at = NOW() WHERE id = ?`,
          [stockQty, item.productId],
        );
      }
    }

    // Update price history for new items being added
    const newItems = data.items.filter((i) => i.isNew);
    if (newItems.length > 0) {
      await updatePriceHistoryTx(connection, data.customerId, newItems.map(i => ({
        id: i.productId,
        basePrice: i.basePrice,
      })), id, data.saleDate);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const addPartialPaymentTx = async (id, data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [sale] = await connection.query(
      `SELECT amount_paid, balance FROM sales WHERE id = ?`,
      [id],
    );

    if (sale.length === 0) throw new Error("SALE_NOT_FOUND");

    const newAmount = Number(data.amount);
    const updatedAmountPaid = Number(sale[0].amount_paid) + newAmount;
    const updatedBalance = Number(sale[0].balance) - newAmount;

    let paymentStatus = "PARTIALLY_PAID";
    if (updatedBalance === 0) {
      paymentStatus = "PAID";
    }

    await connection.query(
      `UPDATE sales SET 
        amount_paid = ?, 
        balance = ?, 
        payment_status = ?, 
        updated_at = NOW() 
      WHERE id = ?`,
      [updatedAmountPaid, updatedBalance, paymentStatus, id],
    );

    await connection.query(
      `INSERT INTO sales_payments (sale_id, payment_mode, reference_number, amount, payment_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.paymentMode, data.referenceNumber, newAmount, data.paymentDate],
    );

    await connection.commit();
    return { updatedAmountPaid, updatedBalance, paymentStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deletePaymentTx = async (paymentId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [paymentRows] = await connection.query(
      `SELECT sale_id, amount FROM sales_payments WHERE id = ? FOR UPDATE`,
      [paymentId],
    );

    if (paymentRows.length === 0) throw new Error("PAYMENT_NOT_FOUND");

    const { sale_id, amount } = paymentRows[0];

    const [saleRows] = await connection.query(
      `SELECT total_amount, amount_paid, discount FROM sales WHERE id = ? FOR UPDATE`,
      [sale_id],
    );

    const updatedAmountPaid = Number(saleRows[0].amount_paid) - Number(amount);
    const updatedBalance =
      Number(saleRows[0].total_amount) -
      updatedAmountPaid -
      Number(saleRows[0].discount);

    let paymentStatus = "PARTIALLY_PAID";
    if (updatedAmountPaid <= 0) {
      paymentStatus = "PENDING";
    } else if (updatedBalance <= 0) {
      paymentStatus = "PAID";
    }

    await connection.query(
      `UPDATE sales SET 
        amount_paid = ?, 
        balance = ?, 
        payment_status = ?, 
        updated_at = NOW() 
      WHERE id = ?`,
      [updatedAmountPaid, updatedBalance, paymentStatus, sale_id],
    );

    await connection.query(`DELETE FROM sales_payments WHERE id = ?`, [
      paymentId,
    ]);

    await connection.commit();
    return { sale_id, updatedBalance };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteSaleTx = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [itemsToRestore] = await connection.query(
      `SELECT si.product_id, si.qty as sold_qty, si.selected_unit, si.unit,
        i.alt_unit_conversion,
        COALESCE(SUM(ri.return_qty), 0) as total_returned 
      FROM sale_items si 
      LEFT JOIN inventory i ON si.product_id = i.id
      LEFT JOIN returns r ON si.sale_id = r.original_sale_id 
      LEFT JOIN return_items ri ON r.id = ri.return_id AND si.product_id = ri.product_id 
      WHERE si.sale_id = ? 
      GROUP BY si.product_id, si.qty, si.selected_unit, si.unit, i.alt_unit_conversion`,
      [id],
    );

    for (const item of itemsToRestore) {
      const selectedUnit = item.selected_unit;
      const unit = item.unit;
      const altConversion = item.alt_unit_conversion;
      const soldQty = Number(item.sold_qty);
      const totalReturned = Number(item.total_returned);
      const netToRestore = (selectedUnit && altConversion && selectedUnit !== unit)
        ? (soldQty - totalReturned) * Number(altConversion)
        : (soldQty - totalReturned);
      if (netToRestore > 0) {
        await connection.query(
          `UPDATE inventory SET available_stock = available_stock + ? WHERE id = ?`,
          [netToRestore, item.product_id],
        );
      }
    }

    const [ledgerEntries] = await connection.query(
      `SELECT id FROM internal_ledgers WHERE bill_id = ? AND entity_type = 'CUSTOMER'`,
      [id],
    );

    if (ledgerEntries.length > 0) {
      const ledgerIds = ledgerEntries.map((l) => l.id);
      await connection.query(
        `DELETE FROM internal_payments WHERE ledger_id IN (?)`,
        [ledgerIds],
      );
      await connection.query(`DELETE FROM internal_ledgers WHERE id IN (?)`, [
        ledgerIds,
      ]);
    }

    await connection.query(
      `DELETE ri FROM return_items ri JOIN returns r ON ri.return_id = r.id WHERE r.original_sale_id = ?`,
      [id],
    );
    await connection.query(`DELETE FROM returns WHERE original_sale_id = ?`, [
      id,
    ]);
    await connection.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);
    await connection.query(`DELETE FROM sales_payments WHERE sale_id = ?`, [
      id,
    ]);
    const [result] = await connection.query(`DELETE FROM sales WHERE id = ?`, [
      id,
    ]);

    if (result.affectedRows === 0) throw new Error("SALE_NOT_FOUND");

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const createReturnTx = async (returnData, returnItemsData) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Lock the original sale to prevent concurrent return processing
    const [saleLocks] = await connection.query(
      `SELECT id FROM sales WHERE id = ? FOR UPDATE`,
      [returnData.original_sale_id]
    );
    if (!saleLocks.length) throw new Error("Original sale not found");

    // Validate return quantities
    for (const item of returnItemsData) {
      const [soldItems] = await connection.query(
        `SELECT COALESCE(SUM(qty), 0) as total_sold FROM sale_items WHERE sale_id = ? AND product_id = ?`,
        [returnData.original_sale_id, item.product_id]
      );
      const soldQty = Number(soldItems[0].total_sold);

      const [returnedItems] = await connection.query(
        `SELECT COALESCE(SUM(ri.return_qty), 0) as total_returned 
         FROM return_items ri 
         JOIN returns r ON ri.return_id = r.id 
         WHERE r.original_sale_id = ? AND ri.product_id = ?`,
        [returnData.original_sale_id, item.product_id]
      );
      const alreadyReturnedQty = Number(returnedItems[0].total_returned);
      const returningQty = Number(item.return_qty);

      if (alreadyReturnedQty + returningQty > soldQty) {
        throw new Error(`Cannot return ${returningQty} of ${item.name}. Only ${soldQty - alreadyReturnedQty} available to return.`);
      }
    }

    for (const item of returnItemsData) {
      let [rows] = await connection.query(
        `SELECT available_stock FROM inventory WHERE id = ? FOR UPDATE`,
        [item.product_id],
      );
      
      if (!rows.length) {
        const [fallbackRows] = await connection.query(
          `SELECT id, available_stock FROM inventory WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1 FOR UPDATE`,
          [item.name],
        );
        
        if (!fallbackRows.length) {
          if (!returnData.force_recreate_missing) {
            const error = new Error("PRODUCT_MISSING_CONFIRMATION_REQUIRED");
            error.missingItemName = item.name;
            throw error;
          }

          const newProductId = item.product_id || uuidv4();
          
          await connection.query(
            `INSERT INTO inventory (
              id, hsn, name, category, type, inventory_type, 
              size, color, unit, available_stock, buying_price, 
              selling_price, conversion_rate, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              newProductId,
              item.hsn || null,
              item.name,
              "General",
              "Standard",
              returnData.sale_type || "PAKKA",
              "",
              "",
              item.unit || "Nos",
              item.return_qty,
              item.base_price || 0,
              item.price_after_gst || item.price || 0,
              item.conversion_rate || 1,
              returnData.creator || "SYSTEM"
            ]
          );
          
          item.product_id = newProductId;
          continue;
        }
        
        item.product_id = fallbackRows[0].id;
      }

      const stockQty = (item.selected_unit && item.alt_unit_conversion && item.selected_unit !== item.unit)
        ? Number(item.return_qty) * Number(item.alt_unit_conversion)
        : item.return_qty;

      await connection.query(
        `UPDATE inventory SET available_stock = available_stock + ?, updated_at = NOW() WHERE id = ?`,
        [stockQty, item.product_id],
      );
    }

    const originalDiscount = Number(returnData.original_discount || 0);
    const returnAmount = Number(returnData.total_amount || 0);
    const originalSaleTotal = Number(returnData.original_sale_total || 0);
    const discountPercent = originalDiscount / originalSaleTotal;
    const discountApplied = returnAmount * discountPercent;
    const netBalance = returnAmount - discountApplied;

    await connection.query(
      `INSERT INTO returns (
    id, return_number, original_sale_id, customer_name, customer_email, 
    customer_mobile, customer_address, gst_number, sale_date, return_date, 
    remarks, sale_type, gst_type, subtotal, total_gst_amount, 
    total_amount, created_by, discount_applied, net_refund,
    shipping_name, shipping_mobile, shipping_email, shipping_address, shipping_gst,
    po_number, po_date, vehicle_no,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        returnData.id,
        returnData.return_number,
        returnData.original_sale_id,
        returnData.customer_name,
        returnData.customer_email,
        returnData.customer_mobile,
        returnData.customer_address,
        returnData.gst_number,
        returnData.sale_date,
        returnData.return_date,
        returnData.remarks,
        returnData.sale_type,
        returnData.gst_type,
        returnData.subtotal,
        returnData.total_gst_amount,
        returnData.total_amount,
        returnData.creator,
        discountApplied,
        netBalance,
        returnData.shipping_name,
        returnData.shipping_mobile,
        returnData.shipping_email,
        returnData.shipping_address,
        returnData.shipping_gst,
        returnData.po_number,
        returnData.po_date,
        returnData.vehicle_no,
      ],
    );

    await connection.query(
      `UPDATE sales SET balance = balance - ?, updated_at = NOW() WHERE id = ?`,
      [netBalance, returnData.original_sale_id],
    );

    const itemQueries = returnItemsData.map((item, index) => {
      return connection.query(
        `INSERT INTO return_items (id, return_id, product_id, name, hsn, sold_qty, return_qty, base_price, price, cgst, sgst, igst, gst_amount, price_after_gst, conversion_rate, item_disc_percent, unit, selected_unit, item_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.itemId,
          returnData.id,
          item.product_id,
          item.name,
          item.hsn,
          item.sold_qty,
          item.return_qty,
          item.base_price,
          item.price,
          item.cgst,
          item.sgst,
          item.igst,
          item.gst_amount,
          item.price_after_gst,
          item.conversion_rate,
          item.item_disc_percent,
          item.unit,
          item.selected_unit,
          index,
        ],
      );
    });

    await Promise.all(itemQueries);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getAllReturnsData = async (canShowAll) => {
  const [returns] = await db.query(
    `SELECT * FROM returns 
   WHERE ${canShowAll ? "1=1" : "sale_type = 'PAKKA'"} 
   ORDER BY return_date DESC, created_at DESC`,
  );
  const [items] = await db.query(`SELECT * FROM return_items ORDER BY item_index ASC`);
  return { returns, items };
};

export const deleteReturnTx = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [returnRows] = await connection.query(
      `SELECT original_sale_id, net_refund FROM returns WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (returnRows.length === 0) {
      throw new Error(`Return record not found with id ${id}`);
    }

    const { original_sale_id, net_refund } = returnRows[0];

    const [items] = await connection.query(
      `SELECT ri.product_id, ri.return_qty, ri.selected_unit, ri.unit, i.alt_unit_conversion 
       FROM return_items ri 
       LEFT JOIN inventory i ON ri.product_id = i.id 
       WHERE ri.return_id = ?`,
      [id]
    );

    for (const item of items) {
      const stockQty = (item.selected_unit && item.alt_unit_conversion && item.selected_unit !== item.unit)
        ? Number(item.return_qty) * Number(item.alt_unit_conversion)
        : item.return_qty;

      await connection.query(
        `UPDATE inventory SET available_stock = available_stock - ?, updated_at = NOW() WHERE id = ?`,
        [stockQty, item.product_id]
      );
    }

    await connection.query(
      `UPDATE sales SET balance = balance + ?, updated_at = NOW() WHERE id = ?`,
      [net_refund, original_sale_id]
    );

    await connection.query(`DELETE FROM return_items WHERE return_id = ?`, [id]);
    await connection.query(`DELETE FROM returns WHERE id = ?`, [id]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getAnomaliesDB = async () => {
  const [brokenSales] = await db.query(`
    SELECT 
      s.id as sale_id, 
      s.invoice_number, 
      s.customer_name, 
      s.customer_mobile, 
      s.sale_date, 
      s.total_amount, 
      s.balance,
      s.customer_id,
      s.sale_type
    FROM sales s
    WHERE s.customer_id IS NULL 
       OR s.customer_id = ''
       OR s.customer_id NOT IN (SELECT id FROM customers)
  `);
  return brokenSales;
};

export const resolveAnomalyTx = async (saleId, action, payload) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [saleExists] = await connection.query(
      `SELECT * FROM sales WHERE id = ? FOR UPDATE`,
      [saleId],
    );
    if (saleExists.length === 0) throw new Error("SALE_NOT_FOUND");
    const sale = saleExists[0];

    if (action === "LINK_EXISTING") {
      const { customerId, customerName, customerMobile } = payload;
      await connection.query(
        `UPDATE sales SET customer_id = ?, customer_name = COALESCE(?, customer_name), customer_mobile = COALESCE(?, customer_mobile) WHERE id = ?`,
        [customerId, customerName || null, customerMobile || null, saleId]
      );
    } else if (action === "CREATE_NEW") {
      const { customerId, name, mobile, email, address, gstNumber } = payload;
      await connection.query(
        `INSERT INTO customers (id, name, mobile, email, address, gstNumber, opening_balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [customerId, name, mobile, email || null, address || null, gstNumber || null]
      );
      await connection.query(
        `UPDATE sales SET customer_id = ?, customer_name = ?, customer_mobile = ? WHERE id = ?`,
        [customerId, name, mobile, saleId]
      );
    } else if (action === "DELETE") {
      // Restore inventory
      const [itemsToRestore] = await connection.query(
        `SELECT product_id, qty FROM sale_items WHERE sale_id = ?`,
        [saleId],
      );
      for (const item of itemsToRestore) {
        await connection.query(
          `UPDATE inventory SET available_stock = available_stock + ? WHERE id = ?`,
          [item.qty, item.product_id],
        );
      }
      await connection.query(`DELETE FROM sale_items WHERE sale_id = ?`, [saleId]);
      await connection.query(`DELETE FROM sales_payments WHERE sale_id = ?`, [saleId]);
      await connection.query(`DELETE FROM sales WHERE id = ?`, [saleId]);
    } else {
      throw new Error("INVALID_ACTION");
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
