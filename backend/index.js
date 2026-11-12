import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import settingRoutes from "./routes/settingRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import referenceRoutes from "./routes/referenceRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { initSocket } from "./socket.js";
import http from "http";
import { initCronJobs } from "./utils/scheduler.js";
import accountingRoutes from "./routes/accountingRoutes.js";
import internalLedgerRoutes from "./routes/internalLedgerRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import advanceRoutes from "./routes/advanceRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";

dotenv.config();

const app = express();

const server = http.createServer(app);

app.use(
  cors({
    origin: ["http://52.66.138.227", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

initSocket(server);
initCronJobs();

app.use("/api/auth", authRoutes);

app.use(verifyToken);

app.use("/api/settings", settingRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/references", referenceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/internal-ledger", internalLedgerRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/advances", advanceRoutes);
app.use("/api/salary", salaryRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
