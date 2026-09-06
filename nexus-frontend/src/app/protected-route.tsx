import { Navigate, Outlet } from "react-router-dom";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/use-auth";
import type { Role } from "@/shared/types/api";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/integrations" replace />;

  return <Outlet />;
}
