import { Router } from "express";
import { pool, many, one } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// Every Platform Super Admin — organization_id IS NULL is what makes an account
// platform-wide rather than tied to one client company. Any Super Admin can see this
// list and remove another admin, but never the last one and never themselves.
router.get("/", async (_req, res, next) => {
  try {
    const admins = await many(
      "SELECT id, name, email, created_at FROM users WHERE role = 'super_admin' AND organization_id IS NULL ORDER BY created_at"
    );
    res.json(admins);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    if (String(req.user!.id) === req.params.id) {
      return res.status(400).json({ error: "You can't remove your own account while logged in as it." });
    }

    const target = await one<any>(
      "SELECT id, name, email FROM users WHERE id = $1 AND role = 'super_admin' AND organization_id IS NULL",
      [req.params.id]
    );
    if (!target) return res.status(404).json({ error: "Admin not found" });

    const countRow = await one<{ c: string }>(
      "SELECT COUNT(*) c FROM users WHERE role = 'super_admin' AND organization_id IS NULL"
    );
    if (Number(countRow!.c) <= 1) {
      return res.status(400).json({ error: "Can't remove the last remaining admin — the system would become inaccessible." });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    await logAudit(req, req.user!.name, "Platform Admin Removed", `${target.name} <${target.email}>`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
