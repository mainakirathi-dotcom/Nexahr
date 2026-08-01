import { Pool, QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// Render (and most hosted Postgres providers) require SSL. Local Postgres usually doesn't
// support it, so we only enable it when explicitly requested or when the host looks remote.
const wantsSSL =
  process.env.PGSSL === "true" ||
  /render\.com|neon\.tech|supabase\.co|amazonaws\.com/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: wantsSSL ? { rejectUnauthorized: false } : undefined,
});

export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}

// Convenience helpers so route code reads close to the old synchronous style.
export async function one<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<T | null> {
  const res = await pool.query<T>(text, params);
  return res.rows[0] ?? null;
}

export async function many<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin','hr_manager')),
      organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(organization_id, name)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      photo_url TEXT,
      national_id TEXT,
      gender TEXT,
      dob DATE,
      phone TEXT,
      email TEXT,
      address TEXT,
      emergency_contact TEXT,
      job_title TEXT,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      employment_type TEXT,
      employment_category TEXT,
      date_hired DATE,
      salary DOUBLE PRECISION DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','On Leave','Suspended','Resigned','Dismissed','Retired')),
      bank_details TEXT,
      kra_pin TEXT,
      nssf_number TEXT,
      sha_number TEXT,
      next_of_kin TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(organization_id, employee_code)
    );

    CREATE TABLE IF NOT EXISTS performance_evals (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      score DOUBLE PRECISION NOT NULL CHECK(score BETWEEN 1 AND 10),
      notes TEXT,
      evaluated_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(employee_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      reason TEXT,
      hr_officer TEXT,
      effective_date DATE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      doc_type TEXT,
      original_name TEXT,
      mime_type TEXT,
      file_size INTEGER,
      file_data BYTEA,
      uploaded_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      device TEXT,
      organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Migration: upgrade a documents table created by an earlier version of this app
  // (which stored files on local disk via file_path) to store the file bytes directly
  // in Postgres instead, so uploads survive redeploys.
  await pool.query(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA;
  `);

  // Migration: introduce multi-tenancy (organizations) on a database that was created
  // before this feature existed. Any pre-existing data (from before you had other
  // clients) is grouped into a single "Legacy Organization" so nothing gets lost or
  // orphaned — you can rename it in Settings afterwards.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;`);
  await pool.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;`);
  await pool.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;`);
  await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;`);
  await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;`);

  const orphanedBranches = await pool.query(`SELECT COUNT(*) c FROM branches WHERE organization_id IS NULL`);
  if (Number(orphanedBranches.rows[0].c) > 0) {
    const legacyOrg = await pool.query(
      `INSERT INTO organizations (name) VALUES ('Legacy Organization') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const legacyOrgId = legacyOrg.rows[0].id;
    await pool.query(`UPDATE branches SET organization_id = $1 WHERE organization_id IS NULL`, [legacyOrgId]);
    await pool.query(`UPDATE departments SET organization_id = $1 WHERE organization_id IS NULL`, [legacyOrgId]);
    await pool.query(`UPDATE employees SET organization_id = $1 WHERE organization_id IS NULL`, [legacyOrgId]);
    await pool.query(`UPDATE users SET organization_id = $1 WHERE organization_id IS NULL AND role = 'hr_manager'`, [legacyOrgId]);
  }

  // Old schema had a global-unique constraint on branches.name and employees.employee_code;
  // multi-tenancy needs those unique per-organization instead. Drop the old constraints if present.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_name_key') THEN
        ALTER TABLE branches DROP CONSTRAINT branches_name_key;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_code_key') THEN
        ALTER TABLE employees DROP CONSTRAINT employees_employee_code_key;
      END IF;
    END $$;
  `);
  await pool.query(`ALTER TABLE branches ALTER COLUMN organization_id SET NOT NULL;`).catch(() => {});
  await pool.query(`ALTER TABLE departments ALTER COLUMN organization_id SET NOT NULL;`).catch(() => {});
  await pool.query(`ALTER TABLE employees ALTER COLUMN organization_id SET NOT NULL;`).catch(() => {});
}

export default pool;
