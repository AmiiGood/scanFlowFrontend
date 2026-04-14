import api from "./axios";

export const getUsers = () => api.get("/users");
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const changePassword = (id, password) =>
  api.patch(`/users/${id}/password`, { password });
