import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { LoginPage } from "@pages/auth/Login";
import { RegisterPage } from "@pages/auth/Register";
import { UsersPage } from "@pages/users/UsersPage";
import { DashboardPage } from "@pages/DashboardPage";
import NotFound from "@pages/NotFound";
import { AuthGuard, GuestGuard } from "./AuthGuard";
import MoviePageWrapper from "./MoviePageWrapper";

const MoviePage = lazy(() => import("@pages/movie/MoviePage"));

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
      // Admin layout
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/users", element: <UsersPage /> },
        ],
      },
      // Movie page — full-screen, no AppLayout sidebar
      {
        path: "/movie",
        element: <MoviePageWrapper MoviePage={MoviePage} />,
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
