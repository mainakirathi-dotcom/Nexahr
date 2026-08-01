import { Router } from "express";
import { pool, many, one } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// Platform-wide list of client companies, with quick headcounts for the org switcher.
router.get("/", async (_req, res, next) => {
  try {
    const orgs = await many(`
      SELECT o.id, o.name, o.created_at,
        (SELECT COUNT(*) FROM employees e WHERE e.organization_id = o.id) as employee_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as hr_count,
        (SELECT COUNT(*) FROM branches b WHERE b.organization_id = o.id) as branch_count
      FROM organizations o
      ORDER BY o.name
    `);
    res.json(orgs);
  } catch (e) { next(e); }
});

router.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required" });
    const result = await pool.query("INSERT INTO organizations (name) VALUES ($1) RETURNING id", [name.trim()]);
    await logAudit(req, req.user!.name, "Client Company Created", name.trim(), result.rows[0].id);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ error: "A company with that name already exists" });
    next(e);
  }
});

router.put("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required" });
    await pool.query("UPDATE organizations SET name = $1 WHERE id = $2", [name.trim(), req.params.id]);
    await logAudit(req, req.user!.name, "Client Company Renamed", name.trim(), Number(req.params.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Deleting a company cascades to ALL of its data (branches, employees, HR accounts,
// documents...) via ON DELETE CASCADE in the schema — this is intentionally destructive
// and irreversible, so the frontend should make the user confirm hard before calling this.
router.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const org = await one<any>("SELECT name FROM organizations WHERE id = $1", [req.params.id]);
    if (!org) return res.status(404).json({ error: "Company not found" });
    await pool.query("DELETE FROM organizations WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "Client Company Deleted", org.name);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
