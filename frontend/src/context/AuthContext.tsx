import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import api, { clearActiveOrg } from "../api/client";
import { getStoredUser, setSession, clearSession } from "../utils/authStorage";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "hr_manager";
  // null for the platform Super Admin (can operate across every client company).
  // Always set for an HR Manager (locked to their one company).
  organization_id: number | null;
  organization_name: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      setSession(res.data.token, res.data.user, remember);
      setUser(res.data.user);
    } catch (e: any) {
      setError(e.response?.data?.error || "Unable to sign in. Check your credentials.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    clearActiveOrg();
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
