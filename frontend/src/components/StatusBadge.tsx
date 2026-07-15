const STATUS_STYLES: Record<string, string> = {
  Active: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  "On Leave": "bg-gold-500/10 text-gold-600 border-gold-500/30",
  Suspended: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  Resigned: "bg-ink-600/10 text-ink-600 border-ink-600/30",
  Dismissed: "bg-red-500/10 text-red-600 border-red-500/30",
  Retired: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-ink-600/10 text-ink-600 border-ink-600/30";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
