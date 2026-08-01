import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool, many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// Lists the HR accounts for ONE selected company (never platform-wide, and never
// another company's accounts).
router.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const rows = await many(
      "SELECT id, name, email, role, created_at FROM users WHERE organization_id = $1 ORDER BY name",
      [orgId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: "All fields are required" });
    if (!["super_admin", "hr_manager"].includes(role)) return res.status(400).json({ error: "Invalid role" });

    // A Super Admin account is always platform-wide (not tied to one company) — only
    // HR Manager accounts belong to a specific client company.
    let orgId: number | null = null;
    if (role === "hr_manager") {
      orgId = requireOrgScope(req, res);
      if (orgId === null) return;
    }

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, organization_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [name, email, bcrypt.hashSync(password, 10), role, orgId]
    );
    await logAudit(req, req.user!.name, "HR Account Created", `${name} <${email}> (${role})`, orgId);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ error: "Email already exists" });
    next(e);
  }
});

router.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    if (String(req.user!.id) === req.params.id) {
      return res.status(400).json({ error: "You can't delete your own account while logged in as it." });
    }
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "User Account Deleted", `id=${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
