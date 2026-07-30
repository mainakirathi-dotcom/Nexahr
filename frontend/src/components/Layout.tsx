import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "grid" },
  { to: "/employees", label: "Employees", icon: "users" },
  { to: "/performance", label: "Performance", icon: "chart" },
  { to: "/settings", label: "Settings", icon: "settings", roles: ["super_admin"] },
  { to: "/audit-log", label: "Audit Log", icon: "log", roles: ["super_admin"] },
];

const ICONS: Record<string, ReactNode> = {
  grid: <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />,
  users: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />,
  chart: <path d="M4 20V10m6 10V4m6 16v-7" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.5a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.5a7 7 0 002-1.2l2.3.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z" />,
  log: <path d="M4 6h16M4 12h16M4 18h10" />,
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className="flex w-64 flex-col bg-ink-950 text-sand-50">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 font-display text-sm font-bold text-ink-950">
            NX
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none">NexaHR</p>
            <p className="text-[11px] text-sand-50/40">Workforce Cloud</p>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role || "")).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-gold-500 text-ink-950" : "text-sand-50/60 hover:bg-white/5 hover:text-sand-50"
                }`
              }
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
                {ICONS[item.icon]}
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 font-display text-sm font-semibold">
              {user?.name?.[0] ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-sand-50/40">{user?.role?.replace("_", " ")}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="focus-ring rounded-lg p-1.5 text-sand-50/50 hover:bg-white/5 hover:text-sand-50"
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
