import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import api, { getActiveOrgId, setActiveOrgId as persistActiveOrgId, clearActiveOrg } from "../api/client";
import { useAuth } from "./AuthContext";

export interface OrgSummary {
  id: number;
  name: string;
  employee_count: number;
  hr_count: number;
  branch_count: number;
  created_at: string;
}

interface OrgContextValue {
  isPlatformAdmin: boolean;
  activeOrgId: number | null;
  activeOrgName: string | null;
  organizations: OrgSummary[];
  loadingOrganizations: boolean;
  setActiveOrg: (id: number, name: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === "super_admin" && user.organization_id === null;

  const [activeOrgId, setActiveOrgIdState] = useState<number | null>(() => getActiveOrgId());
  const [activeOrgName, setActiveOrgName] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  const setActiveOrg = useCallback((id: number, name: string) => {
    persistActiveOrgId(id);
    setActiveOrgIdState(id);
    setActiveOrgName(name);
  }, []);

  const refreshOrganizations = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoadingOrganizations(true);
    try {
      const res = await api.get<OrgSummary[]>("/organizations");
      setOrganizations(res.data);
      // If the org we had selected no longer exists (e.g. it was deleted), fall back
      // cleanly instead of silently sending requests for a dead organization_id.
      if (activeOrgId !== null && !res.data.some((o) => o.id === activeOrgId)) {
        clearActiveOrg();
        setActiveOrgIdState(null);
        setActiveOrgName(null);
      } else if (activeOrgId !== null) {
        const match = res.data.find((o) => o.id === activeOrgId);
        if (match) setActiveOrgName(match.name);
      }
    } finally {
      setLoadingOrganizations(false);
    }
  }, [isPlatformAdmin, activeOrgId]);

  // HR Managers are always locked to their own company — no picker, no ambiguity.
  useEffect(() => {
    if (user && user.role === "hr_manager" && user.organization_id !== null) {
      persistActiveOrgId(user.organization_id);
      setActiveOrgIdState(user.organization_id);
      setActiveOrgName(user.organization_name);
    }
  }, [user]);

  // Platform admin: load the company list once logged in so the switcher has data.
  useEffect(() => {
    if (isPlatformAdmin) refreshOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatformAdmin]);

  return (
    <OrgContext.Provider
      value={{ isPlatformAdmin, activeOrgId, activeOrgName, organizations, loadingOrganizations, setActiveOrg, refreshOrganizations }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
