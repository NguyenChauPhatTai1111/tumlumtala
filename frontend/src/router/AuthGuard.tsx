import { Navigate, Outlet } from "react-router-dom";
import { authStore } from "@store/authStore";

export const AuthGuard = () => {
  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export const GuestGuard = () => {
  if (authStore.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};
