import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

function generateEmployeeCode(): string {
  const row = db.prepare("SELECT COUNT(*) as c FROM employees").get() as any;
  const next = 1000 + row.c + 1;
  return `NEX-${next}`;
}

const EMP_SELECT = `
  SELECT e.*, d.name as department_name, b.name as branch_name
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN branches b ON b.id = e.branch_id
`;

function withComputed(emp: any) {
  if (!emp) return emp;
  const hired = emp.date_hired ? new Date(emp.date_hired) : null;
  const years = hired ? Math.max(0, (Date.now() - hired.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
  const perf = db.prepare(
    `SELECT AVG(score) as avg_score, MAX(created_at) as last_date FROM performance_evals WHERE employee_id = ?`
  ).get(emp.id) as any;
  return {
    ...emp,
    years_worked: Math.round(years * 10) / 10,
    performance_index: perf.avg_score ? Math.round(perf.avg_score * 10) / 10 : null,
    last_evaluation_date: perf.last_date || null,
  };
}

// LIST + SEARCH/FILTER
router.get("/", (req, res) => {
  const { q, branch_id, department_id, status, employment_category, min_salary, max_salary, year_joined } = req.query as Record<string, string>;
  let sql = EMP_SELECT + " WHERE 1=1";
  const params: any[] = [];

  if (q) {
    sql += ` AND (e.full_name LIKE ? OR e.employee_code LIKE ? OR e.national_id LIKE ? OR e.phone LIKE ? OR e.job_title LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  if (branch_id) { sql += " AND e.branch_id = ?"; params.push(branch_id); }
  if (department_id) { sql += " AND e.department_id = ?"; params.push(department_id); }
  if (status) { sql += " AND e.status = ?"; params.push(status); }
  if (employment_category) { sql += " AND e.employment_category = ?"; params.push(employment_category); }
  if (min_salary) { sql += " AND e.salary >= ?"; params.push(Number(min_salary)); }
  if (max_salary) { sql += " AND e.salary <= ?"; params.push(Number(max_salary)); }
  if (year_joined) { sql += " AND strftime('%Y', e.date_hired) = ?"; params.push(year_joined); }
  sql += " ORDER BY e.full_name";

  const rows = db.prepare(sql).all(...params) as any[];
  res.json(rows.map(withComputed));
});

// GET ONE
router.get("/:id", (req, res) => {
  const emp = db.prepare(EMP_SELECT + " WHERE e.id = ?").get(req.params.id);
  if (!emp) return res.status(404).json({ error: "Employee not found" });
  res.json(withComputed(emp));
});

// CREATE
router.post("/", requireRole("super_admin", "hr_manager"), (req: AuthedRequest, res) => {
  const b = req.body;
  if (!b.full_name) return res.status(400).json({ error: "Full name is required" });
  const code = generateEmployeeCode();
  const info = db.prepare(`INSERT INTO employees
    (employee_code, full_name, national_id, gender, dob, phone, email, address, emergency_contact,
     job_title, department_id, branch_id, employment_type, employment_category, date_hired, salary,
     status, bank_details, kra_pin, nssf_number, sha_number, next_of_kin, photo_url)
    VALUES (@employee_code,@full_name,@national_id,@gender,@dob,@phone,@email,@address,@emergency_contact,
     @job_title,@department_id,@branch_id,@employment_type,@employment_category,@date_hired,@salary,
     @status,@bank_details,@kra_pin,@nssf_number,@sha_number,@next_of_kin,@photo_url)`
  ).run({
    employee_code: code,
    full_name: b.full_name,
    national_id: b.national_id || null,
    gender: b.gender || null,
    dob: b.dob || null,
    phone: b.phone || null,
    email: b.email || null,
    address: b.address || null,
    emergency_contact: b.emergency_contact || null,
    job_title: b.job_title || null,
    department_id: b.department_id || null,
    branch_id: b.branch_id || null,
    employment_type: b.employment_type || null,
    employment_category: b.employment_category || null,
    date_hired: b.date_hired || null,
    salary: b.salary || 0,
    status: b.status || "Active",
    bank_details: b.bank_details || null,
    kra_pin: b.kra_pin || null,
    nssf_number: b.nssf_number || null,
    sha_number: b.sha_number || null,
    next_of_kin: b.next_of_kin || null,
    photo_url: b.photo_url || null,
  });
  logAudit(req, req.user!.name, "Employee Added", `${b.full_name} (${code})`);
  res.status(201).json({ id: info.lastInsertRowid, employee_code: code });
});

// UPDATE
router.put("/:id", requireRole("super_admin", "hr_manager"), (req: AuthedRequest, res) => {
  const b = req.body;
  const existing = db.prepare("SELECT * FROM employees WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Employee not found" });

  const fields = [
    "full_name","national_id","gender","dob","phone","email","address","emergency_contact",
    "job_title","department_id","branch_id","employment_type","employment_category","date_hired",
    "salary","bank_details","kra_pin","nssf_number","sha_number","next_of_kin","photo_url"
  ];
  const setClauses = fields.map((f) => `${f} = @${f}`).join(", ");
  const params: any = { id: req.params.id };
  fields.forEach((f) => { params[f] = b[f] !== undefined ? b[f] : existing[f]; });

  db.prepare(`UPDATE employees SET ${setClauses}, updated_at = datetime('now') WHERE id = @id`).run(params);
  logAudit(req, req.user!.name, "Employee Edited", `${existing.full_name} (${existing.employee_code})`);
  res.json({ ok: true });
});

// STATUS CHANGE (archive/dismiss/resign/retire/suspend/reactivate)
router.post("/:id/status", requireRole("super_admin", "hr_manager"), (req: AuthedRequest, res) => {
  const { status, reason, effective_date } = req.body;
  const valid = ["Active", "On Leave", "Suspended", "Resigned", "Dismissed", "Retired"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const existing = db.prepare("SELECT * FROM employees WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Employee not found" });

  db.prepare("UPDATE employees SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  db.prepare(
    "INSERT INTO status_history (employee_id, status, reason, hr_officer, effective_date) VALUES (?,?,?,?,?)"
  ).run(req.params.id, status, reason || null, req.user!.name, effective_date || new Date().toISOString().slice(0, 10));

  logAudit(req, req.user!.name, "Employee Status Changed", `${existing.full_name} -> ${status}`);
  res.json({ ok: true });
});

// STATUS / CAREER HISTORY
router.get("/:id/history", (req, res) => {
  const rows = db.prepare("SELECT * FROM status_history WHERE employee_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json(rows);
});

export default router;
