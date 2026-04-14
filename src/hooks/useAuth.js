import { useAuthStore } from "@/store/authStore";
import { login as loginApi, logout as logoutApi } from "@/api/auth";
import { useNavigate } from "react-router-dom";
import * as Tone from "tone";

export function useAuth() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  async function login(email, password) {
    const { data } = await loginApi(email, password);
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
    navigate("/login");
  }

  return { user, login, logout };
}
