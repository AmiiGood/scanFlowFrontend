import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PackageOpen,
  Truck,
  Users,
  BarChart3,
  QrCode,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Database,
  Trash2,
} from "lucide-react";

const navByRole = {
  operador_produccion: [
    { to: "/produccion", icon: PackageOpen, label: "Producción" },
  ],
  operador_embarque: [{ to: "/embarque", icon: Truck, label: "Embarque" }],
  superadmin: [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/usuarios", icon: Users, label: "Usuarios" },
    { to: "/admin/skus", icon: ShoppingBag, label: "SKUs" },
    { to: "/admin/purchase-orders", icon: QrCode, label: "Purchase Orders" },
    { to: "/admin/qr-import", icon: QrCode, label: "Importar QRs" },
    { to: "/admin/reportes", icon: BarChart3, label: "Reportes" },
    { to: "/admin/backup", icon: Database, label: "Backup" },
    { to: "/admin/reset", icon: Trash2, label: "Reset" },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = navByRole[user?.rol] || [];

  const rolLabel = {
    operador_produccion: "Producción",
    operador_embarque: "Embarque",
    superadmin: "Administrador",
  };

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-zinc-950 border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <rect
              x="3"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              fill="currentColor"
              opacity="0.9"
            />
            <rect
              x="13"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              fill="currentColor"
              opacity="0.4"
            />
            <rect
              x="3"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              fill="currentColor"
              opacity="0.4"
            />
            <rect
              x="13"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
        </div>
        <span className="text-white font-semibold tracking-tight">
          ScanFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={
                    isActive
                      ? "text-white"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  }
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight size={12} className="text-zinc-600" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-white/5 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-medium">
              {user?.nombre?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user?.nombre}
            </p>
            <p className="text-zinc-600 text-xs truncate">
              {rolLabel[user?.rol]}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-colors"
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
