import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await api.get("/auth/me");
          setUser(response.data);
        } catch (err) {
          console.error("Auth check failed:", err);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
      setInitialized(true);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);

      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await api.post("/auth/token", formData);

      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const hasRole = (role) => {
    if (!user) return false;
    if (user.is_admin) return true; // Admin has access to everything

    switch (role) {
      case "admin":
        return user.is_admin;
      case "guard":
        return user.department === "Security";
      case "faculty":
        return user.department !== "Security" && !user.is_admin;
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        hasRole,
        initialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
