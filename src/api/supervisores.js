import api from "./axios";

// Producción
export const verificarGafete = (codigo) =>
  api.post("/supervisores/verificar", { codigo });
export const getMotivosLiberacion = () => api.get("/supervisores/motivos");
export const liberarCaja = (caja_id, datos) =>
  api.post(`/cajas/${caja_id}/liberar`, datos);

// Administración
export const getSupervisores = () => api.get("/supervisores");
export const crearSupervisor = (nombre) => api.post("/supervisores", { nombre });
export const actualizarSupervisor = (id, datos) =>
  api.patch(`/supervisores/${id}`, datos);
export const regenerarGafete = (id) => api.post(`/supervisores/${id}/regenerar`);

// Reportes
export const getLiberaciones = (params = {}) =>
  api.get("/reports/liberaciones", { params });
