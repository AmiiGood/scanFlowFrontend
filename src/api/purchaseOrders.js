import api from "./axios";

export const getPurchaseOrders = (params = {}) =>
  api.get("/purchase-orders", { params });
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);
export const importPurchaseOrders = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/purchase-orders/import", form);
};
export const enviarPO = (id) => api.post(`/trysor/po/${id}/enviar`);
export const cancelarPO = (id) => api.post(`/trysor/po/${id}/cancelar`);
export const historialEnvios = (id) => api.get(`/trysor/po/${id}/historial`);
