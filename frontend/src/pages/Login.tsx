import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { flagLoginToast } from "../components/LoginToast";
import Logo from "../components/Logo";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [view, setView] = useState<"login" | "signup">("login");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password, remember);
      flagLoginToast();
      navigate("/");
    } catch {
      // error is surfaced via context
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink-950 shadow-card">
            <Logo size={56} />
          </div>

          {view === "login" ? (
            <>
              <h1 className="mt-5 font-display text-3xl font-bold text-midnight-500">Hi, welcome back</h1>
              <p className="mt-1.5 text-sm text-ink-900/60">Please fill in your details to log in</p>
            </>
          ) : (
            <>
              <h1 className="mt-5 font-display text-3xl font-bold text-midnight-500">Thank you for contacting NexaHR</h1>
              <p className="mt-1.5 text-sm text-ink-900/60">Please reach out to the administrator to request an account.</p>
            </>
          )}
        </div>

        {view === "login" ? (
          <form onSubmit={handleSubmit} className="mt-8 rounded-2xl bg-white p-6 shadow-card sm:p-8">
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-ink-900/70">Email address</label>
            <input
              type="email"
              required
              autoFocus
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

            <label className="mt-4 flex items-center gap-2 text-sm text-ink-900/70">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-ink-900/20 text-midnight-500 focus:ring-midnight-500"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="focus-ring mt-6 w-full rounded-xl bg-ink-950 py-2.5 text-sm font-semibold text-sand-50 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="mt-6 text-center text-sm text-ink-900/60">
              Don't have an account?{" "}
              <button type="button" onClick={() => setView("signup")} className="focus-ring font-semibold text-midnight-500 hover:underline">
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-card sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-midnight-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-midnight-500">
                <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-ink-900/70">
              Administrator Contact:{" "}
              <a href="tel:0115961382" className="font-semibold text-midnight-500 hover:underline">0115961382</a>
            </p>
            <button
              type="button"
              onClick={() => setView("login")}
              className="focus-ring mt-6 w-full rounded-xl border border-ink-900/10 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-900/5"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
