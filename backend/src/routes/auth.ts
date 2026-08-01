import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { one } from "../db";
import { JWT_SECRET, requireAuth, AuthedRequest } from "../middleware/auth";
import { logAudit } from "../utils/audit";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await one<any>(
      `SELECT u.*, o.name as organization_name FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1`,
      [email]
    );
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const payload = {
      id: user.id, name: user.name, email: user.email, role: user.role,
      organization_id: user.organization_id, organization_name: user.organization_name,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    await logAudit(req, user.name, "User Login", `${user.email} logged in`, user.organization_id);
    res.json({ token, user: payload });
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
