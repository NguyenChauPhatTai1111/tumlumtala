import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@hooks/user/useCurrentUser";
import {
  hasAnyPermissionForResource,
  isAdminIdentity,
} from "@/utils/permissionAccess";

interface PermissionRouteProps {
  children: ReactNode;
  resource: string;
  fallbackPath?: string;
}

export function PermissionRoute({
  children,
  resource,
  fallbackPath = "/",
}: PermissionRouteProps) {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return null;
  }

  if (!isAdminIdentity(user) && !hasAnyPermissionForResource(user, resource)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
