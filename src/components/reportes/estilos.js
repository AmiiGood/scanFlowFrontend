// Clases compartidas del tema claro (Dashboard y Reportes).
import { cn } from "@/lib/utils";

// Controles de filtro
export const inputCls =
  "h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600";

// Tablas
export const th =
  "text-left text-xs font-medium text-zinc-500 px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 whitespace-nowrap";
export const thNum = cn(th, "text-right");
export const td = "px-4 py-2.5 border-b border-zinc-100 text-zinc-700";
export const tdNum = cn(td, "text-right tabular-nums");
export const tdMono = cn(td, "font-mono text-xs text-zinc-900");


// Paleta de las gráficas: azul fuerte = serie principal, azul claro = su par
// de comparación, gris = referencia (promedios).
export const COLOR = {
  principal: "#2563eb",
  claro: "#93c5fd",
  referencia: "#71717a",
  eje: "#71717a",
  rejilla: "#e4e4e7",
};
