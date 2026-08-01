import { Router } from "express";
import multer from "multer";
import path from "path";
import { pool, many, one } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { requireOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth);

async function assertEmployeeInScope(employeeId: string, orgId: number): Promise<boolean> {
  const row = await one("SELECT id FROM employees WHERE id = $1 AND organization_id = $2", [employeeId, orgId]);
  return !!row;
}

// Files are kept in memory just long enough to write them into Postgres as bytea —
// nothing touches local disk, so uploads survive restarts/redeploys just like the
// rest of the data.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

router.get("/employee/:id", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    if (!(await assertEmployeeInScope(req.params.id, orgId))) return res.status(404).json({ error: "Employee not found" });

    const docs = await many(
      `SELECT id, employee_id, doc_type, original_name, mime_type, file_size, uploaded_at
       FROM documents WHERE employee_id = $1 ORDER BY uploaded_at DESC`,
      [req.params.id]
    );
    res.json(docs);
  } catch (e) { next(e); }
});

router.post("/employee/:id", requireRole("super_admin", "hr_manager"), upload.single("file"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;
    if (!(await assertEmployeeInScope(req.params.id, orgId))) return res.status(404).json({ error: "Employee not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const docType = req.body.doc_type || "Other";
    const result = await pool.query(
      `INSERT INTO documents (employee_id, doc_type, original_name, mime_type, file_size, file_data)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.params.id, docType, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer]
    );
    await logAudit(req, req.user!.name, "Document Uploaded", `${req.file.originalname} for employee ${req.params.id}`, orgId);
    res.status(201).json({ id: result.rows[0].id });
  } catch (e) { next(e); }
});

// Streams the file back out of Postgres. Requires the same Bearer auth + organization
// scope as every other API call, so the frontend fetches this as a blob rather than
// using a plain <a href>.
router.get("/:id/file", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const doc = await one<any>(
      `SELECT d.original_name, d.mime_type, d.file_data
       FROM documents d JOIN employees e ON e.id = d.employee_id
       WHERE d.id = $1 AND e.organization_id = $2`,
      [req.params.id, orgId]
    );
    if (!doc || !doc.file_data) return res.status(404).json({ error: "File not found" });
    res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${doc.original_name.replace(/"/g, "")}"`);
    res.send(doc.file_data);
  } catch (e) { next(e); }
});

router.delete("/:id", requireRole("super_admin", "hr_manager"), async (req: AuthedRequest, res, next) => {
  try {
    const orgId = requireOrgScope(req, res);
    if (orgId === null) return;

    const doc = await one<any>(
      `SELECT d.original_name FROM documents d JOIN employees e ON e.id = d.employee_id
       WHERE d.id = $1 AND e.organization_id = $2`,
      [req.params.id, orgId]
    );
    if (!doc) return res.status(404).json({ error: "Document not found" });
    await pool.query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "Document Deleted", doc.original_name, orgId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
