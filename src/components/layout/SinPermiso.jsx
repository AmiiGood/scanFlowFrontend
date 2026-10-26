import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { pantallaInicio } from "@/lib/permisos";

export default function SinPermiso() {
  const user = useAuthStore((s) => s.user);
  const inicio = user ? pantallaInicio(user) : "/login";
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-4">
          <ShieldOff size={20} className="text-zinc-500" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-900">Sin permiso para esta sección</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Tu perfil{user?.perfil ? ` (${user.perfil})` : ""} no incluye esta pantalla. Si la necesitas, pídele a un
          administrador que la agregue a tu perfil.
        </p>
        {inicio !== "/unauthorized" && (
          <Link
            to={inicio}
            className="inline-flex mt-5 h-9 items-center px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Ir a mi inicio
          </Link>
        )}
      </div>
    </div>
  );
}
