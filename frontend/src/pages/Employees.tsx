import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmployeeForm from "../components/EmployeeForm";
import type { EmployeeFormValues } from "../components/EmployeeForm";
import { useToast } from "../context/ToastContext";

const STATUSES = ["Active", "On Leave", "Suspended", "Resigned", "Dismissed", "Retired"];

export default function Employees() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (branchId) params.branch_id = branchId;
    if (deptId) params.department_id = deptId;
    if (status) params.status = status;
    const res = await api.get("/employees", { params });
    setEmployees(res.data);
    setLoading(false);
  }, [q, branchId, deptId, status]);

  useEffect(() => {
    api.get("/org/branches").then((r) => setBranches(r.data));
    api.get("/org/departments").then((r) => setDepartments(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 250);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  async function handleCreate(values: EmployeeFormValues) {
    await api.post("/employees", values);
    setShowAdd(false);
    showToast(`${values.full_name} added.`);
    fetchEmployees();
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Employees</h1>
          <p className="mt-1 text-sm text-ink-900/50">{employees.length} employee{employees.length !== 1 ? "s" : ""} found</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="focus-ring rounded-xl bg-midnight-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-midnight-400"
        >
          + Add employee
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ID, phone, job title…"
          className="focus-ring w-72 rounded-xl border border-ink-900/10 bg-white px-3.5 py-2.5 text-sm outline-none"
        />
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="focus-ring rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="focus-ring rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="focus-ring rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-900/5 bg-ink-950/[0.02] text-xs uppercase tracking-wide text-ink-900/45">
            <tr>
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">Job Title</th>
              <th className="px-5 py-3 font-medium">Branch / Dept</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Performance</th>
              <th className="px-5 py-3 font-medium">Years</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-ink-900/40">Loading employees…</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-ink-900/40">No employees match your filters.</td></tr>
            ) : employees.map((e) => (
              <tr
                key={e.id}
                onClick={() => navigate(`/employees/${e.id}`)}
                className="cursor-pointer border-b border-ink-900/5 last:border-0 hover:bg-midnight-500/5"
              >
                <td className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 font-display text-xs font-semibold text-sand-50">
                    {e.full_name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="font-medium text-ink-900">{e.full_name}</p>
                    <p className="text-xs text-ink-900/40">{e.employee_code}</p>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-900/70">{e.job_title || "—"}</td>
                <td className="px-5 py-3 text-ink-900/70">{e.branch_name || "—"} · {e.department_name || "—"}</td>
                <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-5 py-3">
                  {e.performance_index !== null ? (
                    <span className={`font-semibold ${e.performance_index >= 7 ? "text-teal-600" : e.performance_index >= 5 ? "text-midnight-600" : "text-red-500"}`}>
                      {e.performance_index}/10
                    </span>
                  ) : <span className="text-ink-900/30">No reviews</span>}
                </td>
                <td className="px-5 py-3 text-ink-900/70">{e.years_worked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add new employee" wide>
        <EmployeeForm branches={branches} departments={departments} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} submitLabel="Add employee" />
      </Modal>
    </Layout>
  );
}
