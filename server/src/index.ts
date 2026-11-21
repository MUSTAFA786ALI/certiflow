import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { prisma } from "./config/prisma";
import authRoutes from "./modules/auth/auth.routes";
import batchRoutes from "./modules/batches/batch.routes";
import approvalRoutes from "./modules/approvals/approval.routes";
import issuanceRoutes from "./modules/certificates/issuance.routes";
import verificationRoutes from "./modules/certificates/verification.routes";
import { redis } from "./config/redis";
import "./modules/deliveries/delivery.worker";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/certificates", issuanceRoutes);
app.use("/api/verification", verificationRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CertiFlow API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/db-health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Database connected successfully",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

redis.ping()
  .then((result) => {
    console.log("Redis ping:", result);
  })
  .catch((error) => {
    console.error("Redis ping failed:", error.message);
  });

app.listen(PORT, () => {
  console.log(`CertiFlow API running on http://localhost:${PORT}`);
});
