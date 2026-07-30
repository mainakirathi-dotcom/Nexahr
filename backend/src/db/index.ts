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
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin','hr_manager')),
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      location TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_code TEXT UNIQUE NOT NULL,
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
      updated_at TIMESTAMPTZ DEFAULT now()
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
}

export default pool;
