import { create } from "zustand";

// Bloqueo global de la interfaz. Lo activa la pantalla de producción mientras
// hay una caja en proceso (si la configuración de bloqueo está encendida) y lo
// consume el Sidebar para impedir la navegación.
export const useLockStore = create((set) => ({
  locked: false,
  setLocked: (locked) => set({ locked }),
}));
