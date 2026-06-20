import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { LoginPage } from "@pages/auth/Login";
import { RegisterPage } from "@pages/auth/Register";
import { UsersPage } from "@pages/users/UsersPage";
import { DashboardPage } from "@pages/DashboardPage";
import { AuthGuard, GuestGuard } from "./AuthGuard";

export const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/users", element: <UsersPage /> },
        ],
      },
    ],
  },
]);
