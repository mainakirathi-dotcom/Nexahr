import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

// Branches
router.get("/branches", (_req, res) => {
  const branches = db.prepare(`
    SELECT b.*, (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id) as employee_count
    FROM branches b ORDER BY b.name`).all();
  res.json(branches);
});

router.post("/branches", requireRole("super_admin"), (req: AuthedRequest, res) => {
  const { name, location } = req.body;
  if (!name) return res.status(400).json({ error: "Branch name is required" });
  const info = db.prepare("INSERT INTO branches (name, location) VALUES (?,?)").run(name, location || null);
  logAudit(req, req.user!.name, "Branch Created", name);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete("/branches/:id", requireRole("super_admin"), (req: AuthedRequest, res) => {
  db.prepare("DELETE FROM branches WHERE id = ?").run(req.params.id);
  logAudit(req, req.user!.name, "Branch Deleted", `id=${req.params.id}`);
  res.json({ ok: true });
});

// Departments
router.get("/departments", (_req, res) => {
  const departments = db.prepare(`
    SELECT d.*, b.name as branch_name, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) as employee_count
    FROM departments d LEFT JOIN branches b ON b.id = d.branch_id ORDER BY d.name`).all();
  res.json(departments);
});

router.post("/departments", requireRole("super_admin", "hr_manager"), (req: AuthedRequest, res) => {
  const { name, branch_id } = req.body;
  if (!name) return res.status(400).json({ error: "Department name is required" });
  const info = db.prepare("INSERT INTO departments (name, branch_id) VALUES (?,?)").run(name, branch_id || null);
  logAudit(req, req.user!.name, "Department Created", name);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete("/departments/:id", requireRole("super_admin"), (req: AuthedRequest, res) => {
  db.prepare("DELETE FROM departments WHERE id = ?").run(req.params.id);
  logAudit(req, req.user!.name, "Department Deleted", `id=${req.params.id}`);
  res.json({ ok: true });
});

export default router;
