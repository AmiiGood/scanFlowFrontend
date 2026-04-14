import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";

import DashboardPage from "@/pages/admin/DashboardPage";
import UsuariosPage from "@/pages/admin/UsuariosPage";
import SkusPage from "@/pages/admin/SkusPage";
import PurchaseOrdersPage from "@/pages/admin/PurchaseOrdersPage";
import PurchaseOrderDetailPage from "@/pages/admin/PurchaseOrderDetailPage";
import QRImportPage from "@/pages/admin/QRImportPage";
import ReportesPage from "@/pages/admin/ReportesPage";
import BackupPage from "@/pages/admin/BackupPage";
import ResetPage from "@/pages/admin/ResetPage";

import ProduccionPage from "@/pages/produccion/ProduccionPage";

import EmbarquePage from "@/pages/embarque/EmbarquePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <p className="text-zinc-400">
              Sin permisos para acceder a esta sección.
            </p>
          </div>
        }
      />
      {/* Producción */}
      <Route
        path="/produccion"
        element={
          <ProtectedRoute roles={["operador_produccion", "superadmin"]}>
            <AppLayout>
              <ProduccionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Embarque */}
      <Route
        path="/embarque"
        element={
          <ProtectedRoute roles={["operador_embarque", "superadmin"]}>
            <AppLayout>
              <EmbarquePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <UsuariosPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/skus"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <SkusPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/purchase-orders"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <PurchaseOrdersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/purchase-orders/:id"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <PurchaseOrderDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/qr-import"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <QRImportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <ReportesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/backup"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <BackupPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reset"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <AppLayout>
              <ResetPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
