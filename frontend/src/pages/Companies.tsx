import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Modal from "../components/Modal";

export default function Companies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, loadingOrganizations, refreshOrganizations, setActiveOrg } = useOrg();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function enterCompany(id: number, name: string) {
    setActiveOrg(id, name);
    navigate("/");
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await api.delete(`/organizations/${confirmDelete.id}`);
    setConfirmDelete(null);
    refreshOrganizations();
  }

  function startRename(id: number, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  async function saveRename(id: number) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    await api.put(`/organizations/${id}`, { name: renameValue.trim() });
    setRenamingId(null);
    refreshOrganizations();
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Client Companies</h1>
          <p className="mt-1 text-sm text-ink-900/50">
            Signed in as <span className="font-medium text-ink-900">{user?.name}</span> — Platform Super Admin.
            Pick a company to manage its HR system, or onboard a new one.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="focus-ring rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-gold-400"
        >
          + Onboard new company
        </button>
      </div>

      {loadingOrganizations ? (
        <p className="mt-6 text-sm text-ink-900/50">Loading companies…</p>
      ) : organizations.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-900/15 bg-white p-10 text-center">
          <p className="text-sm text-ink-900/60">No client companies yet.</p>
          <button onClick={() => setShowAdd(true)} className="focus-ring mt-3 rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-sand-50 hover:opacity-90">
            Onboard your first company
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <div key={org.id} className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
              {renamingId === org.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(org.id); if (e.key === "Escape") setRenamingId(null); }}
                    className="focus-ring w-full rounded-lg border border-ink-900/10 px-2 py-1 font-display text-lg font-semibold outline-none"
                  />
                  <button onClick={() => saveRename(org.id)} className="focus-ring rounded-lg bg-ink-950 px-2 py-1 text-xs font-semibold text-sand-50">Save</button>
                </div>
              ) : (
                <button onClick={() => startRename(org.id, org.name)} className="group flex items-center gap-1.5 text-left">
                  <p className="font-display text-lg font-semibold text-ink-900">{org.name}</p>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 text-ink-900/0 group-hover:text-ink-900/40">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-display text-xl font-semibold text-ink-900">{org.employee_count}</p>
                  <p className="text-[11px] uppercase text-ink-900/40">Employees</p>
                </div>
                <div>
                  <p className="font-display text-xl font-semibold text-ink-900">{org.hr_count}</p>
                  <p className="text-[11px] uppercase text-ink-900/40">HR Accounts</p>
                </div>
                <div>
                  <p className="font-display text-xl font-semibold text-ink-900">{org.branch_count}</p>
                  <p className="text-[11px] uppercase text-ink-900/40">Branches</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => enterCompany(org.id, org.name)}
                  className="focus-ring flex-1 rounded-lg bg-ink-950 px-3 py-2 text-sm font-semibold text-sand-50 hover:opacity-90"
                >
                  Manage this company
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: org.id, name: org.name })}
                  className="focus-ring rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddCompanyModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(id, name) => { setShowAdd(false); refreshOrganizations(); enterCompany(id, name); }}
      />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete this company?">
        <div className="space-y-4">
          <p className="text-sm text-ink-900/70">
            This permanently deletes <span className="font-semibold text-ink-900">{confirmDelete?.name}</span> and every
            piece of data that belongs to it — employees, performance history, documents, HR accounts, everything.
            This cannot be undone. Consider downloading a backup for this company first.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Cancel</button>
            <button onClick={handleDelete} className="focus-ring rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Yes, delete permanently</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

function AddCompanyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number, name: string) => void }) {
  const [companyName, setCompanyName] = useState("");
  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrPassword, setHrPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!companyName.trim()) { setError("Company name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const orgRes = await api.post("/organizations", { name: companyName.trim() });
      const orgId = orgRes.data.id;

      if (hrName.trim() && hrEmail.trim() && hrPassword.trim()) {
        await api.post(`/users?organization_id=${orgId}`, {
          name: hrName.trim(), email: hrEmail.trim(), password: hrPassword, role: "hr_manager",
        });
      }

      setCompanyName(""); setHrName(""); setHrEmail(""); setHrPassword("");
      onCreated(orgId, companyName.trim());
    } catch (e: any) {
      setError(e.response?.data?.error || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Onboard a new company">
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <label className="block">
          <span className="text-xs font-medium text-ink-900/60">Company name *</span>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Coca-Cola Kenya" className="focus-ring mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
        </label>

        <div className="border-t border-ink-900/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">First HR account (optional — you can add this later)</p>
          <div className="mt-2 space-y-3">
            <input value={hrName} onChange={(e) => setHrName(e.target.value)} placeholder="Contact's full name" className="focus-ring w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <input value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} placeholder="Their email address" className="focus-ring w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
            <input value={hrPassword} onChange={(e) => setHrPassword(e.target.value)} type="password" placeholder="Temporary password" className="focus-ring w-full rounded-lg border border-ink-900/10 px-3 py-2 text-sm outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-900/10 pt-4">
          <button onClick={onClose} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="focus-ring rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-sand-50 hover:opacity-90 disabled:opacity-50">
            {saving ? "Creating…" : "Create company"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
