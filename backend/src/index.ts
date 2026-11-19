import express from "express";
import cors from "cors";
import compression from "compression";
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
import adminsRoutes from "./routes/admins";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(compression());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/org", orgRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/admins", adminsRoutes);
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

  // Render's free tier sleeps after ~15 min without traffic. Pinging our own public URL
  // every 10 min keeps it awake so users never hit the 30-60s cold start.
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (selfUrl) {
    setInterval(() => {
      fetch(`${selfUrl}/api/health`).catch(() => {});
    }, 10 * 60 * 1000);
  }
}

main().catch((e) => {
  console.error("Failed to start NexaHR API:", e);
  process.exit(1);
});
