/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { LoginPage } from "@pages/auth/Login";
import { RegisterPage } from "@pages/auth/Register";
import { UsersPage } from "@pages/users/UsersPage";
import { DashboardPage } from "@pages/DashboardPage";
import { LandingPage } from "@pages/LandingPage";
import NotFound from "@pages/NotFound";
import { AuthGuard, GuestGuard } from "./AuthGuard";
import MoviePageWrapper from "./MoviePageWrapper";
import MessengerPageWrapper from "./MessengerPageWrapper";
import MusicPageWrapper from "./MusicPageWrapper";
import { RouteErrorPage } from "@components/common/RouteErrorPage";
import { PermissionRoute } from "@components/common/PermissionRoute";

const MoviePage = lazy(() => import("@pages/movie/MoviePage"));

export const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    errorElement: <RouteErrorPage />,
    children: [
      // Admin layout
      {
        element: <AppLayout />,
        errorElement: <RouteErrorPage />,
        children: [
          { path: "/", element: <LandingPage /> },
          {
            path: "/dashboard",
            element: (
              <PermissionRoute resource="dashboard">
                <DashboardPage />
              </PermissionRoute>
            ),
          },
          {
            path: "/users",
            element: (
              <PermissionRoute resource="user">
                <UsersPage />
              </PermissionRoute>
            ),
          },
        ],
      },
      // Movie page — full-screen, no AppLayout sidebar
      {
        path: "/movie",
        element: <MoviePageWrapper MoviePage={MoviePage} />,
        errorElement: <RouteErrorPage />,
      },
      // Music page — full-screen, no AppLayout sidebar
      {
        path: "/music",
        element: <MusicPageWrapper />,
        errorElement: <RouteErrorPage />,
      },
      // Messenger — full-screen, no AppLayout sidebar
      {
        path: "/messenger",
        element: <MessengerPageWrapper />,
        errorElement: <RouteErrorPage />,
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
