import api from "./axios";

export const getSkus = (params = {}) => api.get("/skus", { params });
// modo "validar": solo revisa el archivo; "cargar": carga las filas válidas.
export const importSkus = (file, modo = "cargar") => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/skus/import", form, { params: { modo } });
};
