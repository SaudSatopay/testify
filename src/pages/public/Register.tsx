import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, GraduationCap, MailCheck, MonitorPlay } from "lucide-react";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type RegisterRole = "candidate" | "interviewer";

/**
 * Public registration offers only candidate/interviewer. The admin role can
 * never be self-assigned — the database trigger enforces this server-side.
 */
export default function Register() {
  const { signUp, session, role: authRole, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [role, setRole] = useState<RegisterRole>(params.get("role") === "interviewer" ? "interviewer" : "candidate");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"fullName" | "email" | "password", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    if (!loading && session && authRole) navigate(roleHome(authRole), { replace: true });
  }, [loading, session, authRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "fullName" || key === "email" || key === "password") next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await signUp({ ...parsed.data, role });
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    // If email confirmation is enabled there's no session yet — show guidance.
    setAwaitingConfirmation(true);
  };

  if (awaitingConfirmation && !session) {
    return (
      <AuthLayout title="Check your email">
        <div className="rounded-xl border bg-card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <MailCheck className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Confirm your
            address, then sign in.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
        {formError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium">I want to…</legend>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            {(
              [
                { value: "candidate", icon: GraduationCap, title: "Practice & interview", caption: "Candidate" },
                { value: "interviewer", icon: MonitorPlay, title: "Run interviews", caption: "Interviewer" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={role === option.value}
                onClick={() => setRole(option.value)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  role === option.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-input bg-card hover:border-muted-foreground/30",
                )}
              >
                <option.icon
                  className={cn("h-5 w-5", role === option.value ? "text-primary" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-semibold">{option.caption}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.title}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Alex Johnson"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link to="/terms" className="font-medium text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
