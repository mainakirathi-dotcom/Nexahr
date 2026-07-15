import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, name, email, role, created_at FROM users ORDER BY name").all();
  res.json(rows);
});

router.post("/", (req: AuthedRequest, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: "All fields are required" });
  if (!["super_admin", "hr_manager"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  try {
    const info = db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)"
    ).run(name, email, bcrypt.hashSync(password, 10), role);
    logAudit(req, req.user!.name, "HR Account Created", `${name} <${email}> (${role})`);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: "Email already exists" });
  }
});

router.delete("/:id", (req: AuthedRequest, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  logAudit(req, req.user!.name, "User Account Deleted", `id=${req.params.id}`);
  res.json({ ok: true });
});

export default router;
