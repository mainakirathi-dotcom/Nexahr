import InstallPrompt from "./components/InstallPrompt";
import { lazy, Suspense } from "react";
import SlowNotice from "./components/SlowNotice";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OrgProvider, useOrg } from "./context/OrgContext";
import { ToastProvider } from "./context/ToastContext";
import Login from "./pages/Login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeProfile = lazy(() => import("./pages/EmployeeProfile"));
const Performance = lazy(() => import("./pages/Performance"));
const Settings = lazy(() => import("./pages/Settings"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Companies = lazy(() => import("./pages/Companies"));
const Admins = lazy(() => import("./pages/Admins"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "super_admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Every page that shows company data (Dashboard, Employees, Performance, Settings,
// Audit Log) needs one company selected. HR Managers always have exactly one, silently.
// The platform Super Admin has to pick one first — this sends them to do that instead
// of letting scoped pages fail with "select a company" API errors.
function RequireOrgSelected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isPlatformAdmin, activeOrgId } = useOrg();
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformAdmin && activeOrgId === null) return <Navigate to="/companies" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <OrgProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-ink-900/60">Loading…</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><RequireOrgSelected><Dashboard /></RequireOrgSelected></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute><RequireOrgSelected><Employees /></RequireOrgSelected></ProtectedRoute>} />
              <Route path="/employees/:id" element={<ProtectedRoute><RequireOrgSelected><EmployeeProfile /></RequireOrgSelected></ProtectedRoute>} />
              <Route path="/performance" element={<ProtectedRoute><RequireOrgSelected><Performance /></RequireOrgSelected></ProtectedRoute>} />
              <Route path="/settings" element={<AdminRoute><RequireOrgSelected><Settings /></RequireOrgSelected></AdminRoute>} />
              <Route path="/audit-log" element={<AdminRoute><RequireOrgSelected><AuditLog /></RequireOrgSelected></AdminRoute>} />
              <Route path="/companies" element={<AdminRoute><Companies /></AdminRoute>} />
              <Route path="/admins" element={<AdminRoute><Admins /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          <InstallPrompt />
          <SlowNotice />
        </OrgProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
