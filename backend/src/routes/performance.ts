import { Router } from "express";
import { pool, many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

// Get all evaluations for an employee, plus computed stats
router.get("/employee/:id", async (req, res, next) => {
  try {
    const rows = await many<any>(
      "SELECT * FROM performance_evals WHERE employee_id = $1 ORDER BY year, month",
      [req.params.id]
    );

    if (rows.length === 0) return res.json({ evaluations: [], stats: null });

    const scores = rows.map((r) => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    const currentYear = new Date().getFullYear();
    const thisYear = rows.filter((r) => r.year === currentYear);
    const lastYear = rows.filter((r) => r.year === currentYear - 1);
    const thisYearAvg = thisYear.length ? thisYear.reduce((a, b) => a + b.score, 0) / thisYear.length : null;
    const lastYearAvg = lastYear.length ? lastYear.reduce((a, b) => a + b.score, 0) / lastYear.length : null;
    const improvementPct = thisYearAvg !== null && lastYearAvg ? ((thisYearAvg - lastYearAvg) / lastYearAvg) * 100 : null;

    const last3 = rows.slice(-3).map((r) => r.score);
    const trend = last3.length >= 2 ? (last3[last3.length - 1] > last3[0] ? "Improving" : last3[last3.length - 1] < last3[0] ? "Declining" : "Stable") : "Stable";

    res.json({
      evaluations: rows,
      stats: {
        annual_average: Math.round(avg * 100) / 100,
        highest_score: max,
        lowest_score: min,
        trend,
        improvement_percentage: improvementPct !== null ? Math.round(improvementPct * 10) / 10 : null,
        this_year_average: thisYearAvg !== null ? Math.round(thisYearAvg * 100) / 100 : null,
        last_year_average: lastYearAvg !== null ? Math.round(lastYearAvg * 100) / 100 : null,
      },
    });
  } catch (e) { next(e); }
});

// Add or upsert a monthly evaluation
router.post("/employee/:id", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const { year, month, score, notes } = req.body;
    if (!year || !month || score === undefined) return res.status(400).json({ error: "year, month and score are required" });
    if (score < 1 || score > 10) return res.status(400).json({ error: "Score must be between 1 and 10" });

    const empResult = await pool.query("SELECT full_name FROM employees WHERE id = $1", [req.params.id]);
    const emp = empResult.rows[0];
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    await pool.query(
      `INSERT INTO performance_evals (employee_id, year, month, score, notes, evaluated_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (employee_id, year, month) DO UPDATE SET score = excluded.score, notes = excluded.notes, evaluated_by = excluded.evaluated_by`,
      [req.params.id, year, month, score, notes || null, req.user!.name]
    );

    await logAudit(req, req.user!.name, "Performance Review Recorded", `${emp.full_name} - ${year}-${month}: ${score}`);
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// Rankings & leaderboards across the company
router.get("/rankings", async (_req, res, next) => {
  try {
    const employeeAverages = await many<any>(`
      SELECT e.id, e.full_name, e.employee_code, e.department_id, e.branch_id,
             d.name as department_name, b.name as branch_name,
             AVG(p.score) as avg_score, COUNT(p.id) as review_count
      FROM employees e
      JOIN performance_evals p ON p.employee_id = e.id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN branches b ON b.id = e.branch_id
      WHERE e.status = 'Active'
      GROUP BY e.id, d.name, b.name
      HAVING COUNT(p.id) > 0
      ORDER BY avg_score DESC
    `);

    const best = employeeAverages.slice(0, 5);
    const lowest = [...employeeAverages].sort((a, b) => a.avg_score - b.avg_score).slice(0, 5);

    // most improved = compare avg of last 3 months vs prior 3 months
    const improvement = await many<any>(
      `SELECT employee_id, year, month, score FROM performance_evals ORDER BY employee_id, year, month`
    );
    const byEmp: Record<number, any[]> = {};
    improvement.forEach((r) => {
      byEmp[r.employee_id] = byEmp[r.employee_id] || [];
      byEmp[r.employee_id].push(r.score);
    });
    const improvements = Object.entries(byEmp).map(([id, scores]) => {
      if (scores.length < 4) return { id: Number(id), delta: 0 };
      const recent = scores.slice(-3);
      const prior = scores.slice(-6, -3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const priorAvg = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : recentAvg;
      return { id: Number(id), delta: recentAvg - priorAvg };
    }).sort((a, b) => b.delta - a.delta).slice(0, 5);

    const empMap = new Map(employeeAverages.map((e) => [e.id, e]));
    const mostImproved = improvements
      .map((i) => ({ ...empMap.get(i.id), delta: Math.round(i.delta * 100) / 100 }))
      .filter((e) => e.id);

    const deptRanking = await many(`
      SELECT d.id, d.name, AVG(p.score) as avg_score
      FROM departments d
      JOIN employees e ON e.department_id = d.id
      JOIN performance_evals p ON p.employee_id = e.id
      GROUP BY d.id ORDER BY avg_score DESC
    `);

    const branchRanking = await many(`
      SELECT b.id, b.name, AVG(p.score) as avg_score
      FROM branches b
      JOIN employees e ON e.branch_id = b.id
      JOIN performance_evals p ON p.employee_id = e.id
      GROUP BY b.id ORDER BY avg_score DESC
    `);

    res.json({ best, lowest, mostImproved, deptRanking, branchRanking });
  } catch (e) { next(e); }
});

export default router;
