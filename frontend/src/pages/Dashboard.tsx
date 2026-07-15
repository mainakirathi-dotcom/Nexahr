import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "../api/client";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";

const PIE_COLORS = ["#D9A441", "#279E88", "#2C4270", "#B9862C", "#3FBFA6", "#203150"];

interface DashboardData {
  totals: Record<string, number>;
  birthdaysToday: any[];
  genderDist: { gender: string; c: number }[];
  branchDist: { name: string; c: number }[];
  deptDist: { name: string; c: number }[];
  statusDist: { status: string; c: number }[];
  salaryBuckets: { bucket: string; c: number }[];
  hiringTrend: { ym: string; c: number }[];
  employeeGrowth: { ym: string; total: number }[];
  perfTrend: { year: number; month: number; avg_score: number }[];
  recentActivity: { user_name: string; action: string; details: string; created_at: string }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [insight, setInsight] = useState<string[]>([]);

  useEffect(() => {
    api.get("/dashboard/stats").then((res) => setData(res.data));
    api.get("/ai/summary").then((res) => setInsight(res.data.insights));
  }, []);

  if (!data) return <Layout><p className="text-sm text-ink-900/50">Loading dashboard…</p></Layout>;

  const t = data.totals;
  const perfTrendData = data.perfTrend.map((p) => ({ label: `${p.year}-${String(p.month).padStart(2, "0")}`, score: Math.round(p.avg_score * 10) / 10 }));

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-900/50">Workforce overview across all branches.</p>
        </div>
      </div>

      {insight.length > 0 && (
        <div className="mt-5 rounded-2xl border border-gold-500/30 bg-gold-500/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">AI insight</p>
          <p className="mt-1 text-sm text-ink-900/80">{insight.join(" ")}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Employees" value={t.total} accent="ink" />
        <StatCard label="Active" value={t.active} accent="teal" />
        <StatCard label="On Leave" value={t.onLeave} accent="gold" />
        <StatCard label="Suspended" value={t.suspended} accent="gold" />
        <StatCard label="Resigned" value={t.resigned} accent="ink" />
        <StatCard label="Dismissed" value={t.dismissed} accent="ink" />
        <StatCard label="Retired" value={t.retired} accent="ink" />
        <StatCard label="Added This Month" value={t.addedThisMonth} accent="teal" sub={`${t.branches} branches · ${t.departments} depts`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Performance Trend</p>
          <p className="text-xs text-ink-900/45">Average monthly evaluation score, company-wide</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={perfTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#D9A441" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Employee Growth</p>
          <p className="text-xs text-ink-900/45">Cumulative headcount by hire month</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.employeeGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
              <XAxis dataKey="ym" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.employeeGrowth.length / 6))} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#279E88" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Branch Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.branchDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="c" fill="#2C4270" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Department Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.deptDist} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="c" fill="#D9A441" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Gender Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.genderDist} dataKey="c" nameKey="gender" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {data.genderDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Salary Distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.salaryBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DB" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="c" fill="#3FBFA6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">🎂 Birthdays Today</p>
          {data.birthdaysToday.length === 0 ? (
            <p className="mt-3 text-sm text-ink-900/40">No birthdays today.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.birthdaysToday.map((b: any) => (
                <li key={b.id} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/15 font-display text-xs font-semibold text-gold-600">
                    {b.full_name[0]}
                  </span>
                  {b.full_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-ink-900">Recent HR Activity</p>
          <ul className="mt-3 space-y-3">
            {data.recentActivity.map((a, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-ink-900">{a.action}</p>
                  <p className="text-xs text-ink-900/45">{a.details} · {a.user_name}</p>
                </div>
                <p className="whitespace-nowrap text-xs text-ink-900/35">{new Date(a.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
