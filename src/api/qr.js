import api from "./axios";

export const getQrStats = () => api.get("/qr/stats");
export const importQRs = (lastGetTime) =>
  api.post("/qr/import", { lastGetTime });
export const getJobStatus = (job_id) => api.get(`/qr/jobs/${job_id}`);
export const getRecentJobs = () => api.get("/qr/jobs");
export const matchQRsWithSkus = () => api.post("/qr/match-skus");
