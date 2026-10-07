// El backend entrega fechas como texto en hora de planta ("YYYY-MM-DD" o
// "YYYY-MM-DD HH:MM:SS"); se reacomodan sin pasar por Date para no moverlas
// de zona horaria.
export function fmtFecha(valor) {
  if (!valor) return "—";
  const [y, m, d] = valor.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fmtFechaHora(valor) {
  if (!valor) return "—";
  return `${fmtFecha(valor)} ${valor.slice(11, 16)}`;
}

export function fmtHora(valor) {
  return valor ? valor.slice(11, 16) : "—";
}

// "2026-10-05 00:24:03" → "12:24:03 a. m."
export function fmtHora12(valor) {
  if (!valor) return "—";
  const [h, m, s] = valor.slice(11, 19).split(":");
  const hora = Number(h);
  return `${hora % 12 || 12}:${m}:${s} ${hora < 12 ? "a. m." : "p. m."}`;
}

export const fmtNum = (n) => Number(n || 0).toLocaleString("es-MX");
