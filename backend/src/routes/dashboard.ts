import { Router } from "express";
import { one, many } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (_req, res, next) => {
  try {
    const count = async (sql: string, params: any[] = []) => Number((await one<{ c: string }>(sql, params))!.c);

    const total = await count("SELECT COUNT(*) c FROM employees");
    const active = await count("SELECT COUNT(*) c FROM employees WHERE status='Active'");
    const onLeave = await count("SELECT COUNT(*) c FROM employees WHERE status='On Leave'");
    const suspended = await count("SELECT COUNT(*) c FROM employees WHERE status='Suspended'");
    const resigned = await count("SELECT COUNT(*) c FROM employees WHERE status='Resigned'");
    const dismissed = await count("SELECT COUNT(*) c FROM employees WHERE status='Dismissed'");
    const retired = await count("SELECT COUNT(*) c FROM employees WHERE status='Retired'");
    const branches = await count("SELECT COUNT(*) c FROM branches");
    const departments = await count("SELECT COUNT(*) c FROM departments");
    const addedThisMonth = await count(
      "SELECT COUNT(*) c FROM employees WHERE TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')"
    );

    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const birthdaysToday = await many(
      "SELECT id, full_name, dob, photo_url FROM employees WHERE TO_CHAR(dob, 'MM-DD') = $1",
      [mmdd]
    );

    const genderDist = await many("SELECT gender, COUNT(*) c FROM employees GROUP BY gender");
    const branchDist = await many(`
      SELECT b.name, COUNT(e.id) c FROM branches b LEFT JOIN employees e ON e.branch_id = b.id GROUP BY b.id, b.name`);
    const deptDist = await many(`
      SELECT d.name, COUNT(e.id) c FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id, d.name`);
    const statusDist = await many("SELECT status, COUNT(*) c FROM employees GROUP BY status");

    const salaryBuckets = await many(`
      SELECT
        CASE
          WHEN salary < 40000 THEN 'Under 40K'
          WHEN salary < 60000 THEN '40K-60K'
          WHEN salary < 80000 THEN '60K-80K'
          WHEN salary < 100000 THEN '80K-100K'
          ELSE '100K+'
        END as bucket,
        COUNT(*) as c
      FROM employees GROUP BY bucket`);

    const hiringTrend = await many(`
      SELECT TO_CHAR(date_hired, 'YYYY-MM') as ym, COUNT(*) c
      FROM employees WHERE date_hired IS NOT NULL
      GROUP BY ym ORDER BY ym`);

    const growthTrend = await many<any>(`
      SELECT TO_CHAR(date_hired, 'YYYY-MM') as ym, COUNT(*) c
      FROM employees WHERE date_hired IS NOT NULL
      GROUP BY ym ORDER BY ym`);
    let running = 0;
    const employeeGrowth = growthTrend.map((r) => { running += Number(r.c); return { ym: r.ym, total: running }; });

    const perfTrend = await many(`
      SELECT year, month, AVG(score) as avg_score
      FROM performance_evals GROUP BY year, month ORDER BY year, month`);

    const recentActivity = await many(
      "SELECT user_name, action, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT 10"
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
