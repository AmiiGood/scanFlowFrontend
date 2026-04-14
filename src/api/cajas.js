import api from "./axios";

export const getCajas = (params = {}) => api.get("/cajas", { params });
export const iniciarCaja = (codigo_caja) => api.post("/cajas", { codigo_caja });
export const getProgresoCaja = (id) => api.get(`/cajas/${id}`);
export const escanearQR = (id, codigo_qr) =>
  api.post(`/cajas/${id}/scan`, { codigo_qr });
