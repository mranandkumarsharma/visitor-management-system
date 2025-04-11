import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./utils/ProtectedRoute";

// Import pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import GuardDashboard from "./pages/GuardDashboard";
import VisitorRegistration from "./pages/VisitorRegistration";

import FacultyDashboard from "./pages/FacultyDashboard";

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            {/* Protected admin routes */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            {/* Protected guard routes */}
            <Route element={<ProtectedRoute requiredRole="guard" />}>
              <Route path="/guard" element={<GuardDashboard />} />
            </Route>
            {/* Protected faculty routes */}
            <Route element={<ProtectedRoute requiredRole="faculty" />}>
              <Route path="/faculty" element={<FacultyDashboard />} />
            </Route>
            {/* Registration route */}
            <Route path="/register" element={<VisitorRegistration />} />
            {/* Default redirect */}

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
