import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, MailCheck } from "lucide-react";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const result = await resetPassword(parsed.data);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you registered with and we'll send you a reset link."
    >
      {sent ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <MailCheck className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a password reset
            link is on its way.
          </p>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Send reset link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
