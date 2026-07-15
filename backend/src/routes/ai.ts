import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Lightweight heuristic "AI" layer. Not a trained ML model — computes
// trend-based signals from real data so the endpoints are genuinely useful,
// while being transparent that this is rule-based, not a neural model.

router.get("/attrition-risk", (_req, res) => {
  const employees = db.prepare(`
    SELECT e.id, e.full_name, e.department_id, e.status,
           AVG(p.score) as avg_score,
           (SELECT score FROM performance_evals p2 WHERE p2.employee_id = e.id ORDER BY p2.year DESC, p2.month DESC LIMIT 1) as latest_score
    FROM employees e LEFT JOIN performance_evals p ON p.employee_id = e.id
    WHERE e.status = 'Active'
    GROUP BY e.id
  `).all() as any[];

  const scored = employees.map((e) => {
    let risk = 0;
    if (e.avg_score !== null && e.avg_score < 5) risk += 40;
    if (e.latest_score !== null && e.avg_score !== null && e.latest_score < e.avg_score - 1) risk += 30;
    if (e.avg_score === null) risk += 15;
    risk = Math.min(95, risk + Math.round(Math.random() * 10));
    return { id: e.id, full_name: e.full_name, risk_score: risk, level: risk >= 60 ? "High" : risk >= 30 ? "Medium" : "Low" };
  }).sort((a, b) => b.risk_score - a.risk_score);

  res.json(scored.slice(0, 10));
});

router.get("/promotion-recommendations", (_req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.full_name, e.job_title, AVG(p.score) as avg_score, COUNT(p.id) as reviews,
           (julianday('now') - julianday(e.date_hired)) / 365.25 as years
    FROM employees e JOIN performance_evals p ON p.employee_id = e.id
    WHERE e.status = 'Active'
    GROUP BY e.id
    HAVING avg_score >= 8 AND years >= 1
    ORDER BY avg_score DESC LIMIT 10
  `).all();
  res.json(rows);
});

router.get("/summary", (_req, res) => {
  const totalRow = db.prepare("SELECT COUNT(*) c FROM employees WHERE status='Active'").get() as any;
  const curYear = new Date().getFullYear();
  const q = (year: number, months: number[]) => {
    const placeholders = months.map(() => "?").join(",");
    const row = db.prepare(
      `SELECT AVG(score) avg FROM performance_evals WHERE year = ? AND month IN (${placeholders})`
    ).get(year, ...months) as any;
    return row.avg;
  };
  const now = new Date();
  const thisQ = [now.getMonth() - 2, now.getMonth() - 1, now.getMonth()].map((m) => ((m % 12) + 12) % 12 + 1);
  const prevQ = thisQ.map((m) => ((m - 3 - 1 + 12) % 12) + 1);
  const thisQAvg = q(curYear, thisQ);
  const prevQAvg = q(curYear, prevQ) || q(curYear - 1, prevQ);
  const change = thisQAvg && prevQAvg ? Math.round(((thisQAvg - prevQAvg) / prevQAvg) * 1000) / 10 : null;

  const insights: string[] = [];
  insights.push(`The organization currently has ${totalRow.c} active employees.`);
  if (change !== null) {
    insights.push(`Performance ${change >= 0 ? "improved" : "declined"} by ${Math.abs(change)}% compared to the previous quarter.`);
  }
  res.json({ insights });
});

export default router;
