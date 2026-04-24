import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingState label="Menyiapkan halaman..." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
