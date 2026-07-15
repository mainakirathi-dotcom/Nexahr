import bcrypt from "bcryptjs";
import { db } from "./index";

function run() {
  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)"
    );
    insertUser.run("System Admin", "admin@nexahr.com", bcrypt.hashSync("admin123", 10), "super_admin");
    insertUser.run("Jane HR", "hr@nexahr.com", bcrypt.hashSync("hr12345", 10), "hr_manager");
    console.log("Seeded users: admin@nexahr.com / admin123, hr@nexahr.com / hr12345");
  }

  const branchCount = (db.prepare("SELECT COUNT(*) as c FROM branches").get() as any).c;
  let nairobiId = 1, mombasaId = 2, kisumuId = 3;
  if (branchCount === 0) {
    const insertBranch = db.prepare("INSERT INTO branches (name, location) VALUES (?,?)");
    nairobiId = insertBranch.run("Nairobi HQ", "Nairobi, Kenya").lastInsertRowid as number;
    mombasaId = insertBranch.run("Mombasa Branch", "Mombasa, Kenya").lastInsertRowid as number;
    kisumuId = insertBranch.run("Kisumu Branch", "Kisumu, Kenya").lastInsertRowid as number;
  }

  const deptCount = (db.prepare("SELECT COUNT(*) as c FROM departments").get() as any).c;
  let deptIds: number[] = [];
  if (deptCount === 0) {
    const insertDept = db.prepare("INSERT INTO departments (name, branch_id) VALUES (?,?)");
    deptIds.push(insertDept.run("Human Resources", nairobiId).lastInsertRowid as number);
    deptIds.push(insertDept.run("Engineering", nairobiId).lastInsertRowid as number);
    deptIds.push(insertDept.run("Finance", nairobiId).lastInsertRowid as number);
    deptIds.push(insertDept.run("Sales", mombasaId).lastInsertRowid as number);
    deptIds.push(insertDept.run("Customer Support", kisumuId).lastInsertRowid as number);
  } else {
    deptIds = (db.prepare("SELECT id FROM departments").all() as any[]).map((d) => d.id);
  }

  const empCount = (db.prepare("SELECT COUNT(*) as c FROM employees").get() as any).c;
  if (empCount === 0) {
    const branches = [nairobiId, mombasaId, kisumuId];
    const names = [
      "Amina Njoroge", "Brian Otieno", "Cynthia Wanjiru", "David Kiptoo", "Esther Mwangi",
      "Felix Mutua", "Grace Achieng", "Hassan Ali", "Irene Chebet", "James Karanja",
      "Linet Auma", "Michael Ochieng", "Nancy Wairimu", "Omar Farah", "Peris Nyambura"
    ];
    const jobTitles = ["Software Engineer", "HR Officer", "Accountant", "Sales Executive", "Support Agent", "Marketing Lead"];
    const empTypes = ["Full-Time", "Part-Time", "Contract", "Internship"];
    const empCats = ["Permanent", "Probation", "Casual"];
    const insertEmp = db.prepare(`INSERT INTO employees
      (employee_code, full_name, national_id, gender, dob, phone, email, address, emergency_contact,
       job_title, department_id, branch_id, employment_type, employment_category, date_hired, salary,
       status, bank_details, kra_pin, nssf_number, sha_number, next_of_kin)
      VALUES (@employee_code,@full_name,@national_id,@gender,@dob,@phone,@email,@address,@emergency_contact,
       @job_title,@department_id,@branch_id,@employment_type,@employment_category,@date_hired,@salary,
       @status,@bank_details,@kra_pin,@nssf_number,@sha_number,@next_of_kin)`);

    const insertPerf = db.prepare(`INSERT OR IGNORE INTO performance_evals (employee_id, year, month, score, notes, evaluated_by) VALUES (?,?,?,?,?,?)`);

    names.forEach((name, i) => {
      const gender = i % 3 === 0 ? "Female" : i % 3 === 1 ? "Male" : "Female";
      const year = 2018 + (i % 7);
      const status = i === 2 ? "On Leave" : i === 5 ? "Suspended" : i === 9 ? "Resigned" : "Active";
      const empId = insertEmp.run({
        employee_code: `NEX-${String(1000 + i)}`,
        full_name: name,
        national_id: `${30000000 + i * 137}`,
        gender,
        dob: `${1985 + (i % 15)}-0${(i % 9) + 1}-1${i % 9}`,
        phone: `+2547${String(10000000 + i * 91).slice(0, 8)}`,
        email: `${name.toLowerCase().replace(/ /g, ".")}@nexahr.com`,
        address: "P.O. Box 1000, Nairobi",
        emergency_contact: "+254700000000",
        job_title: jobTitles[i % jobTitles.length],
        department_id: deptIds[i % deptIds.length],
        branch_id: branches[i % branches.length],
        employment_type: empTypes[i % empTypes.length],
        employment_category: empCats[i % empCats.length],
        date_hired: `${year}-0${(i % 9) + 1}-15`,
        salary: 45000 + (i % 10) * 8500,
        status,
        bank_details: "Equity Bank - 0123456789",
        kra_pin: `A0${10000000 + i}Z`,
        nssf_number: `NSSF${100000 + i}`,
        sha_number: `SHA${200000 + i}`,
        next_of_kin: "Spouse / Parent",
      }).lastInsertRowid as number;

      // seed 12 months of performance for current year + partial previous year
      const now = new Date();
      for (let m = 1; m <= 12; m++) {
        const score = Math.round((5 + Math.sin(i + m) * 2 + (m / 12) * 2) * 10) / 10;
        insertPerf.run(empId, now.getFullYear() - 1, m, Math.min(10, Math.max(1, score)), null, "Jane HR");
      }
      for (let m = 1; m <= now.getMonth() + 1; m++) {
        const score = Math.round((6 + Math.sin(i + m + 1) * 2.2 + (m / 12) * 1.5) * 10) / 10;
        insertPerf.run(empId, now.getFullYear(), m, Math.min(10, Math.max(1, score)), null, "Jane HR");
      }
    });
    console.log(`Seeded ${names.length} employees with performance history.`);
  }
}

run();
