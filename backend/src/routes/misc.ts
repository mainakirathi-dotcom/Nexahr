import { Router } from "express";
import { many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth);

router.get("/audit-log", requireRole("super_admin"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const limit = Number(req.query.limit) || 200;
    const rows = await many(
      "SELECT * FROM audit_log WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2",
      [orgId, limit]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

function toCSV(rows: any[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}

router.get("/reports/employees", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const { branch_id, department_id, status } = req.query as Record<string, string>;
    let sql = `SELECT e.employee_code, e.full_name, e.job_title, d.name as department, b.name as branch,
        e.employment_type, e.employment_category, e.date_hired, e.salary, e.status
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN branches b ON b.id = e.branch_id
        WHERE e.organization_id = $1`;
    const params: any[] = [orgId];
    if (branch_id) { params.push(branch_id); sql += ` AND e.branch_id = $${params.length}`; }
    if (department_id) { params.push(department_id); sql += ` AND e.department_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND e.status = $${params.length}`; }
    const rows = await many(sql, params);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=employees_report.csv");
    res.send(toCSV(rows));
  } catch (e) { next(e); }
});

router.get("/reports/performance", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const { year } = req.query as Record<string, string>;
    const y = year || new Date().getFullYear().toString();
    const rows = await many(`
      SELECT e.employee_code, e.full_name, p.year, p.month, p.score, p.evaluated_by
      FROM performance_evals p JOIN employees e ON e.id = p.employee_id
      WHERE p.year = $1 AND e.organization_id = $2 ORDER BY e.full_name, p.month`, [y, orgId]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=performance_report_${y}.csv`);
    res.send(toCSV(rows));
  } catch (e) { next(e); }
});

router.get("/reports/salary-summary", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const rows = await many(`
      SELECT d.name as department, b.name as branch, COUNT(e.id) as headcount,
             ROUND(AVG(e.salary)::numeric,2) as avg_salary, ROUND(SUM(e.salary)::numeric,2) as total_salary
      FROM employees e LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN branches b ON b.id = e.branch_id
      WHERE e.status = 'Active' AND e.organization_id = $1
      GROUP BY d.id, d.name, b.id, b.name`, [orgId]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=salary_summary.csv");
    res.send(toCSV(rows));
  } catch (e) { next(e); }
});

export default router;
