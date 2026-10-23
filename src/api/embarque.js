import api from "./axios";

export const getCartonesPorPO = (po_id) => api.get(`/embarque/po/${po_id}`);
export const getResumenPOEmbarque = (po_id) =>
  api.get(`/embarque/po/${po_id}/resumen`);
export const getCarton = (id) => api.get(`/embarque/${id}`);
export const getProgresoMusical = (id) =>
  api.get(`/embarque/${id}/progreso-musical`);
export const asignarCaja = (carton_id, caja_id) =>
  api.post(`/embarque/${carton_id}/asignar-caja`, { caja_id });
export const reasociarQR = (carton_id, codigo_qr) =>
  api.post(`/embarque/${carton_id}/reasociar-qr`, { codigo_qr });
// Musicales por PO
export const buscarPOMusical = (po_number) =>
  api.get("/embarque/musical/po", { params: { po_number } });
export const getResumenMusical = (po_id) => api.get(`/embarque/musical/po/${po_id}`);
export const asignarCajaPOMusical = (po_id, codigo_caja) =>
  api.post(`/embarque/musical/po/${po_id}/caja`, { codigo_caja });
export const asignarQRPOMusical = (po_id, codigo_qr) =>
  api.post(`/embarque/musical/po/${po_id}/qr`, { codigo_qr });
export const getCartonByCodigo = (codigo) =>
  api.get(`/embarque/buscar/${codigo}`);
