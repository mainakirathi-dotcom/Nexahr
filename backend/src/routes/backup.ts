import { Router } from "express";
import { many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// Full data export for the Super Admin — everything except password hashes (those are
// deliberately left out; if you ever need to restore, reset the account passwords instead
// of restoring hashes from a file that might end up on a USB stick or in email).
router.get("/export", async (req: AuthedRequest, res, next) => {
  try {
    const [users, branches, departments, employees, performanceEvals, statusHistory, documents, auditLog] = await Promise.all([
      many("SELECT id, name, email, role, created_at FROM users ORDER BY id"),
      many("SELECT * FROM branches ORDER BY id"),
      many("SELECT * FROM departments ORDER BY id"),
      many("SELECT * FROM employees ORDER BY id"),
      many("SELECT * FROM performance_evals ORDER BY id"),
      many("SELECT * FROM status_history ORDER BY id"),
      // Document file bytes are included so this is a genuinely complete backup —
      // encoded as base64 since JSON can't hold raw binary.
      many("SELECT id, employee_id, doc_type, original_name, mime_type, file_size, uploaded_at, encode(file_data, 'base64') as file_data_base64 FROM documents ORDER BY id"),
      many("SELECT * FROM audit_log ORDER BY id"),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      exported_by: req.user!.name,
      note: "User passwords are not included. If restoring, create fresh HR/Super Admin accounts and set new passwords.",
      data: { users, branches, departments, employees, performance_evals: performanceEvals, status_history: statusHistory, documents, audit_log: auditLog },
    };

    await logAudit(req, req.user!.name, "Full Backup Downloaded", `${employees.length} employees, ${documents.length} documents`);

    const filename = `nexahr-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (e) { next(e); }
});

export default router;
