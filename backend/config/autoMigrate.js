import db from "./db.js";

export const runAutoMigrations = async () => {
  try {
    // 1. Ensure min_stock_threshold column exists in inventory table
    const [invCols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'min_stock_threshold'`
    );
    if (invCols.length === 0) {
      console.log("[Migration] Adding min_stock_threshold to inventory table...");
      await db.query(
        `ALTER TABLE inventory ADD COLUMN min_stock_threshold INT DEFAULT NULL AFTER available_stock`
      );
      console.log("[Migration] Added min_stock_threshold to inventory table.");
    }

    // 2. Ensure transport columns exist in supplier_orders table
    const [soCols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_orders' AND COLUMN_NAME = 'transport_name'`
    );
    if (soCols.length === 0) {
      console.log("[Migration] Adding transport columns to supplier_orders table...");
      await db.query(`
        ALTER TABLE supplier_orders 
          ADD COLUMN transport_name VARCHAR(100) DEFAULT NULL AFTER order_type,
          ADD COLUMN transport_contact VARCHAR(20) DEFAULT NULL AFTER transport_name,
          ADD COLUMN lr_number VARCHAR(50) DEFAULT NULL AFTER transport_contact,
          ADD COLUMN transport_mode ENUM('ROAD','RAIL','AIR','SEA','COURIER') DEFAULT 'ROAD' AFTER lr_number,
          ADD COLUMN expected_delivery_date DATE DEFAULT NULL AFTER transport_mode,
          ADD COLUMN freight_amount DECIMAL(10,2) DEFAULT 0.00 AFTER expected_delivery_date,
          ADD COLUMN transport_notes TEXT DEFAULT NULL AFTER freight_amount
      `);
      console.log("[Migration] Added transport columns to supplier_orders table.");
    }

    // 3. Ensure reference_redemptions table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS reference_redemptions (
        id VARCHAR(50) PRIMARY KEY,
        reference_id VARCHAR(36) NOT NULL,
        points_redeemed INT NOT NULL,
        redemption_type ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'DISCOUNT_VOUCHER', 'GIFT') DEFAULT 'CASH',
        amount DECIMAL(12,2) DEFAULT 0.00,
        remarks TEXT,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ref_id (reference_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Ensure alt_unit and alt_unit_conversion exist in inventory table
    const [altCols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'alt_unit'`
    );
    if (altCols.length === 0) {
      console.log("[Migration] Adding alt_unit columns to inventory table...");
      await db.query(`
        ALTER TABLE inventory 
          ADD COLUMN alt_unit VARCHAR(50) DEFAULT NULL AFTER unit,
          ADD COLUMN alt_unit_conversion DECIMAL(15,4) DEFAULT NULL AFTER alt_unit
      `);
      console.log("[Migration] Added alt_unit columns to inventory table.");
    }

    // 5. Ensure company_details row exists
    const [companyRows] = await db.query(`SELECT id FROM company_details WHERE id = 1`);
    if (companyRows.length === 0) {
      console.log("[Migration] Inserting default company_details row...");
      await db.query(`
        INSERT INTO company_details (id, name, email, mobile, address, logo_url, gst_number, pan_number)
        VALUES (1, 'Dinesh Iron Plywood Store', '', '', '', '', '', '')
        ON DUPLICATE KEY UPDATE id=1
      `);
      console.log("[Migration] Default company_details row ensured.");
    }

    console.log("[Migration] All schema checks completed successfully.");
  } catch (error) {
    console.error("[Migration] Schema migration check error:", error.message);
  }
};
