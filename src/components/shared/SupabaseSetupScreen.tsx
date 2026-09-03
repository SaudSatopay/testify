import { Database, ExternalLink } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Rendered instead of the app when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * are missing, so the developer gets guidance rather than a broken screen.
 */
export function SupabaseSetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid-light px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="space-y-5 p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Connect Testify to Supabase</h1>
                <p className="text-sm text-muted-foreground">One-time setup — about 5 minutes.</p>
              </div>
            </div>

            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                Create a project at{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  supabase.com/dashboard <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                Apply the database schema: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">supabase db push</code>{" "}
                (migrations live in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">supabase/migrations</code>).
              </li>
              <li>
                Deploy the Edge Functions:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">supabase functions deploy</code>
              </li>
              <li>
                Copy <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.example</code> to{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code> and fill in your project URL and
                anon key (Dashboard → Project Settings → API).
              </li>
              <li>Restart the dev server.</li>
            </ol>

            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                VITE_SUPABASE_URL=https://your-project-ref.supabase.co
                <br />
                VITE_SUPABASE_ANON_KEY=your-anon-key
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Only the public anon key belongs in the frontend — AI provider keys and the service-role key are configured as
              Edge Function secrets. See <span className="font-medium text-foreground">SETUP.md</span> for the full guide.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
