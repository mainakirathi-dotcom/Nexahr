import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL });

// Which client company the platform Super Admin is currently viewing. HR Managers
// never need this set — the backend always locks them to their own company regardless
// of what (if anything) is sent here, so this is purely a Super-Admin convenience.
const ACTIVE_ORG_KEY = "nexahr_active_org_id";

export function getActiveOrgId(): number | null {
  const raw = localStorage.getItem(ACTIVE_ORG_KEY);
  return raw ? Number(raw) : null;
}

export function setActiveOrgId(id: number | null) {
  if (id === null) localStorage.removeItem(ACTIVE_ORG_KEY);
  else localStorage.setItem(ACTIVE_ORG_KEY, String(id));
}

export function clearActiveOrg() {
  localStorage.removeItem(ACTIVE_ORG_KEY);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexahr_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const activeOrgId = getActiveOrgId();
  if (activeOrgId !== null) {
    config.params = { ...config.params, organization_id: activeOrgId };
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("nexahr_token");
      localStorage.removeItem("nexahr_user");
      clearActiveOrg();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
