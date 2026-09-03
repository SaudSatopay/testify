import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarCheck2, CircleAlert, Loader2 } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { invitationService } from "@/services/invitationService";

/**
 * Landing page for interview invitation links (/invite/:token).
 * Requires a signed-in candidate; the accept RPC validates token, expiry,
 * and email match server-side.
 */
export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "accepting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (loading || !token || attemptedRef.current) return;
    if (!session) return; // rendered below: sign-in prompt
    if (role && role !== "candidate") {
      setStatus("error");
      setError("Invitations can only be accepted by candidate accounts. You are signed in as " + role + ".");
      return;
    }
    if (!role) return; // profile still resolving
    attemptedRef.current = true;
    setStatus("accepting");
    invitationService
      .accept(token)
      .then((interviewId) => {
        navigate(`/candidate/interview/${interviewId}`, { replace: true });
      })
      .catch((err: unknown) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "This invitation could not be accepted.");
      });
  }, [loading, session, role, token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid-light px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            {!session && !loading ? (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CalendarCheck2 className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h1 className="mt-4 text-lg font-semibold">You've been invited to an interview</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in (or create a candidate account with the invited email) to accept this invitation.
                </p>
                <div className="mt-6 grid gap-2">
                  <Button asChild>
                    <Link to="/login" state={{ from: `/invite/${token}` }}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/register?role=candidate">Create account</Link>
                  </Button>
                </div>
              </>
            ) : status === "error" ? (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <CircleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <h1 className="mt-4 text-lg font-semibold">Invitation problem</h1>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                <Button asChild variant="outline" className="mt-6">
                  <Link to="/">Back to home</Link>
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                <p className="mt-4 text-sm text-muted-foreground">Verifying your invitation…</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
