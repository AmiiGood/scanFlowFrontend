import api from "./axios";

export const generateBackup = (includeData) =>
  api.post("/backup/generate", { includeData }, { responseType: "blob" });
