import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { initSchema } from "./db";
import { runSeed } from "./db/seed";

import authRoutes from "./routes/auth";
import orgRoutes from "./routes/orgs";
import organizationsRoutes from "./routes/organizations";
import employeeRoutes from "./routes/employees";
import performanceRoutes from "./routes/performance";
import dashboardRoutes from "./routes/dashboard";
import documentRoutes from "./routes/documents";
import miscRoutes from "./routes/misc";
import aiRoutes from "./routes/ai";
import userRoutes from "./routes/users";
import backupRoutes from "./routes/backup";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/org", orgRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/backup", backupRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "NexaHR API" }));

// Mounted last since it registers routes directly under "/api" (reports, audit-log)
app.use("/api", miscRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

async function main() {
  await initSchema();
  await runSeed();
  app.listen(PORT, () => {
    console.log(`NexaHR API running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Failed to start NexaHR API:", e);
  process.exit(1);
});
