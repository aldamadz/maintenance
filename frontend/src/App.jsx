import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/ui/loading-state";

const DashboardPage = lazy(() =>
  import("@/pages/dashboard-page").then((module) => ({
    default: module.DashboardPage,
  })),
);

const MaintenancePage = lazy(() =>
  import("@/pages/maintenance-page").then((module) => ({
    default: module.MaintenancePage,
  })),
);

const LoginPage = lazy(() =>
  import("@/pages/login-page").then((module) => ({
    default: module.LoginPage,
  })),
);

function PublicLayout() {
  return (
    <AppShell showAuthControls={false} defaultTitle="Data Maintenance">
      <Outlet />
    </AppShell>
  );
}

function ProtectedLayout() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingState label="Memeriksa sesi login..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState label="Menyiapkan halaman..." />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<MaintenancePage readOnly />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
