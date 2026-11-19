import { useEffect, useState } from "react";

/** Shows a friendly note when the server takes more than a few seconds (e.g. waking from sleep). */
export default function SlowNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const h = (e: Event) => setSlow(Boolean((e as CustomEvent).detail));
    window.addEventListener("nexahr:slow", h);
    return () => window.removeEventListener("nexahr:slow", h);
  }, []);
  if (!slow) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-[95] mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-[#1e1038] px-4 py-3 text-sm text-white shadow-xl" style={{ marginTop: "env(safe-area-inset-top)" }}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      Waking up the server… this can take a few seconds.
    </div>
  );
}
