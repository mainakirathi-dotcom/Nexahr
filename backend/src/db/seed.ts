import bcrypt from "bcryptjs";
import { pool, one, many } from "./index";

export async function runSeed() {
  // If any organization already exists, this is an upgrade of a real database (the
  // migration in initSchema() already grouped pre-existing data into "Legacy
  // Organization") — don't also bolt on an unrelated demo company in that case.
  const existingOrgCount = Number((await one<{ c: string }>("SELECT COUNT(*) as c FROM organizations"))!.c);
  const isFreshInstall = existingOrgCount === 0;

  // Platform Super Admin — organization_id is NULL, meaning platform-wide access
  // across every client company. Safe to (re)check on every boot.
  const adminExists = await one("SELECT id FROM users WHERE email = $1", ["admin@nexahr.com"]);
  if (!adminExists) {
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role, organization_id) VALUES ($1,$2,$3,$4,$5)",
      ["System Admin", "admin@nexahr.com", bcrypt.hashSync("admin123", 10), "super_admin", null]
    );
    console.log("Seeded platform Super Admin: admin@nexahr.com / admin123");
  }

  if (!isFreshInstall) return;

  // A demo client company so a brand-new install has something to look at out of the box.
  let demoOrgId: number;
  const demoOrg = await one<{ id: number }>("SELECT id FROM organizations WHERE name = $1", ["Demo Company Ltd"]);
  if (demoOrg) {
    demoOrgId = demoOrg.id;
  } else {
    demoOrgId = (await one<{ id: number }>(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING id", ["Demo Company Ltd"]
    ))!.id;
    console.log("Seeded demo company: Demo Company Ltd");
  }

  const hrExists = await one("SELECT id FROM users WHERE email = $1", ["hr@nexahr.com"]);
  if (!hrExists) {
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role, organization_id) VALUES ($1,$2,$3,$4,$5)",
      ["Jane HR", "hr@nexahr.com", bcrypt.hashSync("hr12345", 10), "hr_manager", demoOrgId]
    );
    console.log("Seeded demo company HR Manager: hr@nexahr.com / hr12345");
  }

  let nairobiId: number, mombasaId: number, kisumuId: number;
  const branchCount = (await one<{ c: string }>("SELECT COUNT(*) as c FROM branches WHERE organization_id = $1", [demoOrgId]))!.c;
  if (Number(branchCount) === 0) {
    nairobiId = (await one<{ id: number }>("INSERT INTO branches (name, location, organization_id) VALUES ($1,$2,$3) RETURNING id", ["Nairobi HQ", "Nairobi, Kenya", demoOrgId]))!.id;
    mombasaId = (await one<{ id: number }>("INSERT INTO branches (name, location, organization_id) VALUES ($1,$2,$3) RETURNING id", ["Mombasa Branch", "Mombasa, Kenya", demoOrgId]))!.id;
    kisumuId = (await one<{ id: number }>("INSERT INTO branches (name, location, organization_id) VALUES ($1,$2,$3) RETURNING id", ["Kisumu Branch", "Kisumu, Kenya", demoOrgId]))!.id;
  } else {
    const rows = await many<{ id: number; name: string }>("SELECT id, name FROM branches WHERE organization_id = $1 ORDER BY id", [demoOrgId]);
    nairobiId = rows[0]?.id ?? 1;
    mombasaId = rows[1]?.id ?? nairobiId;
    kisumuId = rows[2]?.id ?? nairobiId;
  }

  let deptIds: number[] = [];
  const deptCount = (await one<{ c: string }>("SELECT COUNT(*) as c FROM departments WHERE organization_id = $1", [demoOrgId]))!.c;
  if (Number(deptCount) === 0) {
    const specs: [string, number][] = [
      ["Human Resources", nairobiId], ["Engineering", nairobiId], ["Finance", nairobiId],
      ["Sales", mombasaId], ["Customer Support", kisumuId],
    ];
    for (const [name, branchId] of specs) {
      const row = await one<{ id: number }>("INSERT INTO departments (name, branch_id, organization_id) VALUES ($1,$2,$3) RETURNING id", [name, branchId, demoOrgId]);
      deptIds.push(row!.id);
    }
  } else {
    deptIds = (await many<{ id: number }>("SELECT id FROM departments WHERE organization_id = $1", [demoOrgId])).map((d) => d.id);
  }

  const empCount = (await one<{ c: string }>("SELECT COUNT(*) as c FROM employees WHERE organization_id = $1", [demoOrgId]))!.c;
  if (Number(empCount) === 0) {
    const branches = [nairobiId, mombasaId, kisumuId];
    const names = [
      "Amina Njoroge", "Brian Otieno", "Cynthia Wanjiru", "David Kiptoo", "Esther Mwangi",
      "Felix Mutua", "Grace Achieng", "Hassan Ali", "Irene Chebet", "James Karanja",
      "Linet Auma", "Michael Ochieng", "Nancy Wairimu", "Omar Farah", "Peris Nyambura",
    ];
    const jobTitles = ["Software Engineer", "HR Officer", "Accountant", "Sales Executive", "Support Agent", "Marketing Lead"];
    const empTypes = ["Full-Time", "Part-Time", "Contract", "Internship"];
    const empCats = ["Permanent", "Probation", "Casual"];

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const gender = i % 3 === 0 ? "Female" : i % 3 === 1 ? "Male" : "Female";
      const year = 2018 + (i % 7);
      const status = i === 2 ? "On Leave" : i === 5 ? "Suspended" : i === 9 ? "Resigned" : "Active";

      const emp = await one<{ id: number }>(
        `INSERT INTO employees
          (employee_code, full_name, national_id, gender, dob, phone, email, address, emergency_contact,
           job_title, department_id, branch_id, organization_id, employment_type, employment_category, date_hired, salary,
           status, bank_details, kra_pin, nssf_number, sha_number, next_of_kin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         RETURNING id`,
        [
          `NEX-${String(1000 + i)}`, name, `${30000000 + i * 137}`, gender,
          `${1985 + (i % 15)}-0${(i % 9) + 1}-1${i % 9}`,
          `+2547${String(10000000 + i * 91).slice(0, 8)}`,
          `${name.toLowerCase().replace(/ /g, ".")}@nexahr.com`,
          "P.O. Box 1000, Nairobi", "+254700000000", jobTitles[i % jobTitles.length],
          deptIds[i % deptIds.length], branches[i % branches.length], demoOrgId, empTypes[i % empTypes.length],
          empCats[i % empCats.length], `${year}-0${(i % 9) + 1}-15`, 45000 + (i % 10) * 8500, status,
          "Equity Bank - 0123456789", `A0${10000000 + i}Z`, `NSSF${100000 + i}`, `SHA${200000 + i}`,
          "Spouse / Parent",
        ]
      );
      const empId = emp!.id;

      const now = new Date();
      for (let m = 1; m <= 12; m++) {
        const score = Math.min(10, Math.max(1, Math.round((5 + Math.sin(i + m) * 2 + (m / 12) * 2) * 10) / 10));
        await pool.query(
          "INSERT INTO performance_evals (employee_id, year, month, score, notes, evaluated_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
          [empId, now.getFullYear() - 1, m, score, null, "Jane HR"]
        );
      }
      for (let m = 1; m <= now.getMonth() + 1; m++) {
        const score = Math.min(10, Math.max(1, Math.round((6 + Math.sin(i + m + 1) * 2.2 + (m / 12) * 1.5) * 10) / 10));
        await pool.query(
          "INSERT INTO performance_evals (employee_id, year, month, score, notes, evaluated_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
          [empId, now.getFullYear(), m, score, null, "Jane HR"]
        );
      }
    }
    console.log(`Seeded ${names.length} employees with performance history for Demo Company Ltd.`);
  }
}

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
