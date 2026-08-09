import bcrypt from "bcryptjs";
import { pool, one } from "./index";

// Runs on every boot. Deliberately creates NO demo data — a brand-new deployment
// starts completely empty. The only account this ever creates is your own private
// admin (via BOOTSTRAP_ADMIN_* environment variables), so there's nothing pre-filled
// to clean up and no well-known default credentials sitting in the system.
export async function runSeed() {
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (bootstrapEmail && bootstrapPassword) {
    const exists = await one("SELECT id FROM users WHERE email = $1", [bootstrapEmail]);
    if (!exists) {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, organization_id) VALUES ($1,$2,$3,$4,$5)",
        [process.env.BOOTSTRAP_ADMIN_NAME || "Super Admin", bootstrapEmail, bcrypt.hashSync(bootstrapPassword, 10), "super_admin", null]
      );
      console.log(`Created your personal Super Admin account: ${bootstrapEmail}`);
    }
  }
}

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
