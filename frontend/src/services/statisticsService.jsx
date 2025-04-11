import { api } from "./api";

export const getVisitorStats = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.start_date = startDate.toISOString();
  if (endDate) params.end_date = endDate.toISOString();

  const response = await api.get("/stats/visitors", { params });
  return response.data;
};

export const getHostStats = async (startDate, endDate, limit = 10) => {
  const params = { limit };
  if (startDate) params.start_date = startDate.toISOString();
  if (endDate) params.end_date = endDate.toISOString();

  const response = await api.get("/stats/hosts", { params });
  return response.data;
};

export const getSystemStats = async () => {
  const response = await api.get("/stats/system");
  return response.data;
};

export const getHealthCheck = async () => {
  const response = await api.get("/stats/health");
  return response.data;
};
