import api from "./axios";

export const getPurchaseOrders = (params = {}) =>
  api.get("/purchase-orders", { params });
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);
// modo "validar": solo revisa el archivo; "cargar": carga lo válido.
// quitarSobrantes: borra los cartones (vacíos) que la PO ya tiene y que no
// vienen en el archivo.
export const importPurchaseOrders = (file, modo = "cargar", { quitarSobrantes = false } = {}) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/purchase-orders/import", form, {
    params: { modo, ...(quitarSobrantes ? { quitar_sobrantes: 1 } : {}) },
  });
};
export const enviarPO = (id) => api.post(`/trysor/po/${id}/enviar`);
export const cancelarPO = (id) => api.post(`/trysor/po/${id}/cancelar`);
export const historialEnvios = (id) => api.get(`/trysor/po/${id}/historial`);
