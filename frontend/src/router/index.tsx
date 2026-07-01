/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
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
const WordMatchPage = lazy(() => import("@pages/wordmatch/WordMatchPage").then((m) => ({ default: m.WordMatchPage })));
const WordChainPage = lazy(() => import("@pages/wordchain/WordChainPage"));
const AutoTaskPage = lazy(() => import("@pages/autotask/AutoTaskPage").then((m) => ({ default: m.AutoTaskPage })));
const SecuritySettingsPage = lazy(() => import("@pages/settings/SecuritySettingsPage"));

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
          { path: "/wordmatch", element: <Suspense fallback={null}><WordMatchPage /></Suspense> },
          { path: "/word-chain", element: <Suspense fallback={null}><WordChainPage /></Suspense> },
          { path: "/auto-task", element: <Suspense fallback={null}><AutoTaskPage /></Suspense> },
          { path: "/settings/security", element: <Suspense fallback={null}><SecuritySettingsPage /></Suspense> },
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
