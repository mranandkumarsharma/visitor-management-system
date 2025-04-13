import axios from "axios";

const API_URL = "http://localhost:8000/api/v1";

// Authenticated API instance
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Public (unauthenticated) API instance
const publicApi = {
  getHosts: async () => {
    const response = await axios.get(`${API_URL}/visitors/hosts`);
    return response.data;
  },

  registerVisitor: async (visitorData) => {
    const response = await axios.post(
      `${API_URL}/visitors/self-register`,
      visitorData
    );
    return response.data;
  },
};

export { api, publicApi };
