import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        localStorage.setItem("accessToken", accessToken);
        set({ user, accessToken });
      },
      clearAuth: () => {
        localStorage.removeItem("accessToken");
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
