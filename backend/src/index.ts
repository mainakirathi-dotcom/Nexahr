import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import "./db"; // initialize schema
import "./db/seed"; // idempotent seed of demo data

import authRoutes from "./routes/auth";
import orgRoutes from "./routes/orgs";
import employeeRoutes from "./routes/employees";
import performanceRoutes from "./routes/performance";
import dashboardRoutes from "./routes/dashboard";
import documentRoutes from "./routes/documents";
import miscRoutes from "./routes/misc";
import aiRoutes from "./routes/ai";
import userRoutes from "./routes/users";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/org", orgRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "NexaHR API" }));

// Mounted last since it registers routes directly under "/api" (reports, audit-log)
app.use("/api", miscRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`NexaHR API running on http://localhost:${PORT}`);
});
