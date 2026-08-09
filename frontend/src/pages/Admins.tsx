import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Modal from "../components/Modal";

interface Admin {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export default function Admins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Admin | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get<Admin[]>("/admins");
    setAdmins(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    if (!confirmDelete) return;
    setError(null);
    try {
      await api.delete(`/admins/${confirmDelete.id}`);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || "Something went wrong");
      setConfirmDelete(null);
    }
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Administrators</h1>
      <p className="mt-1 text-sm text-ink-900/50">
        Everyone with full Platform Super Admin access — able to see and manage every client company.
        {" "}{admins.length} admin{admins.length !== 1 ? "s" : ""} total.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-6 rounded-2xl border border-midnight-100 bg-white shadow-card">
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-ink-900/40">Loading administrators…</p>
        ) : (
          <div className="divide-y divide-ink-900/5">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-midnight-500 font-display text-sm font-semibold text-white">
                    {a.name[0]}
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                      {a.name}
                      {a.id === user?.id && (
                        <span className="rounded-full bg-midnight-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-midnight-500">You</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-900/45">{a.email} · Added {new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {a.id !== user?.id && (
                  <button
                    onClick={() => setConfirmDelete(a)}
                    className="focus-ring rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                  >
                    Remove access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-900/40">
        New admins are created privately via <code className="rounded bg-ink-900/5 px-1 py-0.5">BOOTSTRAP_ADMIN_EMAIL</code> /{" "}
        <code className="rounded bg-ink-900/5 px-1 py-0.5">BOOTSTRAP_ADMIN_PASSWORD</code> environment variables on your
        hosting platform — never through this screen — so credentials never pass through the app itself.
      </p>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove this administrator?">
        <div className="space-y-4">
          <p className="text-sm text-ink-900/70">
            <span className="font-semibold text-ink-900">{confirmDelete?.name}</span> ({confirmDelete?.email}) will
            immediately lose all access to NexaHR — every client company, Settings, everything. This doesn't affect
            any client company's own data.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="focus-ring rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium hover:bg-ink-900/5">Cancel</button>
            <button onClick={handleDelete} className="focus-ring rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">Yes, remove access</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
