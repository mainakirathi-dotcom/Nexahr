import axios from "axios";
import { getToken, clearSession } from "../utils/authStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL, timeout: 90000 });

// Tell the UI when the server is slow (free hosting wakes from sleep) so users see a message, not a frozen screen.
let pending = 0;
const timers = new Map<any, number>();
function slow(on: boolean) { window.dispatchEvent(new CustomEvent("nexahr:slow", { detail: on })); }
function done(cfg: any) {
  const t = timers.get(cfg); if (t) { clearTimeout(t); timers.delete(cfg); }
  pending = Math.max(0, pending - 1);
  if (pending === 0) slow(false);
}

// Wake the server the moment the app opens (before the user even logs in)
export function warmUpServer() {
  fetch(API_URL.replace(/\/$/, "") + "/health").catch(() => {});
}

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
  pending++;
  timers.set(config, window.setTimeout(() => slow(true), 3500));
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const activeOrgId = getActiveOrgId();
  if (activeOrgId !== null) {
    config.params = { ...config.params, organization_id: activeOrgId };
  }
  return config;
});

api.interceptors.response.use(
  (res) => { done(res.config); return res; },
  (err) => {
    if (err.config) done(err.config);
    if (err.response?.status === 401) {
      clearSession();
      clearActiveOrg();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
