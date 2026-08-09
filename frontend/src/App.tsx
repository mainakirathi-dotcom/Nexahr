import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OrgProvider, useOrg } from "./context/OrgContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";
import AuditLog from "./pages/AuditLog";
import Companies from "./pages/Companies";
import Admins from "./pages/Admins";

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
    <AuthProvider>
      <OrgProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </OrgProvider>
    </AuthProvider>
  );
}
