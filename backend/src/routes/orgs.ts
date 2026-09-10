import { Router } from "express";
import { pool, many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { resolveOrgScope, requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth);

// Branches
router.get("/branches", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = resolveOrgScope(req);
    let sql = `
      SELECT b.*, (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id) as employee_count
      FROM branches b`;
    const params: any[] = [];
    if (orgId !== null) { sql += " WHERE b.organization_id = $1"; params.push(orgId); }
    sql += " ORDER BY b.name";
    const branches = await many(sql, params);
    res.json(branches);
  } catch (e) { next(e); }
});

router.post("/branches", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: "Branch name is required" });
    const result = await pool.query(
      "INSERT INTO branches (name, location, organization_id) VALUES ($1,$2,$3) RETURNING id",
      [name, location || null, orgId]
    );
    await logAudit(req, req.user!.name, "Branch Created", name, orgId);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ error: "A branch with that name already exists for this company" });
    next(e);
  }
});

router.put("/branches/:id", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const { name, location } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Branch name is required" });

    const existing = await many<any>("SELECT * FROM branches WHERE id = $1 AND organization_id = $2", [req.params.id, orgId]);
    if (existing.length === 0) return res.status(404).json({ error: "Branch not found" });
    const before = existing[0];

    await pool.query(
      "UPDATE branches SET name = $1, location = $2 WHERE id = $3 AND organization_id = $4",
      [name.trim(), location !== undefined ? location : before.location, req.params.id, orgId]
    );
    const detail = before.name !== name.trim() ? `"${before.name}" renamed to "${name.trim()}"` : `"${name.trim()}" updated`;
    await logAudit(req, req.user!.name, "Branch Renamed", detail, orgId);
    res.json({ ok: true });
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ error: "A branch with that name already exists for this company" });
    next(e);
  }
});

router.delete("/branches/:id", requireRole("super_admin"), async (req: AuthedRequest, res, next) => {
  try {
    await pool.query("DELETE FROM branches WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "Branch Deleted", `id=${req.params.id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Departments
router.get("/departments", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = resolveOrgScope(req);
    let sql = `
      SELECT d.*, b.name as branch_name, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) as employee_count
      FROM departments d LEFT JOIN branches b ON b.id = d.branch_id`;
    const params: any[] = [];
    if (orgId !== null) { sql += " WHERE d.organization_id = $1"; params.push(orgId); }
    sql += " ORDER BY d.name";
    const departments = await many(sql, params);
    res.json(departments);
  } catch (e) { next(e); }
});

router.post("/departments", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const { name, branch_id } = req.body;
    if (!name) return res.status(400).json({ error: "Department name is required" });
    const result = await pool.query(
      "INSERT INTO departments (name, branch_id, organization_id) VALUES ($1,$2,$3) RETURNING id",
      [name, branch_id || null, orgId]
    );
    await logAudit(req, req.user!.name, "Department Created", name, orgId);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e) { next(e); }
});

router.put("/departments/:id", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const { name, branch_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Department name is required" });

    const existing = await many<any>("SELECT * FROM departments WHERE id = $1 AND organization_id = $2", [req.params.id, orgId]);
    if (existing.length === 0) return res.status(404).json({ error: "Department not found" });
    const before = existing[0];

    await pool.query(
      "UPDATE departments SET name = $1, branch_id = $2 WHERE id = $3 AND organization_id = $4",
      [name.trim(), branch_id !== undefined ? (branch_id || null) : before.branch_id, req.params.id, orgId]
    );
    const detail = before.name !== name.trim() ? `"${before.name}" renamed to "${name.trim()}"` : `"${name.trim()}" updated`;
    await logAudit(req, req.user!.name, "Department Renamed", detail, orgId);
    res.json({ ok: true });
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
