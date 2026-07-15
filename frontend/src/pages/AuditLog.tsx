import { useEffect, useState } from "react";
import api from "../api/client";
import Layout from "../components/Layout";

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => { api.get("/audit-log").then((r) => setLogs(r.data)); }, []);

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Audit Log</h1>
      <p className="mt-1 text-sm text-ink-900/50">Every significant action taken across NexaHR, most recent first.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-900/5 bg-ink-950/[0.02] text-xs uppercase tracking-wide text-ink-900/45">
            <tr>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Details</th>
              <th className="px-5 py-3 font-medium">IP</th>
              <th className="px-5 py-3 font-medium">Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-ink-900/5 last:border-0">
                <td className="px-5 py-3 font-medium text-ink-900">{l.user_name}</td>
                <td className="px-5 py-3 text-ink-900/70">{l.action}</td>
                <td className="px-5 py-3 text-ink-900/50">{l.details}</td>
                <td className="px-5 py-3 text-ink-900/40">{l.ip}</td>
                <td className="px-5 py-3 whitespace-nowrap text-ink-900/40">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
