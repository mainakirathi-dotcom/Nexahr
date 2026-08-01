import { useEffect, useState } from "react";
import api from "../api/client";
import Layout from "../components/Layout";
import { useOrg } from "../context/OrgContext";

export default function Settings() {
  const { isPlatformAdmin, activeOrgName } = useOrg();
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newBranch, setNewBranch] = useState("");
  const [newBranchLoc, setNewBranchLoc] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newDeptBranch, setNewDeptBranch] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [backingUp, setBackingUp] = useState(false);

  async function loadAll() {
    const [b, d, u] = await Promise.all([
      api.get("/org/branches"), api.get("/org/departments"), api.get("/users"),
    ]);
    setBranches(b.data); setDepartments(d.data); setUsers(u.data);
  }

  useEffect(() => { loadAll(); }, []);

  async function addBranch() {
    if (!newBranch.trim()) return;
    await api.post("/org/branches", { name: newBranch, location: newBranchLoc });
    setNewBranch(""); setNewBranchLoc(""); loadAll();
  }
  async function addDept() {
    if (!newDept.trim()) return;
    await api.post("/org/departments", { name: newDept, branch_id: newDeptBranch || null });
    setNewDept(""); setNewDeptBranch(""); loadAll();
  }
  async function addUser() {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    await api.post("/users", { ...newUser, role: "hr_manager" });
    setNewUser({ name: "", email: "", password: "" }); loadAll();
  }
  async function removeBranch(id: number) { await api.delete(`/org/branches/${id}`); loadAll(); }
  async function removeDept(id: number) { await api.delete(`/org/departments/${id}`); loadAll(); }
  async function removeUser(id: number) { await api.delete(`/users/${id}`); loadAll(); }

  async function downloadReport(path: string) {
    const res = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    const baseName = path.split("/").pop()?.split("?")[0] || "report";
    a.href = url; a.download = `${baseName}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function downloadBackup() {
    setBackingUp(true);
    try {
      const res = await api.get("/backup/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexahr-backup-${(activeOrgName || "company").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Backup download failed. Please check your connection and try again.");
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Settings</h1>
      <p className="mt-1 text-sm text-ink-900/50">
        {isPlatformAdmin
          ? <>Configuring <span className="font-medium text-ink-900">{activeOrgName}</span> — branches, departments, HR accounts, and reports for this company only.</>
          : "Configure branches, departments, HR accounts, and reports."}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Branches */}
        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Branches</p>
          <div className="mt-3 flex gap-2">
            <input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Branch name" className="focus-ring flex-1 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <input value={newBranchLoc} onChange={(e) => setNewBranchLoc(e.target.value)} placeholder="Location" className="focus-ring w-32 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <button onClick={addBranch} className="focus-ring rounded-lg bg-ink-950 px-3 py-2 text-sm font-semibold text-sand-50 hover:opacity-90">Add</button>
          </div>
          <ul className="mt-3 divide-y divide-ink-900/5">
            {branches.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span>{b.name} <span className="text-ink-900/40">· {b.location || "—"} · {b.employee_count} employees</span></span>
                <button onClick={() => removeBranch(b.id)} className="text-xs font-medium text-red-500 hover:underline">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Departments */}
        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Departments</p>
          <div className="mt-3 flex gap-2">
            <input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Department name" className="focus-ring flex-1 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <select value={newDeptBranch} onChange={(e) => setNewDeptBranch(e.target.value)} className="focus-ring w-32 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none">
              <option value="">Branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={addDept} className="focus-ring rounded-lg bg-ink-950 px-3 py-2 text-sm font-semibold text-sand-50 hover:opacity-90">Add</button>
          </div>
          <ul className="mt-3 divide-y divide-ink-900/5">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span>{d.name} <span className="text-ink-900/40">· {d.branch_name || "—"} · {d.employee_count} employees</span></span>
                <button onClick={() => removeDept(d.id)} className="text-xs font-medium text-red-500 hover:underline">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        {/* HR Accounts */}
        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card lg:col-span-2">
          <p className="text-sm font-semibold text-ink-900">HR Accounts</p>
          <p className="text-xs text-ink-900/45">
            {isPlatformAdmin ? `Accounts that can log in and manage ${activeOrgName}'s data.` : "Accounts that can log in and manage your company's data."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Full name" className="focus-ring w-40 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="focus-ring w-48 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Temp password" type="password" className="focus-ring w-36 rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <button onClick={addUser} className="focus-ring rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-gold-400">Create HR account</button>
          </div>
          <ul className="mt-4 divide-y divide-ink-900/5">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span>{u.name} <span className="text-ink-900/40">· {u.email} · {u.role.replace("_", " ")}</span></span>
                <button onClick={() => removeUser(u.id)} className="text-xs font-medium text-red-500 hover:underline">Remove</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Full data backup */}
        <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-5 shadow-card lg:col-span-2">
          <p className="text-sm font-semibold text-ink-900">Full Data Backup</p>
          <p className="mt-1 text-xs text-ink-900/50">
            Download everything for {isPlatformAdmin ? <span className="font-medium text-ink-900">{activeOrgName}</span> : "your company"} — every
            employee record, performance review, status change, and uploaded document — as a single file
            you keep on your own computer. User passwords are never included.
          </p>
          <button
            onClick={downloadBackup}
            disabled={backingUp}
            className="focus-ring mt-3 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-sand-50 hover:opacity-90 disabled:opacity-50"
          >
            {backingUp ? "Preparing backup…" : "⬇ Download Full Backup"}
          </button>
        </div>

        {/* Reports */}
        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card lg:col-span-2">
          <p className="text-sm font-semibold text-ink-900">Downloadable Reports</p>
          <p className="text-xs text-ink-900/45">Export CSVs for offline use or import into Excel.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => downloadReport("/reports/employees")} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Employees Report</button>
            <button onClick={() => downloadReport(`/reports/performance?year=${new Date().getFullYear()}`)} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Performance Report ({new Date().getFullYear()})</button>
            <button onClick={() => downloadReport("/reports/salary-summary")} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Salary Summary</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
