/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import NotFound from "@pages/NotFound";
import { AuthGuard, GuestGuard } from "./AuthGuard";
import MoviePageWrapper from "./MoviePageWrapper";
import MessengerPageWrapper from "./MessengerPageWrapper";
import MusicPageWrapper from "./MusicPageWrapper";
import { RouteErrorPage } from "@components/common/RouteErrorPage";
import { PermissionRoute } from "@components/common/PermissionRoute";

const LoginPage = lazy(() => import("@pages/auth/Login").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@pages/auth/Register").then((m) => ({ default: m.RegisterPage })));
const LandingPage = lazy(() => import("@pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import("@pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import("@pages/users/UsersPage").then((m) => ({ default: m.UsersPage })));
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
      { path: "/login", element: <Suspense fallback={null}><LoginPage /></Suspense> },
      { path: "/register", element: <Suspense fallback={null}><RegisterPage /></Suspense> },
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
          { path: "/", element: <Suspense fallback={null}><LandingPage /></Suspense> },
          { path: "/wordmatch", element: <Suspense fallback={null}><WordMatchPage /></Suspense> },
          { path: "/word-chain", element: <Suspense fallback={null}><WordChainPage /></Suspense> },
          { path: "/auto-task", element: <Suspense fallback={null}><AutoTaskPage /></Suspense> },
          { path: "/settings/security", element: <Suspense fallback={null}><SecuritySettingsPage /></Suspense> },
          {
            path: "/dashboard",
            element: (
              <PermissionRoute resource="dashboard">
                <Suspense fallback={null}><DashboardPage /></Suspense>
              </PermissionRoute>
            ),
          },
          {
            path: "/users",
            element: (
              <PermissionRoute resource="user">
                <Suspense fallback={null}><UsersPage /></Suspense>
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
