import { Router } from "express";
import { many } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/audit-log", requireRole("super_admin"), async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const rows = await many("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1", [limit]);
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

router.get("/reports/employees", async (req, res, next) => {
  try {
    const { branch_id, department_id, status } = req.query as Record<string, string>;
    let sql = `SELECT e.employee_code, e.full_name, e.job_title, d.name as department, b.name as branch,
        e.employment_type, e.employment_category, e.date_hired, e.salary, e.status
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN branches b ON b.id = e.branch_id
        WHERE 1=1`;
    const params: any[] = [];
    if (branch_id) { params.push(branch_id); sql += ` AND e.branch_id = $${params.length}`; }
    if (department_id) { params.push(department_id); sql += ` AND e.department_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND e.status = $${params.length}`; }
    const rows = await many(sql, params);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=employees_report.csv");
    res.send(toCSV(rows));
  } catch (e) { next(e); }
});

router.get("/reports/performance", async (req, res, next) => {
  try {
    const { year } = req.query as Record<string, string>;
    const y = year || new Date().getFullYear().toString();
    const rows = await many(`
      SELECT e.employee_code, e.full_name, p.year, p.month, p.score, p.evaluated_by
      FROM performance_evals p JOIN employees e ON e.id = p.employee_id
      WHERE p.year = $1 ORDER BY e.full_name, p.month`, [y]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=performance_report_${y}.csv`);
    res.send(toCSV(rows));
  } catch (e) { next(e); }
});

router.get("/reports/salary-summary", async (_req, res, next) => {
  try {
    const rows = await many(`
      SELECT d.name as department, b.name as branch, COUNT(e.id) as headcount,
             ROUND(AVG(e.salary)::numeric,2) as avg_salary, ROUND(SUM(e.salary)::numeric,2) as total_salary
      FROM employees e LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN branches b ON b.id = e.branch_id
      WHERE e.status = 'Active'
      GROUP BY d.id, d.name, b.id, b.name`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=salary_summary.csv");
    res.send(toCSV(rows));
  } catch (e) { next(e); }
});

export default router;
