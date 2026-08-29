import { Router } from "express";
import { one, many } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const count = async (sql: string, params: any[] = []) => Number((await one<{ c: string }>(sql, params))!.c);

    const total = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1", [orgId]);
    const active = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='Active'", [orgId]);
    const onLeave = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='On Leave'", [orgId]);
    const suspended = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='Suspended'", [orgId]);
    const resigned = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='Resigned'", [orgId]);
    const dismissed = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='Dismissed'", [orgId]);
    const retired = await count("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='Retired'", [orgId]);
    const branches = await count("SELECT COUNT(*) c FROM branches WHERE organization_id = $1", [orgId]);
    const departments = await count("SELECT COUNT(*) c FROM departments WHERE organization_id = $1", [orgId]);
    const addedThisMonth = await count(
      "SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')",
      [orgId]
    );

    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const birthdaysToday = await many(
      "SELECT id, full_name, dob, photo_url FROM employees WHERE organization_id = $1 AND TO_CHAR(dob, 'MM-DD') = $2",
      [orgId, mmdd]
    );

    const genderDist = (await many<any>(
      "SELECT COALESCE(NULLIF(gender, ''), 'Not specified') as gender, COUNT(*) c FROM employees WHERE organization_id = $1 GROUP BY COALESCE(NULLIF(gender, ''), 'Not specified')",
      [orgId]
    )).map((r) => ({ gender: r.gender, c: Number(r.c) }));

    const branchDist = (await many<any>(`
      SELECT b.name, COUNT(e.id) c FROM branches b LEFT JOIN employees e ON e.branch_id = b.id
      WHERE b.organization_id = $1 GROUP BY b.id, b.name`, [orgId])).map((r) => ({ name: r.name, c: Number(r.c) }));

    const deptDist = (await many<any>(`
      SELECT d.name, COUNT(e.id) c FROM departments d LEFT JOIN employees e ON e.department_id = d.id
      WHERE d.organization_id = $1 GROUP BY d.id, d.name`, [orgId])).map((r) => ({ name: r.name, c: Number(r.c) }));

    const statusDist = (await many<any>("SELECT status, COUNT(*) c FROM employees WHERE organization_id = $1 GROUP BY status", [orgId]))
      .map((r) => ({ status: r.status, c: Number(r.c) }));

    const salaryBuckets = (await many<any>(`
      SELECT
        CASE
          WHEN salary < 40000 THEN 'Under 40K'
          WHEN salary < 60000 THEN '40K-60K'
          WHEN salary < 80000 THEN '60K-80K'
          WHEN salary < 100000 THEN '80K-100K'
          ELSE '100K+'
        END as bucket,
        COUNT(*) as c
      FROM employees WHERE organization_id = $1 GROUP BY bucket`, [orgId])).map((r) => ({ bucket: r.bucket, c: Number(r.c) }));

    const hiringTrend = (await many<any>(`
      SELECT TO_CHAR(date_hired, 'YYYY-MM') as ym, COUNT(*) c
      FROM employees WHERE organization_id = $1 AND date_hired IS NOT NULL
      GROUP BY ym ORDER BY ym`, [orgId])).map((r) => ({ ym: r.ym, c: Number(r.c) }));

    const growthTrend = await many<any>(`
      SELECT TO_CHAR(date_hired, 'YYYY-MM') as ym, COUNT(*) c
      FROM employees WHERE organization_id = $1 AND date_hired IS NOT NULL
      GROUP BY ym ORDER BY ym`, [orgId]);
    let running = 0;
    const employeeGrowth = growthTrend.map((r) => { running += Number(r.c); return { ym: r.ym, total: running }; });

    const perfTrend = await many(`
      SELECT p.year, p.month, AVG(p.score) as avg_score
      FROM performance_evals p JOIN employees e ON e.id = p.employee_id
      WHERE e.organization_id = $1
      GROUP BY p.year, p.month ORDER BY p.year, p.month`, [orgId]);

    const recentActivity = await many(
      "SELECT user_name, action, details, created_at FROM audit_log WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 10",
      [orgId]
    );

    res.json({
      totals: { total, active, onLeave, suspended, resigned, dismissed, retired, branches, departments, addedThisMonth },
      birthdaysToday,
      genderDist, branchDist, deptDist, statusDist, salaryBuckets,
      hiringTrend, employeeGrowth, perfTrend, recentActivity,
    });
  } catch (e) { next(e); }
});

export default router;
