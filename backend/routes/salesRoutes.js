import express from "express";
import {
  getAllSales,
  createSale,
  deleteSale,
  createReturn,
  getAllReturns,
  updateSale,
  sendInvoiceMail,
  addSalePayment,
  deletePayment,
  deleteReturn,
  getAnomalies,
  resolveAnomaly,
  getCustomerPrices,
} from "../controllers/salesControllers.js";
import upload from "../middleware/upload.js";

const router = express.Router();
router.post("/", createSale);
router.get("/", getAllSales);
router.get("/customer-prices/:customerId", getCustomerPrices);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);
router.post("/return", createReturn);
router.get("/return", getAllReturns);
router.delete("/return/:id", deleteReturn);
router.post("/send-invoice-mail", upload.single("invoice"), sendInvoiceMail);
router.post("/:id/update-payment", addSalePayment);
router.delete("/payment/:paymentId", deletePayment);
router.get("/anomalies/list", getAnomalies);
router.put("/anomalies/:id/resolve", resolveAnomaly);
export default router;
