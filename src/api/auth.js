import api from "./axios";

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const logout = () => api.post("/auth/logout");

export const refreshToken = () => api.post("/auth/refresh");

export const getMe = () => api.get("/auth/me");
