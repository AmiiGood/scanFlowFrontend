import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLockStore } from "@/store/lockStore";
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
  Settings,
  Lock,
} from "lucide-react";

const navByRole = {
  operador_produccion: [
    { to: "/produccion", icon: PackageOpen, label: "Producción" },
  ],
  operador_embarque: [{ to: "/embarque", icon: Truck, label: "Embarque" }],
  operador_po: [
    { to: "/admin/purchase-orders", icon: QrCode, label: "Purchase Orders" },
    { to: "/admin/reportes", icon: BarChart3, label: "Reportes" },
  ],
  reportes: [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/reportes", icon: BarChart3, label: "Reportes" },
    { to: "/admin/reset", icon: Trash2, label: "Reset" },
  ],
  superadmin: [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/usuarios", icon: Users, label: "Usuarios" },
    { to: "/admin/skus", icon: ShoppingBag, label: "SKUs" },
    { to: "/admin/purchase-orders", icon: QrCode, label: "Purchase Orders" },
    { to: "/admin/qr-import", icon: QrCode, label: "Importar QRs" },
    { to: "/admin/reportes", icon: BarChart3, label: "Reportes" },
    { to: "/admin/backup", icon: Database, label: "Backup" },
    { to: "/admin/reset", icon: Trash2, label: "Reset" },
    { to: "/admin/configuracion", icon: Settings, label: "Configuración" },
  ],
};

// Clases de cada tema; el claro es el de las pantallas ya rediseñadas.
const TEMA = {
  oscuro: {
    aside: "bg-zinc-950 border-white/5",
    linea: "border-white/5",
    logoCaja: "bg-white/5 border-white/10 text-white",
    logoTexto: "text-white",
    activo: "bg-white/10 text-white font-medium",
    inactivo: "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
    iconoActivo: "text-white",
    iconoInactivo: "text-zinc-600 group-hover:text-zinc-400",
    avatar: "bg-white/10 border-white/10 text-white",
    nombre: "text-white",
    rol: "text-zinc-600",
    salir: "text-zinc-500 hover:text-red-400 hover:bg-red-400/5",
  },
  claro: {
    aside: "bg-white border-zinc-200",
    linea: "border-zinc-200",
    logoCaja: "bg-zinc-900 border-zinc-900 text-white",
    logoTexto: "text-zinc-900",
    activo: "bg-zinc-100 text-zinc-900 font-medium",
    inactivo: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
    iconoActivo: "text-zinc-900",
    iconoInactivo: "text-zinc-400 group-hover:text-zinc-600",
    avatar: "bg-zinc-100 border-zinc-200 text-zinc-700",
    nombre: "text-zinc-900",
    rol: "text-zinc-500",
    salir: "text-zinc-600 hover:text-red-700 hover:bg-red-50",
  },
};

export default function Sidebar({ claro = false }) {
  const t = TEMA[claro ? "claro" : "oscuro"];
  const { user, logout } = useAuth();
  const locked = useLockStore((s) => s.locked);
  const nav = navByRole[user?.rol] || [];

  const rolLabel = {
    operador_produccion: "Producción",
    operador_embarque: "Embarque",
    operador_po: "Operador PO",
    reportes: "Consulta de reportes",
    superadmin: "Administrador",
  };

  return (
    <aside className={cn("w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r", t.aside)}>
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-5 h-16 border-b", t.linea)}>
        <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg border", t.logoCaja)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
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
        <span className={cn("font-semibold tracking-tight", t.logoTexto)}>
          ScanFlow
        </span>
      </div>

      {/* Aviso de bloqueo */}
      {locked && (
        <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Lock size={13} className="text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300 leading-tight">
            Caja en proceso · navegación bloqueada
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
            tabIndex={locked ? -1 : undefined}
            aria-disabled={locked}
            onClick={(e) => locked && e.preventDefault()}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                locked && "pointer-events-none opacity-30",
                isActive ? t.activo : t.inactivo,
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={isActive ? t.iconoActivo : t.iconoInactivo}
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight size={12} className={t.rol} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className={cn("px-3 py-4 border-t space-y-0.5", t.linea)}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center shrink-0", t.avatar)}>
            <span className="text-xs font-medium">
              {user?.nombre?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium truncate", t.nombre)}>
              {user?.nombre}
            </p>
            <p className={cn("text-xs truncate", t.rol)}>
              {rolLabel[user?.rol]}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          disabled={locked}
          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:pointer-events-none", t.salir)}
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
