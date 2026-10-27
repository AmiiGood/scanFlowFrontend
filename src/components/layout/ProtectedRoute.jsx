import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { getMe } from "@/api/auth";
import { puedeAlguno } from "@/lib/permisos";

// Protege una pantalla por permiso (uno o varios: basta con tener uno). Los
// permisos se vuelven a pedir al backend cada pocos minutos y al volver a la
// pestaña, así un cambio de perfil se refleja sin cerrar sesión.
export default function ProtectedRoute({ children, permiso }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data, isError } = useQuery({
    queryKey: ["sesion", user?.id],
    queryFn: () => getMe().then((r) => r.data),
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Solo vale la respuesta del usuario que tiene la sesión ahora.
  const vigenteMe = data && data.id === user?.id ? data : null;

  useEffect(() => {
    if (vigenteMe) setUser(vigenteMe);
  }, [vigenteMe, setUser]);

  if (!user) return <Navigate to="/login" replace />;
  const vigente = vigenteMe ? { ...user, ...vigenteMe } : user;
  // Sesión iniciada antes de los perfiles: se espera a tener sus permisos.
  if (!vigente.permisos) return isError ? <Navigate to="/login" replace /> : null;
  if (permiso && !puedeAlguno(vigente, permiso)) return <Navigate to="/unauthorized" replace />;

  return children;
}
