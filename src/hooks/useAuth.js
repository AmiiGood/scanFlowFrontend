import { useAuthStore } from "@/store/authStore";
import { login as loginApi, logout as logoutApi } from "@/api/auth";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import * as Tone from "tone";

export function useAuth() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function login(email, password) {
    const { data } = await loginApi(email, password);
    // Nada de lo que se consultó con la sesión anterior (permisos incluidos)
    // debe pasar a la nueva.
    qc.clear();
    setAuth(data.user, data.accessToken);
    // Activar contexto de audio con el clic del login
    await Tone.start();
    return data.user;
  }

  async function logout() {
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    qc.clear();
    navigate("/login");
  }

  return { user, login, logout };
}
