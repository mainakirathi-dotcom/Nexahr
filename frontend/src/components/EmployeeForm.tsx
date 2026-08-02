import { useState } from "react";
import type { FormEvent } from "react";

export interface EmployeeFormValues {
  full_name: string;
  national_id: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact: string;
  job_title: string;
  department_id: string;
  branch: string;
  employment_type: string;
  employment_category: string;
  date_hired: string;
  salary: string;
  bank_details: string;
  kra_pin: string;
  nssf_number: string;
  sha_number: string;
  next_of_kin: string;
}

const EMPTY: EmployeeFormValues = {
  full_name: "", national_id: "", gender: "", dob: "", phone: "", email: "", address: "",
  emergency_contact: "", job_title: "", department_id: "", branch: "", employment_type: "Full-Time",
  employment_category: "Permanent", date_hired: "", salary: "", bank_details: "", kra_pin: "",
  nssf_number: "", sha_number: "", next_of_kin: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-900/60">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "focus-ring mt-1 w-full rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm outline-none";

export default function EmployeeForm({
  initial, branches, departments, onSubmit, onCancel, submitLabel = "Save employee",
}: {
  initial?: Partial<EmployeeFormValues>;
  branches: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<EmployeeFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EmployeeFormValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.full_name.trim()) { setError("Full name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-midnight-600">Personal Information</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="Full name *"><input className={inputCls} value={values.full_name} onChange={(e) => set("full_name", e.target.value)} required /></Field>
          <Field label="National ID"><input className={inputCls} value={values.national_id} onChange={(e) => set("national_id", e.target.value)} /></Field>
          <Field label="Gender">
            <select className={inputCls} value={values.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Date of birth"><input type="date" className={inputCls} value={values.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label="Phone number"><input className={inputCls} value={values.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email address"><input type="email" className={inputCls} value={values.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Physical address"><input className={inputCls} value={values.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Emergency contact"><input className={inputCls} value={values.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} /></Field>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-midnight-600">Employment Information</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="Job title"><input className={inputCls} value={values.job_title} onChange={(e) => set("job_title", e.target.value)} /></Field>
          <Field label="Branch">
            <input
              className={inputCls}
              list="branch-options"
              value={values.branch}
              onChange={(e) => set("branch", e.target.value)}
              placeholder="Pick an existing branch or type a new one"
            />
            <datalist id="branch-options">
              {branches.map((b) => <option key={b.id} value={b.name} />)}
            </datalist>
          </Field>
          <Field label="Department">
            <select className={inputCls} value={values.department_id} onChange={(e) => set("department_id", e.target.value)}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Employment type">
            <select className={inputCls} value={values.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
              <option>Full-Time</option><option>Part-Time</option><option>Contract</option><option>Internship</option>
            </select>
          </Field>
          <Field label="Employment category">
            <select className={inputCls} value={values.employment_category} onChange={(e) => set("employment_category", e.target.value)}>
              <option>Permanent</option><option>Probation</option><option>Casual</option>
            </select>
          </Field>
          <Field label="Date hired"><input type="date" className={inputCls} value={values.date_hired} onChange={(e) => set("date_hired", e.target.value)} /></Field>
          <Field label="Salary (KES)"><input type="number" min="0" className={inputCls} value={values.salary} onChange={(e) => set("salary", e.target.value)} /></Field>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-midnight-600">Additional Information</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field label="Bank details"><input className={inputCls} value={values.bank_details} onChange={(e) => set("bank_details", e.target.value)} /></Field>
          <Field label="KRA PIN"><input className={inputCls} value={values.kra_pin} onChange={(e) => set("kra_pin", e.target.value)} /></Field>
          <Field label="NSSF number"><input className={inputCls} value={values.nssf_number} onChange={(e) => set("nssf_number", e.target.value)} /></Field>
          <Field label="SHA/NHIF number"><input className={inputCls} value={values.sha_number} onChange={(e) => set("sha_number", e.target.value)} /></Field>
          <Field label="Next of kin"><input className={inputCls} value={values.next_of_kin} onChange={(e) => set("next_of_kin", e.target.value)} /></Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-ink-900/10 pt-4">
        <button type="button" onClick={onCancel} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-900/70 hover:bg-ink-900/5">Cancel</button>
        <button type="submit" disabled={saving} className="focus-ring rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-sand-50 hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
