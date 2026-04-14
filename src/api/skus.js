import api from "./axios";

export const getSkus = (params = {}) => api.get("/skus", { params });
export const importSkus = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/skus/import", form);
};
