import api from "./axios";

export const getCartonesPorPO = (po_id) => api.get(`/embarque/po/${po_id}`);
export const getCarton = (id) => api.get(`/embarque/${id}`);
export const getProgresoMusical = (id) =>
  api.get(`/embarque/${id}/progreso-musical`);
export const asignarCaja = (carton_id, caja_id) =>
  api.post(`/embarque/${carton_id}/asignar-caja`, { caja_id });
export const reasociarQR = (carton_id, codigo_qr) =>
  api.post(`/embarque/${carton_id}/reasociar-qr`, { codigo_qr });
export const getCartonByCodigo = (codigo) =>
  api.get(`/embarque/buscar/${codigo}`);
