import { KeyRound, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConfigRequiredCardProps {
  title?: string;
  message?: string;
  /** e.g. "OPENAI_API_KEY or ANTHROPIC_API_KEY" */
  secretHint?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shown when an external integration (AI provider, transcription, email)
 * has not been configured yet — instead of faking results.
 */
export function ConfigRequiredCard({
  title = "AI provider not configured",
  message = "This feature needs an AI provider key configured on the server. No fake results are shown — connect a provider to enable it.",
  secretHint = "OPENAI_API_KEY or ANTHROPIC_API_KEY",
  onRetry,
  className,
}: ConfigRequiredCardProps) {
  return (
    <Card className={cn("border-warning/30 bg-warning/5", className)}>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15">
          <KeyRound className="h-6 w-6 text-warning" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="w-full max-w-md rounded-lg border bg-card p-3 text-left">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            Configure as a Supabase Edge Function secret
          </p>
          <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded bg-muted px-2 py-1.5 font-mono text-xs">
            supabase secrets set {secretHint}
          </code>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Check again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
