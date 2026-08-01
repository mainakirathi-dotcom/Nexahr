import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";

/**
 * Determines which organization's data a request is allowed to touch.
 *
 * - hr_manager: ALWAYS locked to their own organization_id from the JWT. Any
 *   organization_id sent in the request body/query is ignored — trusting client
 *   input here would let one company's HR simply ask for another company's data.
 * - super_admin: the platform owner. Can view/act on any organization by passing
 *   ?organization_id=<id> (or organization_id in the body for writes). If they
 *   don't specify one, there is no single-organization scope (null) — callers
 *   should treat that as "show a platform-wide view" or reject, depending on the route.
 */
export function resolveOrgScope(req: AuthedRequest): number | null {
  if (!req.user) return null;
  if (req.user.role === "hr_manager") return req.user.organization_id;

  // super_admin
  const fromQuery = req.query.organization_id;
  const fromBody = req.body?.organization_id;
  const raw = fromQuery ?? fromBody;
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Same as resolveOrgScope, but responds with 400 and returns null if no organization
 * could be determined. Use this on routes where "no organization selected" isn't a
 * valid state (e.g. creating an employee has to belong to *some* company).
 */
export function requireOrgScope(req: AuthedRequest, res: Response): number | null {
  const orgId = resolveOrgScope(req);
  if (orgId === null) {
    res.status(400).json({
      error: req.user?.role === "super_admin"
        ? "Select an organization first (organization_id is required)."
        : "Your account is not linked to an organization. Contact your Super Admin.",
    });
    return null;
  }
  return orgId;
}
