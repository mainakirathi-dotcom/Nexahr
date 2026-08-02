import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Layout from "../components/Layout";

export default function Performance() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => { api.get("/performance/rankings").then((r) => setData(r.data)); }, []);

  if (!data) return <Layout><p className="text-sm text-ink-900/50">Loading performance rankings…</p></Layout>;

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Performance</h1>
      <p className="mt-1 text-sm text-ink-900/50">Company-wide leaderboards and department/branch rankings.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RankList title="🏆 Best Performing" people={data.best} navigate={navigate} />
        <RankList title="📈 Most Improved" people={data.mostImproved} navigate={navigate} showDelta />
        <RankList title="⚠️ Needs Attention" people={data.lowest} navigate={navigate} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankTable title="Department Ranking" rows={data.deptRanking} />
        <RankTable title="Branch Ranking" rows={data.branchRanking} />
      </div>
    </Layout>
  );
}

function RankList({ title, people, navigate, showDelta }: { title: string; people: any[]; navigate: any; showDelta?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {people.length === 0 ? (
        <p className="mt-3 text-sm text-ink-900/40">Not enough data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {people.map((p) => (
            <li key={p.id} onClick={() => navigate(`/employees/${p.id}`)} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-midnight-500/5">
              <div>
                <p className="font-medium text-ink-900">{p.full_name}</p>
                <p className="text-xs text-ink-900/40">{p.department_name || "—"} · {p.branch_name || "—"}</p>
              </div>
              <span className="font-display font-semibold text-midnight-600">
                {showDelta ? `${p.delta > 0 ? "+" : ""}${p.delta}` : `${Math.round(p.avg_score * 10) / 10}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RankTable({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.map((r: any, i: number) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="w-5 text-xs text-ink-900/40">{i + 1}</span>
            <span className="flex-1 text-sm text-ink-900">{r.name}</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-900/5">
              <div className="h-full bg-teal-500" style={{ width: `${(r.avg_score / 10) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-xs font-semibold text-ink-900/70">{Math.round(r.avg_score * 10) / 10}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
