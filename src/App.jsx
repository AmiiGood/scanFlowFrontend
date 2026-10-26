import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import SinPermiso from "@/components/layout/SinPermiso";
import { CONFIGURACION, EMBARQUE, RESET } from "@/lib/permisos";
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
import ConfiguracionPage from "@/pages/admin/ConfiguracionPage";

import ProduccionPage from "@/pages/produccion/ProduccionPage";

import EmbarquePage from "@/pages/embarque/EmbarquePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/unauthorized"
        element={<SinPermiso />}
      />
      {/* Producción */}
      <Route
        path="/produccion"
        element={
          <ProtectedRoute permiso={"produccion.escanear"}>
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
          <ProtectedRoute permiso={EMBARQUE}>
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
          <ProtectedRoute permiso={"dashboard.ver"}>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute permiso={"usuarios.administrar"}>
            <AppLayout>
              <UsuariosPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/skus"
        element={
          <ProtectedRoute permiso={"skus.administrar"}>
            <AppLayout>
              <SkusPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/purchase-orders"
        element={
          <ProtectedRoute permiso={"pos.ver"}>
            <AppLayout>
              <PurchaseOrdersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/purchase-orders/:id"
        element={
          <ProtectedRoute permiso={"pos.ver"}>
            <AppLayout>
              <PurchaseOrderDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/qr-import"
        element={
          <ProtectedRoute permiso={"qrs.importar"}>
            <AppLayout>
              <QRImportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <ProtectedRoute permiso={"reportes.ver"}>
            <AppLayout>
              <ReportesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/backup"
        element={
          <ProtectedRoute permiso={"backup.generar"}>
            <AppLayout>
              <BackupPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reset"
        element={
          <ProtectedRoute permiso={RESET}>
            <AppLayout>
              <ResetPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/configuracion"
        element={
          <ProtectedRoute permiso={CONFIGURACION}>
            <AppLayout>
              <ConfiguracionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
