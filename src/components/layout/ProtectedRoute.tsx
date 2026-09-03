import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { FullPageLoader } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { roleHome, useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/constants";

function SuspendedScreen() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">Account suspended</h1>
        <p className="text-sm text-muted-foreground">
          Your Testify account has been suspended by an administrator. If you believe this is a
          mistake, please contact support.
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

interface ProtectedRouteProps {
  /** Roles allowed to view the nested routes. Empty/omitted = any authenticated user. */
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, role, loading, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Session exists but the profile row is still being fetched.
  if (!profile) return <FullPageLoader />;

  if (isSuspended) return <SuspendedScreen />;

  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={roleHome(role)} replace />;
  }

  return <Outlet />;
}
