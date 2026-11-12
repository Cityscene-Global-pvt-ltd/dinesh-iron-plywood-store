import db from "../config/db.js";

export const fetchAllProductsDB = async (canShowAll) => {
  const [products] = await db.query(`
    SELECT 
      id, hsn, name, category, type, unit, alt_unit, alt_unit_conversion, inventory_type, 
      size, color, available_stock, buying_price, 
      selling_price, last_sold_price, conversion_rate, created_by, created_at, updated_at 
    FROM inventory 
    WHERE ${canShowAll ? "1=1" : "inventory_type = 'PAKKA'"}
    ORDER BY created_at DESC
  `);
  return products;
};

export const getProductByIdDB = async (id, canShowAll) => {
  const query = `
    SELECT * FROM inventory 
    WHERE id = ? 
    AND (${canShowAll ? "1=1" : "inventory_type = 'PAKKA'"})
  `;
  const [rows] = await db.query(query, [id]);
  return rows[0];
};

export const insertProductDB = async (data) => {
  const checkQuery = `
    SELECT id FROM inventory 
    WHERE name = ? AND hsn = ? AND category = ? AND type = ? 
    AND inventory_type = ? AND size = ? AND color = ? AND unit = ?
    LIMIT 1
  `;

  const [existingItems] = await db.query(checkQuery, [
    data.name,
    data.hsn,
    data.category,
    data.type,
    data.inventoryType,
    data.size,
    data.color,
    data.unit,
  ]);

  if (existingItems.length > 0) {
    throw new Error("item already exist with these details");
  }

  const query = `
    INSERT INTO inventory (
      id, hsn, name, category, type, inventory_type, 
      size, color, unit, alt_unit, alt_unit_conversion, available_stock, buying_price, 
      selling_price, conversion_rate, created_by, created_at, updated_at
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  await db.query(query, [
    data.id,
    data.hsn,
    data.name,
    data.category,
    data.type,
    data.inventoryType,
    data.size,
    data.color,
    data.unit,
    data.altUnit,
    data.altUnitConversion,
    data.availableStock,
    data.buyingPrice,
    data.sellingPrice,
    data.conversionRate,
    data.creator,
  ]);
};

export const updateProductDB = async (id, data) => {
  const query = `
    UPDATE inventory 
    SET 
      hsn = ?, name = ?, category = ?, type = ?, 
      inventory_type = ?, size = ?, color = ?, unit = ?, 
      alt_unit = ?, alt_unit_conversion = ?,
      available_stock = ?, buying_price = ?, 
      selling_price = ?, conversion_rate = ?, updated_at = NOW()
    WHERE id = ?
  `;
  const [result] = await db.query(query, [
    data.hsn,
    data.name,
    data.category,
    data.type,
    data.inventoryType,
    data.size,
    data.color,
    data.unit,
    data.altUnit,
    data.altUnitConversion,
    data.availableStock,
    data.buyingPrice,
    data.sellingPrice,
    data.conversionRate,
    id,
  ]);
  return result.affectedRows;
};

export const deleteProductDB = async (id) => {
  const [result] = await db.query("DELETE FROM inventory WHERE id = ?", [id]);
  return result.affectedRows;
};

export const checkLowStockThresholdsDB = async (productIds, canShowAll) => {
  if (!productIds) return [];

  const idsArray = Array.isArray(productIds) ? productIds : [productIds];

  if (idsArray.length === 0) return [];

  const [settingRows] = await db.query(
    "SELECT `value` FROM settings WHERE `key` = 'min_threshold'",
  );

  const thresholdValue =
    settingRows.length > 0 ? parseInt(settingRows[0].value, 10) : 5;

  const placeholders = idsArray.map(() => "?").join(",");

  const query = `
    SELECT id AS product_id, name AS product_name, available_stock AS current_stock, ? AS threshold_value
    FROM inventory 
    WHERE id IN (${placeholders}) 
    AND available_stock <= ?
    AND (${canShowAll ? "1=1" : "inventory_type = 'PAKKA'"})
  `;
  const params = [thresholdValue, ...idsArray, thresholdValue];
  const [rows] = await db.query(query, params);

  return rows;
};

export const bulkInsertInventoryDB = async (dataArray) => {
  const query = `
    INSERT INTO inventory 
    (id, hsn, name, category, type, inventory_type, unit, size, color, available_stock, buying_price, selling_price, conversion_rate, created_by, alt_unit, alt_unit_conversion) 
    VALUES ?
  `;

  try {
    const [result] = await db.query(query, [dataArray]);
    return result.affectedRows;
  } catch (error) {
    console.error("Database Bulk Insert Error:", error);
    throw new Error("DB_INSERT_FAILED");
  }
};
