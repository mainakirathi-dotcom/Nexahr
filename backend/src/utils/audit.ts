import { Request } from "express";
import { pool } from "../db";

export async function logAudit(req: Request, userName: string, action: string, details?: string) {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const device = req.headers["user-agent"] || "unknown";
  try {
    await pool.query(
      "INSERT INTO audit_log (user_name, action, details, ip, device) VALUES ($1,$2,$3,$4,$5)",
      [userName, action, details || null, ip, device]
    );
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
