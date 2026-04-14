import api from "./axios";

export const resetCaja   = (id) => api.delete(`/reset/caja/${id}`);
export const resetCarton = (id) => api.delete(`/reset/carton/${id}`);
export const resetPO     = (id) => api.delete(`/reset/po/${id}`);
