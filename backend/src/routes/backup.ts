import { Router } from "express";
import { many } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { resolveOrgScope } from "../utils/orgScope";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// Full data export. If a company is selected (?organization_id=), backs up just that
// company. If nothing is selected, backs up EVERY client company at once, grouped by
// organization — a true platform-wide backup, only available to the Super Admin.
// Passwords are deliberately left out; if restoring, create fresh accounts and set new
// passwords instead of restoring hashes from a file that might end up on a USB stick.
router.get("/export", async (req: AuthedRequest, res, next) => {
  try {
    const orgId = resolveOrgScope(req);
    const scopeClause = orgId !== null ? "WHERE organization_id = $1" : "";
    const scopeClauseAlias = (alias: string) => (orgId !== null ? `WHERE ${alias}.organization_id = $1` : "");
    const params = orgId !== null ? [orgId] : [];

    const [organizations, users, branches, departments, employees, performanceEvals, statusHistory, documents, auditLog] = await Promise.all([
      orgId !== null
        ? many("SELECT * FROM organizations WHERE id = $1", [orgId])
        : many("SELECT * FROM organizations ORDER BY id"),
      many(`SELECT id, name, email, role, organization_id, created_at FROM users ${scopeClause} ORDER BY id`, params),
      many(`SELECT * FROM branches ${scopeClause} ORDER BY id`, params),
      many(`SELECT * FROM departments ${scopeClause} ORDER BY id`, params),
      many(`SELECT * FROM employees ${scopeClause} ORDER BY id`, params),
      many(`
        SELECT p.* FROM performance_evals p JOIN employees e ON e.id = p.employee_id
        ${scopeClauseAlias("e")} ORDER BY p.id`, params),
      many(`
        SELECT s.* FROM status_history s JOIN employees e ON e.id = s.employee_id
        ${scopeClauseAlias("e")} ORDER BY s.id`, params),
      many(`
        SELECT d.id, d.employee_id, d.doc_type, d.original_name, d.mime_type, d.file_size, d.uploaded_at,
               encode(d.file_data, 'base64') as file_data_base64
        FROM documents d JOIN employees e ON e.id = d.employee_id
        ${scopeClauseAlias("e")} ORDER BY d.id`, params),
      many(`SELECT * FROM audit_log ${scopeClause} ORDER BY id`, params),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      exported_by: req.user!.name,
      scope: orgId !== null ? `Single company (organization_id=${orgId})` : "Platform-wide (all companies)",
      note: "User passwords are not included. If restoring, create fresh HR/Super Admin accounts and set new passwords.",
      data: { organizations, users, branches, departments, employees, performance_evals: performanceEvals, status_history: statusHistory, documents, audit_log: auditLog },
    };

    await logAudit(req, req.user!.name, "Full Backup Downloaded", `scope=${backup.scope}, ${employees.length} employees, ${documents.length} documents`, orgId);

    const filename = `nexahr-backup-${orgId !== null ? `org${orgId}` : "all"}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (e) { next(e); }
});

export default router;
