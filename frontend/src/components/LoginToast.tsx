import { useEffect, useState } from "react";

const FLAG_KEY = "nexahr_show_login_toast";

export function flagLoginToast() {
  sessionStorage.setItem(FLAG_KEY, "1");
}

export default function LoginToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(FLAG_KEY)) {
      sessionStorage.removeItem(FLAG_KEY);
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex animate-[fadeIn_.2s_ease-out] items-center gap-2.5 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      Login successful!
    </div>
  );
}
