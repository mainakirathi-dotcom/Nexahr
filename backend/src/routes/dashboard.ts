import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/stats", (_req, res) => {
  const count = (sql: string, ...params: any[]) => (db.prepare(sql).get(...params) as any).c;

  const total = count("SELECT COUNT(*) c FROM employees");
  const active = count("SELECT COUNT(*) c FROM employees WHERE status='Active'");
  const onLeave = count("SELECT COUNT(*) c FROM employees WHERE status='On Leave'");
  const suspended = count("SELECT COUNT(*) c FROM employees WHERE status='Suspended'");
  const resigned = count("SELECT COUNT(*) c FROM employees WHERE status='Resigned'");
  const dismissed = count("SELECT COUNT(*) c FROM employees WHERE status='Dismissed'");
  const retired = count("SELECT COUNT(*) c FROM employees WHERE status='Retired'");
  const branches = count("SELECT COUNT(*) c FROM branches");
  const departments = count("SELECT COUNT(*) c FROM departments");
  const addedThisMonth = count("SELECT COUNT(*) c FROM employees WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')");

  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const birthdaysToday = db.prepare(
    "SELECT id, full_name, dob, photo_url FROM employees WHERE strftime('%m-%d', dob) = ?"
  ).all(mmdd);

  const genderDist = db.prepare("SELECT gender, COUNT(*) c FROM employees GROUP BY gender").all();
  const branchDist = db.prepare(`
    SELECT b.name, COUNT(e.id) c FROM branches b LEFT JOIN employees e ON e.branch_id = b.id GROUP BY b.id`).all();
  const deptDist = db.prepare(`
    SELECT d.name, COUNT(e.id) c FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id`).all();
  const statusDist = db.prepare("SELECT status, COUNT(*) c FROM employees GROUP BY status").all();

  const salaryBuckets = db.prepare(`
    SELECT
      CASE
        WHEN salary < 40000 THEN 'Under 40K'
        WHEN salary < 60000 THEN '40K-60K'
        WHEN salary < 80000 THEN '60K-80K'
        WHEN salary < 100000 THEN '80K-100K'
        ELSE '100K+'
      END as bucket,
      COUNT(*) as c
    FROM employees GROUP BY bucket`).all();

  const hiringTrend = db.prepare(`
    SELECT strftime('%Y-%m', date_hired) as ym, COUNT(*) c
    FROM employees WHERE date_hired IS NOT NULL
    GROUP BY ym ORDER BY ym`).all();

  const growthTrend = db.prepare(`
    SELECT strftime('%Y-%m', date_hired) as ym, COUNT(*) c
    FROM employees WHERE date_hired IS NOT NULL
    GROUP BY ym ORDER BY ym`).all() as any[];
  let running = 0;
  const employeeGrowth = growthTrend.map((r) => { running += r.c; return { ym: r.ym, total: running }; });

  const perfTrend = db.prepare(`
    SELECT year, month, AVG(score) as avg_score
    FROM performance_evals GROUP BY year, month ORDER BY year, month`).all();

  const recentActivity = db.prepare(
    "SELECT user_name, action, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT 10"
  ).all();

  res.json({
    totals: { total, active, onLeave, suspended, resigned, dismissed, retired, branches, departments, addedThisMonth },
    birthdaysToday,
    genderDist, branchDist, deptDist, statusDist, salaryBuckets,
    hiringTrend, employeeGrowth, perfTrend, recentActivity,
  });
});

export default router;
