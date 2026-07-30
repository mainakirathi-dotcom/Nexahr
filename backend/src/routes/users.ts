import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

router.get("/", async (_req, res, next) => {
  try {
    const rows = await many("SELECT id, name, email, role, created_at FROM users ORDER BY name");
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: "All fields are required" });
    if (!["super_admin", "hr_manager"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
      [name, email, bcrypt.hashSync(password, 10), role]
    );
    await logAudit(req, req.user!.name, "HR Account Created", `${name} <${email}> (${role})`);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ error: "Email already exists" });
    next(e);
  }
});

router.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "User Account Deleted", `id=${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
