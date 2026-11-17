import * as inventoryService from "../services/inventoryServices.js";

export const getAllProducts = async (req, res) => {
  try {
    const user = req.user;
    const data = await inventoryService.getFormattedProducts(user);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Error fetching inventory", error: error.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { hsn, name, inventoryType } = req.body;

    if (!hsn || !name || !inventoryType) {
      return res
        .status(400)
        .json({ message: "hsn, Name and Inventory Type are required" });
    }
    const user = req.user;
    const creator = user?.id || "";
    const id = await inventoryService.createNewProduct(req.body, creator, user);

    res.status(201).json({ message: "Product added successfully", id });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    const user = req.user;

    await inventoryService.modifyProduct(id, req.body, user);

    res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    const user = req.user;

    await inventoryService.removeProduct(id, user);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const importInventoryController = async (req, res) => {
  try {
    const file = req.file;
    const user = req.user;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const result = await inventoryService.bulkImportInventory(file, user);

    return res.status(200).json({
      success: true,
      message: "Inventory imported successfully",
      affectedRows: result,
    });
  } catch (error) {
    return res.status(error.message === "EMPTY_FILE" ? 400 : 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
