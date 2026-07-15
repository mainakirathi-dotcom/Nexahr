import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import api from "../api/client";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "hr_manager";
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("nexahr_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("nexahr_token", res.data.token);
      localStorage.setItem("nexahr_user", JSON.stringify(res.data.user));
      setUser(res.data.user);
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to sign in. Check your credentials.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nexahr_token");
    localStorage.removeItem("nexahr_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
