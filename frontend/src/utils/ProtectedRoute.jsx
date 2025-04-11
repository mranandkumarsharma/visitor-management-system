import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/common/Loader";

export const ProtectedRoute = ({ requiredRole }) => {
  const { user, loading, hasRole, initialized } = useAuth();

  if (loading || !initialized) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect to appropriate dashboard based on role
    if (hasRole("admin")) return <Navigate to="/admin" replace />;
    if (hasRole("guard")) return <Navigate to="/guard" replace />;
    if (hasRole("faculty")) return <Navigate to="/faculty" replace />;

    // If no matching role, go to login
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
