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

    const user = await one<any>("SELECT * FROM users WHERE email = $1", [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    await logAudit(req, user.name, "User Login", `${user.email} logged in`);
    res.json({ token, user: payload });
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
