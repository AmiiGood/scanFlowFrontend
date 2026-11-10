import api from "./axios";

// La caja que se va a llenar se busca por su etiqueta.
export const buscarDestino = (codigo) => api.get("/consolidacion/destino", { params: { codigo } });
export const consolidarCaja = (destino_id, codigo_caja) =>
  api.post(`/consolidacion/${destino_id}/caja`, { codigo_caja });
export const consolidarQR = (destino_id, codigo_qr) => api.post(`/consolidacion/${destino_id}/qr`, { codigo_qr });
export const getConsolidaciones = (params = {}) => api.get("/reports/consolidaciones", { params });
