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

export const fmtNum = (n) => Number(n || 0).toLocaleString("es-MX");
