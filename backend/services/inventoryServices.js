import path from "path";
import xlsx from "xlsx";
import { v4 as uuidv4 } from "uuid";
import * as repo from "../repositories/inventoryRepo.js";
import { sanitizeResponse, toCamelCase } from "../utils/formatter.js";
import {
  processNewNotification,
  removeRelatedNotifications,
} from "../services/notificationServices.js";
import { emitGlobalUpdate } from "../socket.js";

export const getFormattedProducts = async (user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const products = await repo.fetchAllProductsDB(canShowAll);

  const camelData = toCamelCase(products);

  return sanitizeResponse(camelData, canShowAll);
};

export const createNewProduct = async (data, creator, user) => {
  const isSuperAdminAction = user.role === "SUPER_ADMIN";
  const id = uuidv4();

  const formattedData = {
    id,
    hsn: data.hsn.trim().toUpperCase(),
    name: data.name.toLowerCase().trim(),
    category: data.category || null,
    type: data.type || null,
    inventoryType: data.inventoryType,
    size: data.size || null,
    color: data.color || null,
    unit: data.unit || null,
    altUnit: data.altUnit || null,
    altUnitConversion: data.altUnitConversion || null,
    availableStock: data.availableStock || 0,
    buyingPrice: data.buyingPrice || 0,
    sellingPrice: data.sellingPrice || 0,
    conversionRate: data.conversionRate || 1,
    creator,
  };

  await repo.insertProductDB(formattedData);

  emitGlobalUpdate(["Inventory"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

  if (!isSuperAdminAction && data.inventoryType === "PAKKA") {
    targets.push(
      { target_type: "ROLE", target_value: "ADMIN" },
      { target_type: "ROLE", target_value: "INVENTORY_MANAGER" },
    );
  }

  await processNewNotification(
    {
      type: "NEW_PRODUCT",
      title: "New Product Added",
      message: `Product '${formattedData.name}' (${formattedData.hsn}) added by ${user.name} (${user.role}). Opening Stock: ${formattedData.availableStock} ${formattedData.unit || ""}.`,
      reference_module: "inventory",
      reference_id: id,
    },
    targets,
  );

  return id;
};

export const modifyProduct = async (id, data, user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const oldData = await repo.getProductByIdDB(id, canShowAll);
  const oldProduct = toCamelCase(oldData);
  if (!oldProduct) throw new Error("PRODUCT_NOT_FOUND");

  const formattedData = {
    hsn: data.hsn.trim().toUpperCase(),
    name: data.name.toLowerCase().trim(),
    category: data.category || null,
    type: data.type || null,
    inventoryType: data.inventoryType,
    size: data.size || null,
    color: data.color || null,
    unit: data.unit || null,
    altUnit: data.altUnit || null,
    altUnitConversion: data.altUnitConversion || null,
    availableStock: data.availableStock || 0,
    buyingPrice: data.buyingPrice || 0,
    sellingPrice: data.sellingPrice || 0,
    conversionRate: data.conversionRate || 1,
  };

  await repo.updateProductDB(id, formattedData);

  emitGlobalUpdate(["Inventory"]);

  let changes = [];
  if (Number(oldProduct.buyingPrice) !== Number(formattedData.buyingPrice)) {
    changes.push(
      `Buying: ₹${oldProduct.buyingPrice} -> ₹${formattedData.buyingPrice}`,
    );
  }
  if (Number(oldProduct.sellingPrice) !== Number(formattedData.sellingPrice)) {
    changes.push(
      `Selling: ₹${oldProduct.sellingPrice} -> ₹${formattedData.sellingPrice}`,
    );
  }
  if (
    Number(oldProduct.availableStock) !== Number(formattedData.availableStock)
  ) {
    changes.push(
      `Stock: ${oldProduct.availableStock} -> ${formattedData.availableStock}`,
    );
  }
  if (oldProduct.hsn !== formattedData.hsn) {
    changes.push(`hsn: ${oldProduct.hsn} -> ${formattedData.hsn}`);
  }
  if (changes.length > 0) {
    const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

    if (!canShowAll && data.inventoryType === "PAKKA") {
      targets.push(
        { target_type: "ROLE", target_value: "ADMIN" },
        { target_type: "ROLE", target_value: "INVENTORY_MANAGER" },
      );
    }
    await processNewNotification(
      {
        type: "PRODUCT_UPDATED",
        title: "Product Info Modified",
        message: `${user.name} (${user.role}) updated '${oldProduct.name}'. Changes: ${changes.join(", ")}`,
        reference_module: "inventory",
        reference_id: id,
      },
      targets,
    );
  }
};

export const removeProduct = async (id, user) => {
  const canShowAll = user?.role === "SUPER_ADMIN";
  const oldData = await repo.getProductByIdDB(id, canShowAll);
  const productDetails = toCamelCase(oldData);
  if (!productDetails) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  const affectedRows = await repo.deleteProductDB(id);

  emitGlobalUpdate(["Inventory"]);

  if (affectedRows > 0) {
    await removeRelatedNotifications(id, "inventory");

    const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

    if (!canShowAll && productDetails.inventoryType === "PAKKA") {
      targets.push(
        { target_type: "ROLE", target_value: "ADMIN" },
        { target_type: "ROLE", target_value: "INVENTORY_MANAGER" },
      );
    }

    await processNewNotification(
      {
        type: "PRODUCT_DELETED",
        title: "Product Removed from Inventory",
        message: `Product '${productDetails.name}' (hsn: ${productDetails.hsn}) was deleted by ${user.name} (${user.role}).`,
        reference_module: "inventory",
        reference_id: id,
      },
      targets,
    );
  }

  return affectedRows;
};

export const bulkImportInventory = async (file, user) => {
  if (!file || !file.buffer) {
    throw new Error("FILE_NOT_FOUND");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  let rawData = [];

  if (ext === ".json") {
    rawData = JSON.parse(file.buffer.toString("utf8"));
  } else if (ext === ".xlsx" || ext === ".xls") {
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } else {
    throw new Error("UNSUPPORTED_FILE_FORMAT");
  }

  if (!rawData || rawData.length === 0) {
    throw new Error("EMPTY_FILE");
  }

  const formattedRows = rawData.map((row) => {
    const getCellValue = (target) => {
      const actualKey = Object.keys(row).find(
        (k) => k.trim().toLowerCase() === target.toLowerCase(),
      );
      return actualKey ? row[actualKey] : "";
    };
    const hsn = getCellValue("hsn").toString().trim().toUpperCase();
    const name = getCellValue("Name").toString().trim();
    const stock = Number(getCellValue("Stock") || 0);
    const buyPrice = Number(getCellValue("buying_price") || 0);
    const sellPrice = Number(getCellValue("selling_price") || 0);
    const conversionRate = Number(getCellValue("conversion_rate") || 1);
    const altUnit = getCellValue("alt_unit") || null;
    const altUnitConversion = getCellValue("alt_unit_conversion") ? Number(getCellValue("alt_unit_conversion")) : null;
    return [
      uuidv4(),
      hsn,
      name.toLowerCase(),
      getCellValue("Category") || null,
      getCellValue("Type") || null,
      (getCellValue("inventory_type") || "PAKKA").toUpperCase(),
      getCellValue("Unit") || "PCS",
      getCellValue("Size") || null,
      getCellValue("Color") || null,
      stock,
      buyPrice,
      sellPrice,
      conversionRate,
      user.id,
      altUnit,
      altUnitConversion,
    ];
  });

  const affectedRows = await repo.bulkInsertInventoryDB(formattedRows);

  emitGlobalUpdate(["Inventory"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];

  await processNewNotification(
    {
      type: "BULK_IMPORT",
      title: "Bulk Inventory Import",
      message: `${user.name} (${user.role}) imported ${formattedRows.length} products via ${ext.toUpperCase()} file.`,
      reference_module: "inventory",
      reference_id: "BULK",
    },
    targets,
  );

  return affectedRows;
};
