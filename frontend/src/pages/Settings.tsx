import { useEffect, useState } from "react";
import api from "../api/client";
import Layout from "../components/Layout";
import { useOrg } from "../context/OrgContext";
import { useToast } from "../context/ToastContext";

function errMsg(e: any, fallback: string) {
  return e?.response?.data?.error || fallback;
}

export default function Settings() {
  const { isPlatformAdmin, activeOrgName } = useOrg();
  const { showToast } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newBranch, setNewBranch] = useState("");
  const [newBranchLoc, setNewBranchLoc] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newDeptBranch, setNewDeptBranch] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [backingUp, setBackingUp] = useState(false);
  const [renamingBranchId, setRenamingBranchId] = useState<number | null>(null);
  const [renameBranchValue, setRenameBranchValue] = useState("");
  const [renamingDeptId, setRenamingDeptId] = useState<number | null>(null);
  const [renameDeptValue, setRenameDeptValue] = useState("");

  async function loadAll() {
    const [b, d, u] = await Promise.all([
      api.get("/org/branches"), api.get("/org/departments"), api.get("/users"),
    ]);
    setBranches(b.data); setDepartments(d.data); setUsers(u.data);
  }

  useEffect(() => { loadAll(); }, []);

  async function addBranch() {
    if (!newBranch.trim()) return;
    try {
      await api.post("/org/branches", { name: newBranch, location: newBranchLoc });
      setNewBranch(""); setNewBranchLoc("");
      showToast(`"${newBranch}" branch added.`);
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, "Couldn't add that branch."), "error");
    }
  }

  async function addDept() {
    if (!newDept.trim()) return;
    try {
      await api.post("/org/departments", { name: newDept, branch_id: newDeptBranch || null });
      setNewDept(""); setNewDeptBranch("");
      showToast(`"${newDept}" department added.`);
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, "Couldn't add that department."), "error");
    }
  }

  async function addUser() {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    try {
      await api.post("/users", { ...newUser, role: "hr_manager" });
      showToast(`HR account created for ${newUser.name}.`);
      setNewUser({ name: "", email: "", password: "" });
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, "Couldn't create that HR account."), "error");
    }
  }

  async function removeBranch(id: number, name: string) {
    try {
      await api.delete(`/org/branches/${id}`);
      showToast(`"${name}" branch removed.`);
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, `Couldn't remove "${name}". It may still have employees assigned to it.`), "error");
    }
  }

  function startRenameBranch(id: number, currentName: string) {
    setRenamingBranchId(id);
    setRenameBranchValue(currentName);
  }

  async function saveRenameBranch(id: number, location: string | null) {
    if (!renameBranchValue.trim()) { setRenamingBranchId(null); return; }
    try {
      await api.put(`/org/branches/${id}`, { name: renameBranchValue.trim(), location });
      setRenamingBranchId(null);
      showToast("Branch renamed.");
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, "Couldn't rename that branch."), "error");
    }
  }

  function startRenameDept(id: number, currentName: string) {
    setRenamingDeptId(id);
    setRenameDeptValue(currentName);
  }

  async function saveRenameDept(id: number, branchId: number | null) {
    if (!renameDeptValue.trim()) { setRenamingDeptId(null); return; }
    try {
      await api.put(`/org/departments/${id}`, { name: renameDeptValue.trim(), branch_id: branchId });
      setRenamingDeptId(null);
      showToast("Department renamed.");
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, "Couldn't rename that department."), "error");
    }
  }

  async function removeDept(id: number, name: string) {
    try {
      await api.delete(`/org/departments/${id}`);
      showToast(`"${name}" department removed.`);
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, `Couldn't remove "${name}".`), "error");
    }
  }

  async function removeUser(id: number, name: string) {
    try {
      await api.delete(`/users/${id}`);
      showToast(`${name}'s access has been removed.`);
      loadAll();
    } catch (e: any) {
      showToast(errMsg(e, `Couldn't remove ${name}.`), "error");
    }
  }

  async function downloadReport(path: string) {
    try {
      const res = await api.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const baseName = path.split("/").pop()?.split("?")[0] || "report";
      a.href = url; a.download = `${baseName}.csv`;
      a.click(); URL.revokeObjectURL(url);
      showToast("Report downloaded.");
    } catch {
      showToast("Report download failed. Please check your connection and try again.", "error");
    }
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
      showToast("Backup downloaded.");
    } catch {
      showToast("Backup download failed. Please check your connection and try again.", "error");
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
          {branches.length === 0 ? (
            <p className="mt-3 text-sm text-ink-900/40">No branches yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-900/5">
              {branches.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  {renamingBranchId === b.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        value={renameBranchValue}
                        onChange={(e) => setRenameBranchValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRenameBranch(b.id, b.location); if (e.key === "Escape") setRenamingBranchId(null); }}
                        className="focus-ring w-full rounded-lg border border-ink-900/10 px-2 py-1 text-sm outline-none"
                      />
                      <button onClick={() => saveRenameBranch(b.id, b.location)} className="focus-ring shrink-0 rounded-lg bg-ink-950 px-2 py-1 text-xs font-semibold text-sand-50">Save</button>
                      <button onClick={() => setRenamingBranchId(null)} className="shrink-0 text-xs font-medium text-ink-900/40 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => startRenameBranch(b.id, b.name)} className="group flex-1 text-left hover:underline">
                        {b.name} <span className="text-ink-900/40">· {b.location || "—"} · {b.employee_count} employees</span>
                      </button>
                      <button onClick={() => removeBranch(b.id, b.name)} className="shrink-0 text-xs font-medium text-red-500 hover:underline">Remove</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
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
          {departments.length === 0 ? (
            <p className="mt-3 text-sm text-ink-900/40">No departments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-900/5">
              {departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  {renamingDeptId === d.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        value={renameDeptValue}
                        onChange={(e) => setRenameDeptValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRenameDept(d.id, d.branch_id); if (e.key === "Escape") setRenamingDeptId(null); }}
                        className="focus-ring w-full rounded-lg border border-ink-900/10 px-2 py-1 text-sm outline-none"
                      />
                      <button onClick={() => saveRenameDept(d.id, d.branch_id)} className="focus-ring shrink-0 rounded-lg bg-ink-950 px-2 py-1 text-xs font-semibold text-sand-50">Save</button>
                      <button onClick={() => setRenamingDeptId(null)} className="shrink-0 text-xs font-medium text-ink-900/40 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => startRenameDept(d.id, d.name)} className="group flex-1 text-left hover:underline">
                        {d.name} <span className="text-ink-900/40">· {d.branch_name || "—"} · {d.employee_count} employees</span>
                      </button>
                      <button onClick={() => removeDept(d.id, d.name)} className="shrink-0 text-xs font-medium text-red-500 hover:underline">Remove</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
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
            <button onClick={addUser} className="focus-ring rounded-lg bg-midnight-500 px-4 py-2 text-sm font-semibold text-white hover:bg-midnight-400">Create HR account</button>
          </div>
          {users.length === 0 ? (
            <p className="mt-4 text-sm text-ink-900/40">No HR accounts yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-900/5">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{u.name} <span className="text-ink-900/40">· {u.email} · {u.role.replace("_", " ")}</span></span>
                  <button onClick={() => removeUser(u.id, u.name)} className="text-xs font-medium text-red-500 hover:underline">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Full data backup */}
        <div className="rounded-2xl border border-midnight-500/30 bg-midnight-500/5 p-5 shadow-card lg:col-span-2">
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
