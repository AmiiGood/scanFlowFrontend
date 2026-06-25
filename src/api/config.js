import api from "./axios";

export const getConfig = () => api.get("/config");

export const updateConfig = (clave, valor) =>
  api.put(`/config/${clave}`, { valor });
