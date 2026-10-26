import { useAuthStore } from "@/store/authStore";
import { puede, puedeAlguno } from "@/lib/permisos";

export function usePermisos() {
  const user = useAuthStore((s) => s.user);
  return {
    user,
    puede: (permiso) => puede(user, permiso),
    alguno: (permisos) => puedeAlguno(user, permisos),
  };
}
