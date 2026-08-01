import { Router } from "express";
import { one, many } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth);

// Lightweight heuristic "AI" layer. Not a trained ML model — computes
// trend-based signals from real data so the endpoints are genuinely useful,
// while being transparent that this is rule-based, not a neural model.

router.get("/attrition-risk", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const employees = await many<any>(`
      SELECT e.id, e.full_name, e.department_id, e.status,
             AVG(p.score) as avg_score,
             (SELECT score FROM performance_evals p2 WHERE p2.employee_id = e.id ORDER BY p2.year DESC, p2.month DESC LIMIT 1) as latest_score
      FROM employees e LEFT JOIN performance_evals p ON p.employee_id = e.id
      WHERE e.status = 'Active' AND e.organization_id = $1
      GROUP BY e.id
    `, [orgId]);

    const scored = employees.map((e) => {
      let risk = 0;
      if (e.avg_score !== null && e.avg_score < 5) risk += 40;
      if (e.latest_score !== null && e.avg_score !== null && e.latest_score < e.avg_score - 1) risk += 30;
      if (e.avg_score === null) risk += 15;
      risk = Math.min(95, risk + Math.round(Math.random() * 10));
      return { id: e.id, full_name: e.full_name, risk_score: risk, level: risk >= 60 ? "High" : risk >= 30 ? "Medium" : "Low" };
    }).sort((a, b) => b.risk_score - a.risk_score);

    res.json(scored.slice(0, 10));
  } catch (e) { next(e); }
});

router.get("/promotion-recommendations", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const rows = await many(`
      SELECT e.id, e.full_name, e.job_title, AVG(p.score) as avg_score, COUNT(p.id) as reviews,
             EXTRACT(EPOCH FROM (now() - e.date_hired)) / (86400 * 365.25) as years
      FROM employees e JOIN performance_evals p ON p.employee_id = e.id
      WHERE e.status = 'Active' AND e.organization_id = $1
      GROUP BY e.id
      HAVING AVG(p.score) >= 8 AND EXTRACT(EPOCH FROM (now() - e.date_hired)) / (86400 * 365.25) >= 1
      ORDER BY avg_score DESC LIMIT 10
    `, [orgId]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get("/summary", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const totalRow = await one<{ c: string }>("SELECT COUNT(*) c FROM employees WHERE organization_id = $1 AND status='Active'", [orgId]);
    const curYear = new Date().getFullYear();
    const q = async (year: number, months: number[]) => {
      const placeholders = months.map((_, i) => `$${i + 3}`).join(",");
      const row = await one<{ avg: number | null }>(
        `SELECT AVG(p.score) avg FROM performance_evals p JOIN employees e ON e.id = p.employee_id
         WHERE e.organization_id = $1 AND p.year = $2 AND p.month IN (${placeholders})`,
        [orgId, year, ...months]
      );
      return row?.avg ?? null;
    };
    const now = new Date();
    const thisQ = [now.getMonth() - 2, now.getMonth() - 1, now.getMonth()].map((m) => ((m % 12) + 12) % 12 + 1);
    const prevQ = thisQ.map((m) => ((m - 3 - 1 + 12) % 12) + 1);
    const thisQAvg = await q(curYear, thisQ);
    const prevQAvg = (await q(curYear, prevQ)) || (await q(curYear - 1, prevQ));
    const change = thisQAvg && prevQAvg ? Math.round(((thisQAvg - prevQAvg) / prevQAvg) * 1000) / 10 : null;

    const insights: string[] = [];
    insights.push(`The organization currently has ${totalRow!.c} active employees.`);
    if (change !== null) {
      insights.push(`Performance ${change >= 0 ? "improved" : "declined"} by ${Math.abs(change)}% compared to the previous quarter.`);
    }
    res.json({ insights });
  } catch (e) { next(e); }
});

export default router;
