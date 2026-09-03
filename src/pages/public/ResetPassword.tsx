import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleHome, useAuth } from "@/hooks/useAuth";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

/**
 * Landing page for the Supabase recovery link — the recovery token in the
 * URL establishes a session automatically (detectSessionInUrl).
 */
export default function ResetPassword() {
  const { updatePassword, session, role } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your input.");
      return;
    }
    if (!session) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(parsed.data.password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Password updated");
    navigate(roleHome(role));
  };

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
        {!session && (
          <Alert variant="warning">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>
              Waiting for your reset link session… If you opened this page directly,{" "}
              <Link to="/forgot-password" className="font-medium underline">
                request a new link
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
