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

const IndexPage = lazy(() =>
  import("@/pages/index-page").then((module) => ({
    default: module.IndexPage,
  })),
);

const AssetsPage = lazy(() =>
  import("@/pages/assets-page").then((module) => ({
    default: module.AssetsPage,
  })),
);

const AssetDetailPage = lazy(() =>
  import("@/pages/asset-detail-page").then((module) => ({
    default: module.AssetDetailPage,
  })),
);

const WorkPage = lazy(() =>
  import("@/pages/work-page").then((module) => ({
    default: module.WorkPage,
  })),
);

const VisitMaintenanceDetailPage = lazy(() =>
  import("@/pages/visit-maintenance-detail-page").then((module) => ({
    default: module.VisitMaintenanceDetailPage,
  })),
);

const LoginPage = lazy(() =>
  import("@/pages/login-page").then((module) => ({
    default: module.LoginPage,
  })),
);

function PublicLayout() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
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
          <Route path="/" element={<IndexPage />} />
          <Route path="/monitoring/kunjungan" element={<VisitMaintenanceDetailPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:assetId" element={<AssetDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
