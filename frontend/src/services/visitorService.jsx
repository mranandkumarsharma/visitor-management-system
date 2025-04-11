import { api } from "./api";

export const getVisitors = async (params = {}) => {
  const response = await api.get("/visitors/");
  return response.data;
};

export const getVisitor = async (id) => {
  const response = await api.get(`/visitors/${id}`);
  return response.data;
};

export const registerVisitor = async (visitorData) => {
  const response = await api.post("/visitors/", visitorData);
  return response.data;
};

export const updateVisitor = async (id, visitorData) => {
  const response = await api.put(`/visitors/${id}`, visitorData);
  return response.data;
};

export const uploadVisitorPhoto = async (id, photoFile) => {
  const formData = new FormData();
  formData.append("photo", photoFile);

  const response = await api.post(`/visitors/${id}/photo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getVisitorPhoto = async (id) => {
  return `${api.defaults.baseURL}/photos/visitor/${id}`;
};

export const approveVisitor = async (id, approved, notes = "") => {
  const response = await api.post(`/visitors/${id}/approval`, {
    approved,
    notes,
  });
  return response.data;
};

export const checkInVisitor = async (id) => {
  const response = await api.post(`/visitors/${id}/check-in`);
  return response.data;
};

export const checkOutVisitor = async (id) => {
  const response = await api.post(`/visitors/${id}/check-out`);
  return response.data;
};

export const createPreApproval = async (preApprovalData) => {
  const response = await api.post("/visitors/pre-approval", preApprovalData);
  return response.data;
};

export const deleteVisitor = async (id) => {
  const response = await api.delete(`/visitors/${id}`);
  return response.data;
};

export const verifyBadge = async (qrCode) => {
  const response = await api.get(`/badges/${qrCode}/verify`);
  return response.data;
};

export const getBadgeQrCode = async (qrCode) => {
  return `${api.defaults.baseURL}/badges/${qrCode}/image`;
};
