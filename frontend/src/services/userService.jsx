import { api } from "./api";

export const getUsers = async () => {
  const response = await api.get("/users/");
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post("/users/", userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const changePassword = async (id, currentPassword, newPassword) => {
  const response = await api.post(`/users/${id}/change-password`, {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};
