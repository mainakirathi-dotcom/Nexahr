interface StatCardProps {
  label: string;
  value: string | number;
  accent?: "gold" | "teal" | "ink";
  sub?: string;
}

const ACCENTS = {
  gold: "text-midnight-600 bg-midnight-500/10",
  teal: "text-teal-600 bg-teal-500/10",
  ink: "text-ink-700 bg-ink-700/10",
};

export default function StatCard({ label, value, accent = "ink", sub }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ink-900/5 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-900/50">{label}</p>
        <span className={`h-2 w-2 rounded-full ${ACCENTS[accent]}`} />
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-900/45">{sub}</p>}
    </div>
  );
}
