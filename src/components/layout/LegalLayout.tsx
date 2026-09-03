import { Link } from "react-router-dom";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
  title: string;
  updated?: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, updated = "September 2026", children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-foreground bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Testify home">
            <Logo />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rule-top pt-5">
          <h1 className="font-display text-4xl font-black tracking-tight">{title}</h1>
          <p className="eyebrow mt-3 text-muted-foreground">Last updated: {updated}</p>
        </div>
        <div className="prose-sm mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
        <nav className="mt-14 flex flex-wrap gap-4 border-t pt-6 text-sm text-muted-foreground" aria-label="Legal pages">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/security" className="hover:text-foreground">Security</Link>
          <Link to="/ai-disclosure" className="hover:text-foreground">AI Disclosure</Link>
        </nav>
      </main>
    </div>
  );
}
