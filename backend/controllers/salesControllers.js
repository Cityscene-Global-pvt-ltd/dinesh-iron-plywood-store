import * as salesService from "../services/salesServices.js";

export const getAllSales = async (req, res) => {
  try {
    const user = req.user;
    const data = await salesService.getFormattedSales(user);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sales records" });
  }
};

export const createSale = async (req, res) => {
  try {
    const user = req.user;
    const creator = user?.id || "";
    const saleId = await salesService.processNewSale(req.body, creator, user);
    res.status(201).json({ message: "Sale recorded successfully", saleId });
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to record sale" });
  }
};

export const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    await salesService.modifySale(id, req.body, user);
    res.status(200).json({ message: "Sale updated successfully" });
  } catch (error) {
    if (error.message === "SALE_NOT_FOUND") {
      return res.status(404).json({ message: "Sale not found" });
    }
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const addSalePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, referenceNumber, paymentDate } = req.body;
    const user = req.user;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "SALE_ID_REQUIRED",
      });
    }

    const result = await salesService.addSalePayment(
      id,
      {
        amount,
        paymentMode,
        referenceNumber,
        paymentDate,
      },
      user,
    );

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: result,
    });
  } catch (error) {
    res.status(error.message === "SALE_NOT_FOUND" ? 404 : 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const user = req.user;

    const result = await salesService.removePayment(paymentId, user);

    res.status(200).json({
      success: true,
      message: "Payment deleted and balance adjusted",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete payment",
    });
  }
};

export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    await salesService.removeSale(id, user);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    if (error.message === "SALE_NOT_FOUND") {
      return res.status(404).json({ message: "Sale not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const createReturn = async (req, res) => {
  try {
    const user = req.user;
    const creator = user?.id || "";
    const returnId = await salesService.processNewReturn(
      req.body,
      creator,
      user,
    );
    res.status(201).json({ message: "Return successful", returnId });
  } catch (error) {
    if (error.message === "PRODUCT_MISSING_CONFIRMATION_REQUIRED") {
      return res.status(409).json({
        message: `Product "${error.missingItemName}" was permanently deleted from your inventory database. Do you want to automatically recreate it using the returned quantities?`,
        code: "PRODUCT_MISSING_CONFIRMATION_REQUIRED"
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const getAllReturns = async (req, res) => {
  const user = req.user;
  try {
    const data = await salesService.getFormattedReturns(user);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching return records" });
  }
};

export const sendInvoiceMail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    const pdfFile = req.file;

    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: "PDF not found!",
      });
    }

    const result = await salesService.sendInvoiceAndTrack({
      email,
      subject,
      message,
      pdfFile,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    await salesService.removeReturn(id, user);
    res.status(200).json({ message: "Return deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete return" });
  }
};

export const getAnomalies = async (req, res) => {
  try {
    const user = req.user;
    const data = await salesService.getAnomalies(user);
    res.status(200).json(data);
  } catch (error) {
    if (error.message === "Unauthorized") return res.status(403).json({ message: "Unauthorized" });
    res.status(500).json({ message: error.message || "Error fetching anomalies" });
  }
};

export const resolveAnomaly = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { action, payload } = req.body;
    await salesService.resolveAnomaly(id, action, payload, user);
    res.status(200).json({ message: "Anomaly resolved successfully" });
  } catch (error) {
    if (error.message === "Unauthorized") return res.status(403).json({ message: "Unauthorized" });
    if (error.message === "SALE_NOT_FOUND") return res.status(404).json({ message: "Sale not found" });
    res.status(500).json({ message: error.message || "Error resolving anomaly" });
  }
};

export const getCustomerPrices = async (req, res) => {
  try {
    const { customerId } = req.params;
    const prices = await salesService.getCustomerItemPrices(customerId);
    res.status(200).json(prices);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch customer item prices" });
  }
};
