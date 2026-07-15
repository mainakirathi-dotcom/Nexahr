import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@nexahr.com");
  const [password, setPassword] = useState("admin123");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // error is surfaced via context
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink-950 p-12 text-sand-50 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 font-display text-sm font-bold text-ink-950">NX</div>
          <span className="font-display text-lg font-semibold">NexaHR</span>
        </div>
        <div>
          <p className="font-display text-4xl font-semibold leading-tight">
            Every employee record,<br /> one workforce cloud.
          </p>
          <p className="mt-4 max-w-md text-sand-50/50">
            Profiles, performance history, documents and audit trails for every branch — kept in one
            secure, always-current system of record.
          </p>
        </div>
        <p className="text-xs text-sand-50/30">© {new Date().getFullYear()} NexaHR. Internal HR platform.</p>
      </div>

      <div className="flex items-center justify-center bg-sand-50 p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-900/50">Use your HR account to access NexaHR.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="mt-6 block text-sm font-medium text-ink-900/70">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring mt-1.5 w-full rounded-xl border border-ink-900/10 bg-white px-3.5 py-2.5 text-sm outline-none"
          />

          <label className="mt-4 block text-sm font-medium text-ink-900/70">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-1.5 w-full rounded-xl border border-ink-900/10 bg-white px-3.5 py-2.5 text-sm outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-6 w-full rounded-xl bg-ink-950 py-2.5 text-sm font-semibold text-sand-50 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-6 rounded-xl border border-ink-900/10 bg-white p-3 text-xs text-ink-900/50">
            <p className="font-semibold text-ink-900/70">Demo accounts</p>
            <p className="mt-1">Super Admin — admin@nexahr.com / admin123</p>
            <p>HR Manager — hr@nexahr.com / hr12345</p>
          </div>
        </form>
      </div>
    </div>
  );
}
