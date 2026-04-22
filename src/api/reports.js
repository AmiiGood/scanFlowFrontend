import api from "./axios";

export const getResumenGeneral = () => api.get("/reports/resumen");
export const getActividadReciente = (limite = 50) =>
  api.get(`/reports/actividad?limite=${limite}`);
export const getProduccionPorOperador = () => api.get("/reports/operadores");
export const getProduccionPorDia = (dias = 30) =>
  api.get(`/reports/produccion-dia?dias=${dias}`);
export const getTrazabilidadQR = (codigo) =>
  api.get(`/reports/trazabilidad/${encodeURIComponent(codigo)}`);
export const getCajasPorSKU = (params = {}) =>
  api.get("/reports/cajas-sku", { params });
export const getCartonesPendientesPorPO = (po_id) =>
  api.get(`/reports/po/${po_id}/pendientes`);
export const getQrsSinSKU = (params = {}) =>
  api.get("/reports/qrs-sin-sku", { params });
export const getHistorialEnviosT4 = () => api.get("/reports/envios-t4");
export const getDetalleCartonesPorPO = (po_id) =>
  api.get(`/reports/po/${po_id}/detalle-cartones`);
export const getProgresoPO = (po_id) =>
  api.get(`/reports/po/${po_id}/progreso`);
