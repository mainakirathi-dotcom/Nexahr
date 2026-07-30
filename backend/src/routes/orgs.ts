import { Router } from "express";
import { pool, many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

// Branches
router.get("/branches", async (_req, res, next) => {
  try {
    const branches = await many(`
      SELECT b.*, (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id) as employee_count
      FROM branches b ORDER BY b.name`);
    res.json(branches);
  } catch (e) { next(e); }
});

router.post("/branches", requireRole("super_admin"), async (req: AuthedRequest, res, next) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: "Branch name is required" });
    const result = await pool.query("INSERT INTO branches (name, location) VALUES ($1,$2) RETURNING id", [name, location || null]);
    await logAudit(req, req.user!.name, "Branch Created", name);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e) { next(e); }
});

router.delete("/branches/:id", requireRole("super_admin"), async (req: AuthedRequest, res, next) => {
  try {
    await pool.query("DELETE FROM branches WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "Branch Deleted", `id=${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Departments
router.get("/departments", async (_req, res, next) => {
  try {
    const departments = await many(`
      SELECT d.*, b.name as branch_name, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) as employee_count
      FROM departments d LEFT JOIN branches b ON b.id = d.branch_id ORDER BY d.name`);
    res.json(departments);
  } catch (e) { next(e); }
});

router.post("/departments", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const { name, branch_id } = req.body;
    if (!name) return res.status(400).json({ error: "Department name is required" });
    const result = await pool.query("INSERT INTO departments (name, branch_id) VALUES ($1,$2) RETURNING id", [name, branch_id || null]);
    await logAudit(req, req.user!.name, "Department Created", name);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e) { next(e); }
});

router.delete("/departments/:id", requireRole("super_admin"), async (req: AuthedRequest, res, next) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "Department Deleted", `id=${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
