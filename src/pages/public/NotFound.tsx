import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { roleHome, useAuth } from "@/hooks/useAuth";

export default function NotFound() {
  const { session, role } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-grid-light px-4 text-center">
      <Logo className="mb-10" />
      <p className="font-mono text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold">This page doesn't exist</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The link may be broken, or the page may have been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild variant="outline">
          <Link to="/">
            <Compass aria-hidden="true" /> Home
          </Link>
        </Button>
        {session && (
          <Button asChild>
            <Link to={roleHome(role)}>Go to dashboard</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
