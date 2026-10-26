import api from "./axios";

export const getCatalogoPermisos = () => api.get("/perfiles/permisos");
export const getPerfiles = () => api.get("/perfiles");
export const crearPerfil = (datos) => api.post("/perfiles", datos);
export const actualizarPerfil = (id, datos) => api.put(`/perfiles/${id}`, datos);
export const eliminarPerfil = (id) => api.delete(`/perfiles/${id}`);
