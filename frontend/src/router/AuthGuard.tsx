import { Navigate, Outlet } from "react-router-dom";
import { authStore } from "@store/authStore";
import { GlobalAppProviders } from "@/context/GlobalAppProviders";

export const AuthGuard = () => {
  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <GlobalAppProviders>
      <Outlet />
    </GlobalAppProviders>
  );
};

export const GuestGuard = () => {
  if (authStore.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};
