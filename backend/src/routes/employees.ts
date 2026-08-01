import { Router } from "express";
import { pool, one, many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { resolveOrgScope, requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth);

async function generateEmployeeCode(orgId: number): Promise<string> {
  const row = await one<{ c: string }>("SELECT COUNT(*) as c FROM employees WHERE organization_id = $1", [orgId]);
  const next = 1000 + Number(row!.c) + 1;
  return `NEX-${next}`;
}

// Lets HR type a branch name freely instead of being locked to a preset list —
// matches an existing branch case-insensitively within their company, or creates a
// new one on the fly. Scoped to organization so "Nairobi HQ" for one client never
// collides with "Nairobi HQ" for another.
async function resolveBranchId(branchName: unknown, orgId: number): Promise<number | null> {
  if (typeof branchName !== "string" || !branchName.trim()) return null;
  const name = branchName.trim();
  const existing = await one<{ id: number }>(
    "SELECT id FROM branches WHERE LOWER(name) = LOWER($1) AND organization_id = $2",
    [name, orgId]
  );
  if (existing) return existing.id;
  const created = await one<{ id: number }>(
    "INSERT INTO branches (name, organization_id) VALUES ($1,$2) RETURNING id",
    [name, orgId]
  );
  return created!.id;
}

const EMP_SELECT = `
  SELECT e.*, d.name as department_name, b.name as branch_name
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN branches b ON b.id = e.branch_id
`;

async function withComputed(emp: any) {
  if (!emp) return emp;
  const hired = emp.date_hired ? new Date(emp.date_hired) : null;
  const years = hired ? Math.max(0, (Date.now() - hired.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
  const perf = await one<{ avg_score: number | null; last_date: string | null }>(
    `SELECT AVG(score) as avg_score, MAX(created_at) as last_date FROM performance_evals WHERE employee_id = $1`,
    [emp.id]
  );
  return {
    ...emp,
    years_worked: Math.round(years * 10) / 10,
    performance_index: perf?.avg_score ? Math.round(perf.avg_score * 10) / 10 : null,
    last_evaluation_date: perf?.last_date || null,
  };
}

// LIST + SEARCH/FILTER — always scoped to one company (their own for HR Managers,
// the selected client for the platform Super Admin).
router.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const { q, branch_id, department_id, status, employment_category, min_salary, max_salary, year_joined } = req.query as Record<string, string>;
    let sql = EMP_SELECT + " WHERE e.organization_id = $1";
    const params: any[] = [orgId];

    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      sql += ` AND (e.full_name ILIKE $${idx} OR e.employee_code ILIKE $${idx} OR e.national_id ILIKE $${idx} OR e.phone ILIKE $${idx} OR e.job_title ILIKE $${idx})`;
    }
    if (branch_id) { params.push(branch_id); sql += ` AND e.branch_id = $${params.length}`; }
    if (department_id) { params.push(department_id); sql += ` AND e.department_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND e.status = $${params.length}`; }
    if (employment_category) { params.push(employment_category); sql += ` AND e.employment_category = $${params.length}`; }
    if (min_salary) { params.push(Number(min_salary)); sql += ` AND e.salary >= $${params.length}`; }
    if (max_salary) { params.push(Number(max_salary)); sql += ` AND e.salary <= $${params.length}`; }
    if (year_joined) { params.push(year_joined); sql += ` AND TO_CHAR(e.date_hired, 'YYYY') = $${params.length}`; }
    sql += " ORDER BY e.full_name";

    const rows = await many(sql, params);
    const withStats = await Promise.all(rows.map(withComputed));
    res.json(withStats);
  } catch (e) { next(e); }
});

// GET ONE — id AND organization_id must both match, so guessing another company's
// employee id returns a clean 404 instead of leaking their data.
router.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const emp = await one(EMP_SELECT + " WHERE e.id = $1 AND e.organization_id = $2", [req.params.id, orgId]);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(await withComputed(emp));
  } catch (e) { next(e); }
});

// CREATE
router.post("/", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const b = req.body;
    if (!b.full_name) return res.status(400).json({ error: "Full name is required" });
    const code = await generateEmployeeCode(orgId);
    const branchId = await resolveBranchId(b.branch, orgId);
    const result = await pool.query(
      `INSERT INTO employees
        (employee_code, full_name, national_id, gender, dob, phone, email, address, emergency_contact,
         job_title, department_id, branch_id, organization_id, employment_type, employment_category, date_hired, salary,
         status, bank_details, kra_pin, nssf_number, sha_number, next_of_kin, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING id`,
      [
        code, b.full_name, b.national_id || null, b.gender || null, b.dob || null, b.phone || null,
        b.email || null, b.address || null, b.emergency_contact || null, b.job_title || null,
        b.department_id || null, branchId, orgId, b.employment_type || null, b.employment_category || null,
        b.date_hired || null, b.salary || 0, b.status || "Active", b.bank_details || null, b.kra_pin || null,
        b.nssf_number || null, b.sha_number || null, b.next_of_kin || null, b.photo_url || null,
      ]
    );
    await logAudit(req, req.user!.name, "Employee Added", `${b.full_name} (${code})`, orgId);
    res.status(201).json({ id: result.rows[0].id, employee_code: code });
  } catch (e) { next(e); }
});

// UPDATE — scoped WHERE clause means you can never edit another company's employee
// even by guessing/forging an id.
router.put("/:id", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const b = req.body;
    const existing = await one<any>("SELECT * FROM employees WHERE id = $1 AND organization_id = $2", [req.params.id, orgId]);
    if (!existing) return res.status(404).json({ error: "Employee not found" });

    const fields = [
      "full_name", "national_id", "gender", "dob", "phone", "email", "address", "emergency_contact",
      "job_title", "department_id", "employment_type", "employment_category", "date_hired",
      "salary", "bank_details", "kra_pin", "nssf_number", "sha_number", "next_of_kin", "photo_url",
    ];
    const values = fields.map((f) => (b[f] !== undefined ? b[f] : existing[f]));
    const branchId = b.branch !== undefined ? await resolveBranchId(b.branch, orgId) : existing.branch_id;
    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ") + `, branch_id = $${fields.length + 1}`;

    await pool.query(
      `UPDATE employees SET ${setClauses}, updated_at = now() WHERE id = $${fields.length + 2} AND organization_id = $${fields.length + 3}`,
      [...values, branchId, req.params.id, orgId]
    );
    await logAudit(req, req.user!.name, "Employee Edited", `${existing.full_name} (${existing.employee_code})`, orgId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// STATUS CHANGE (archive/dismiss/resign/retire/suspend/reactivate)
router.post("/:id/status", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const { status, reason, effective_date } = req.body;
    const valid = ["Active", "On Leave", "Suspended", "Resigned", "Dismissed", "Retired"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const existing = await one<any>("SELECT * FROM employees WHERE id = $1 AND organization_id = $2", [req.params.id, orgId]);
    if (!existing) return res.status(404).json({ error: "Employee not found" });

    await pool.query("UPDATE employees SET status = $1, updated_at = now() WHERE id = $2", [status, req.params.id]);
    await pool.query(
      "INSERT INTO status_history (employee_id, status, reason, hr_officer, effective_date) VALUES ($1,$2,$3,$4,$5)",
      [req.params.id, status, reason || null, req.user!.name, effective_date || new Date().toISOString().slice(0, 10)]
    );

    await logAudit(req, req.user!.name, "Employee Status Changed", `${existing.full_name} -> ${status}`, orgId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// STATUS / CAREER HISTORY
router.get("/:id/history", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    const owned = await one("SELECT id FROM employees WHERE id = $1 AND organization_id = $2", [req.params.id, orgId]);
    if (!owned) return res.status(404).json({ error: "Employee not found" });
    const rows = await many("SELECT * FROM status_history WHERE employee_id = $1 ORDER BY created_at DESC", [req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
