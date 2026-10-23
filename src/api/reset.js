import api from "./axios";

// datos = { motivo, comentario, codigo? } — codigo es el gafete del supervisor
// (no hace falta para el superadmin).
export const resetCaja   = (id, datos) => api.delete(`/reset/caja/${id}`, { data: datos });
export const desasociarCaja = (id, datos) => api.post(`/reset/caja/${id}/desasociar`, datos);
export const resetCarton = (id, datos) => api.delete(`/reset/carton/${id}`, { data: datos });
export const resetPO     = (id, datos) => api.delete(`/reset/po/${id}`, { data: datos });
export const buscarParaReset = (tipo, q) =>
  api.get("/reset/buscar", { params: { tipo, q } });
export const getMotivosReset = () => api.get("/reset/motivos");
export const getReseteos = (params = {}) => api.get("/reports/reseteos", { params });
