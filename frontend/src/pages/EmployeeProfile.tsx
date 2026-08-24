import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import api from "../api/client";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmployeeForm from "../components/EmployeeForm";
import type { EmployeeFormValues } from "../components/EmployeeForm";
import { useAuth } from "../context/AuthContext";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TABS = ["Overview", "Performance", "Documents", "Career History"] as const;

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [perf, setPerf] = useState<{ evaluations: any[]; stats: any } | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showEval, setShowEval] = useState(false);

  const load = useCallback(async () => {
    const [e, p, d, h] = await Promise.all([
      api.get(`/employees/${id}`),
      api.get(`/performance/employee/${id}`),
      api.get(`/documents/employee/${id}`),
      api.get(`/employees/${id}/history`),
    ]);
    setEmployee(e.data);
    setPerf(p.data);
    setDocs(d.data);
    setHistory(h.data);
  }, [id]);

  useEffect(() => {
    api.get("/org/branches").then((r) => setBranches(r.data));
    api.get("/org/departments").then((r) => setDepartments(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!employee) return <Layout><p className="text-sm text-ink-900/50">Loading profile…</p></Layout>;

  const canEdit = user?.role === "super_admin" || user?.role === "hr_manager";
  const lineData = (perf?.evaluations || []).map((e) => ({ label: `${MONTHS[e.month - 1]} '${String(e.year).slice(2)}`, score: e.score }));
  const currentYear = new Date().getFullYear();
  const radarData = (perf?.evaluations || [])
    .filter((e) => e.year === currentYear)
    .map((e) => ({ month: MONTHS[e.month - 1], score: e.score }));

  async function handleEdit(values: EmployeeFormValues) {
    await api.put(`/employees/${id}`, values);
    setShowEdit(false);
    load();
  }

  async function handleStatusChange(status: string, reason: string) {
    await api.post(`/employees/${id}/status`, { status, reason });
    setShowStatus(false);
    load();
  }

  async function handleEval(year: number, month: number, score: number, notes: string) {
    await api.post(`/performance/employee/${id}`, { year, month, score, notes });
    setShowEval(false);
    load();
  }

  return (
    <Layout>
      <button onClick={() => navigate("/employees")} className="focus-ring flex items-center gap-1.5 text-sm text-ink-900/50 hover:text-ink-900">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
        Back to employees
      </button>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Employee digital card */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl bg-ink-950 text-sand-50 shadow-card">
            <div className="bg-gradient-to-br from-ink-900 to-ink-950 p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold tracking-wide">NexaHR ID</span>
                <StatusBadge status={employee.status} />
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-midnight-500 font-display text-xl font-bold text-white">
                  {employee.full_name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{employee.full_name}</p>
                  <p className="text-xs text-sand-50/50">{employee.job_title || "—"}</p>
                  <p className="text-xs text-sand-50/40">{employee.employee_code}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-white/5 p-5 text-sm">
              <div><p className="text-[11px] uppercase text-sand-50/40">Department</p><p>{employee.department_name || "—"}</p></div>
              <div><p className="text-[11px] uppercase text-sand-50/40">Branch</p><p>{employee.branch_name || "—"}</p></div>
              <div><p className="text-[11px] uppercase text-sand-50/40">Years worked</p><p>{employee.years_worked}</p></div>
              <div><p className="text-[11px] uppercase text-sand-50/40">Performance</p><p>{employee.performance_index ?? "—"}/10</p></div>
              <div className="col-span-2"><p className="text-[11px] uppercase text-sand-50/40">Salary</p><p>KES {Number(employee.salary).toLocaleString()}</p></div>
            </div>
            <div className="flex items-center justify-between bg-white p-4">
              <div className="text-ink-900">
                <p className="text-[11px] uppercase text-ink-900/40">Scan for profile</p>
                <p className="text-xs text-ink-900/50">ID {employee.employee_code}</p>
              </div>
              <QRCodeSVG value={`NEXAHR-EMPLOYEE:${employee.employee_code}`} size={64} bgColor="#ffffff" fgColor="#101B2E" />
            </div>
          </div>

          {canEdit && (
            <div className="mt-4 space-y-2">
              <button onClick={() => setShowEdit(true)} className="focus-ring w-full rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-ink-900/5">
                Edit profile
              </button>
              <button onClick={() => setShowEval(true)} className="focus-ring w-full rounded-xl bg-midnight-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-midnight-400">
                Record monthly evaluation
              </button>
              <button onClick={() => setShowStatus(true)} className="focus-ring w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100">
                Change employment status
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex gap-1 border-b border-ink-900/10">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`focus-ring -mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === t ? "border-midnight-500 text-ink-900" : "border-transparent text-ink-900/45 hover:text-ink-900"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Overview" && (
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-ink-900/5 bg-white p-6 text-sm shadow-card">
              <Info label="National ID" value={employee.national_id} />
              <Info label="Gender" value={employee.gender} />
              <Info label="Date of birth" value={employee.dob} />
              <Info label="Phone" value={employee.phone} />
              <Info label="Email" value={employee.email} />
              <Info label="Address" value={employee.address} />
              <Info label="Emergency contact" value={employee.emergency_contact} />
              <Info label="Employment type" value={employee.employment_type} />
              <Info label="Employment category" value={employee.employment_category} />
              <Info label="Date hired" value={employee.date_hired} />
              <Info label="Bank details" value={employee.bank_details} />
              <Info label="KRA PIN" value={employee.kra_pin} />
              <Info label="NSSF number" value={employee.nssf_number} />
              <Info label="SHA/NHIF number" value={employee.sha_number} />
              <Info label="Next of kin" value={employee.next_of_kin} />
            </div>
          )}

          {tab === "Performance" && (
            <div className="mt-5 space-y-4">
              {perf?.stats && (
                <div className="grid grid-cols-4 gap-3">
                  <MiniStat label="Annual Avg" value={perf.stats.annual_average} />
                  <MiniStat label="Highest" value={perf.stats.highest_score} />
                  <MiniStat label="Lowest" value={perf.stats.lowest_score} />
                  <MiniStat label="Trend" value={perf.stats.trend} isText />
                </div>
              )}
              {perf?.stats?.improvement_percentage !== null && perf?.stats && (
                <p className="rounded-xl bg-teal-500/10 px-4 py-2.5 text-sm text-teal-700">
                  Performance {perf.stats.improvement_percentage! >= 0 ? "improved" : "declined"} by {Math.abs(perf.stats.improvement_percentage)}% vs. last year.
                </p>
              )}
              <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
                <p className="text-sm font-semibold text-ink-900">Monthly Evaluation History</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#4C1D95" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
                  <p className="text-sm font-semibold text-ink-900">Score by Month (Bar)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#2C4270" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
                  <p className="text-sm font-semibold text-ink-900">This Year (Radar)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#EDE8DB" />
                      <PolarAngleAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 8 }} />
                      <Radar dataKey="score" stroke="#279E88" fill="#279E88" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === "Documents" && <DocumentsPanel employeeId={id!} docs={docs} canEdit={canEdit} onChange={load} />}

          {tab === "Career History" && (
            <div className="mt-5 space-y-3">
              {history.length === 0 && <p className="text-sm text-ink-900/40">No status changes recorded yet.</p>}
              {history.map((h) => (
                <div key={h.id} className="rounded-xl border border-ink-900/5 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-ink-900/40">{h.effective_date}</span>
                  </div>
                  {h.reason && <p className="mt-2 text-sm text-ink-900/70">{h.reason}</p>}
                  <p className="mt-1 text-xs text-ink-900/40">Recorded by {h.hr_officer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit employee" wide>
        <EmployeeForm
          initial={{
            full_name: employee.full_name, national_id: employee.national_id || "", gender: employee.gender || "",
            dob: employee.dob || "", phone: employee.phone || "", email: employee.email || "", address: employee.address || "",
            emergency_contact: employee.emergency_contact || "", job_title: employee.job_title || "",
            department: employee.department_name || "", branch: employee.branch_name || "",
            employment_type: employee.employment_type || "Full-Time", employment_category: employee.employment_category || "Permanent",
            date_hired: employee.date_hired || "", salary: String(employee.salary || ""), bank_details: employee.bank_details || "",
            kra_pin: employee.kra_pin || "", nssf_number: employee.nssf_number || "", sha_number: employee.sha_number || "",
            next_of_kin: employee.next_of_kin || "",
          }}
          branches={branches}
          departments={departments}
          onSubmit={handleEdit}
          onCancel={() => setShowEdit(false)}
          submitLabel="Save changes"
        />
      </Modal>

      <StatusChangeModal open={showStatus} onClose={() => setShowStatus(false)} onSubmit={handleStatusChange} />
      <EvaluationModal open={showEval} onClose={() => setShowEval(false)} onSubmit={handleEval} />
    </Layout>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-900/40">{label}</p>
      <p className="mt-0.5 text-ink-900">{value || "—"}</p>
    </div>
  );
}

function MiniStat({ label, value, isText }: { label: string; value: any; isText?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-900/5 bg-white p-4 text-center shadow-card">
      <p className="text-[11px] uppercase text-ink-900/40">{label}</p>
      <p className={`mt-1 font-display font-semibold ${isText ? "text-base" : "text-2xl"} text-ink-900`}>{value}</p>
    </div>
  );
}

function StatusChangeModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (s: string, r: string) => Promise<void> }) {
  const [status, setStatus] = useState("On Leave");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Change employment status">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-900/60">New status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none">
            {["Active", "On Leave", "Suspended", "Resigned", "Dismissed", "Retired"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-900/60">Reason</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="focus-ring mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Cancel</button>
          <button
            disabled={saving}
            onClick={async () => { setSaving(true); await onSubmit(status, reason); setSaving(false); }}
            className="focus-ring rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-sand-50 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Confirm change"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EvaluationModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (y: number, m: number, s: number, n: string) => Promise<void> }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [score, setScore] = useState(7);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Record monthly evaluation">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink-900/60">Year</span>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="focus-ring mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink-900/60">Month</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="focus-ring mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-ink-900/60">Score (1–10): {score}</span>
          <input type="range" min={1} max={10} step={0.5} value={score} onChange={(e) => setScore(Number(e.target.value))} className="mt-2 w-full accent-midnight-500" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-900/60">Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="focus-ring mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Cancel</button>
          <button
            disabled={saving}
            onClick={async () => { setSaving(true); await onSubmit(year, month, score, notes); setSaving(false); }}
            className="focus-ring rounded-lg bg-midnight-500 px-4 py-2 text-sm font-semibold text-white hover:bg-midnight-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save evaluation"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DocumentsPanel({ employeeId, docs, canEdit, onChange }: { employeeId: string; docs: any[]; canEdit: boolean; onChange: () => void }) {
  const [docType, setDocType] = useState("CV");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("doc_type", docType);
    await api.post(`/documents/employee/${employeeId}`, form, { headers: { "Content-Type": "multipart/form-data" } });
    setFile(null);
    setUploading(false);
    onChange();
  }

  async function handleDelete(id: number) {
    await api.delete(`/documents/${id}`);
    onChange();
  }

  // The file lives in Postgres behind the same JWT auth as every other request, so a
  // plain <a href> won't work (the browser wouldn't send the Authorization header).
  // Instead we fetch it as a blob, then open that in a new tab.
  async function handleView(doc: any) {
    setOpeningId(doc.id);
    try {
      const res = await api.get(`/documents/${doc.id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-900/5 bg-white p-4 shadow-card">
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="focus-ring rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none">
            {["Employment Contract", "CV", "Academic Certificate", "National ID Copy", "Warning Letter", "Promotion Letter", "Transfer Letter", "Termination Letter", "Other"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          <button onClick={handleUpload} disabled={!file || uploading} className="focus-ring rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-sand-50 hover:opacity-90 disabled:opacity-40">
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      )}
      {docs.length === 0 ? (
        <p className="text-sm text-ink-900/40">No documents uploaded yet.</p>
      ) : (
        <div className="divide-y divide-ink-900/5 overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-card">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-ink-900">{d.original_name}</p>
                <p className="text-xs text-ink-900/40">{d.doc_type} · {new Date(d.uploaded_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleView(d)} disabled={openingId === d.id} className="text-xs font-medium text-teal-600 hover:underline disabled:opacity-50">
                  {openingId === d.id ? "Opening…" : "View"}
                </button>
                {canEdit && <button onClick={() => handleDelete(d.id)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
