import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

// Pantallas ya migradas al tema claro. Las demás siguen en el oscuro hasta
// que se rediseñen.
const RUTAS_CLARAS = ["/admin", "/admin/reportes"];

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const claro = RUTAS_CLARAS.includes(pathname.replace(/\/$/, ""));

  return (
    <div className={`flex min-h-screen ${claro ? "bg-zinc-50" : "bg-zinc-900"}`}>
      <Sidebar claro={claro} />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
