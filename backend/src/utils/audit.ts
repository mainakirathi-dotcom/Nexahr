import { db } from "../db";
import { Request } from "express";

export function logAudit(req: Request, userName: string, action: string, details?: string) {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const device = req.headers["user-agent"] || "unknown";
  db.prepare(
    "INSERT INTO audit_log (user_name, action, details, ip, device) VALUES (?,?,?,?,?)"
  ).run(userName, action, details || null, ip, device);
}
