import { Link } from "react-router-dom";

import { Logo } from "@/components/layout/Logo";
import { CircularSeal } from "@/components/shared/Stamp";

const POINTS = [
  "Adaptive AI mock interviews for 14+ roles",
  "Per-answer analysis with actionable feedback",
  "Consent-first recording and row-level security",
];

interface AuthLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr,1fr]">
      {/* Editorial brand panel */}
      <div className="texture-paper relative hidden overflow-hidden border-r-2 border-foreground bg-secondary lg:block">
        <div className="relative flex h-full flex-col p-12">
          <Link to="/" aria-label="Testify home">
            <Logo />
          </Link>
          <div className="my-auto max-w-md">
            <p className="flex items-center gap-3">
              <span className="h-[2px] w-10 bg-foreground" aria-hidden="true" />
              <span className="eyebrow text-primary">The hiring record</span>
            </p>
            <h2 className="mt-5 font-display text-5xl font-black leading-[1.02] tracking-tight">
              Smarter <span className="italic text-primary">Interviews</span>.
              <br />
              Better Decisions.
            </h2>
            <p className="mt-5 text-muted-foreground">
              Practice, interview, and decide with a platform built on transparent AI analysis.
            </p>
            <ol className="mt-10 space-y-4">
              {POINTS.map((point, i) => (
                <li key={point} className="flex items-baseline gap-4 border-t border-foreground/15 pt-3.5 text-sm font-semibold">
                  <span className="score-mono text-xs font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
                  {point}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-end justify-between">
            <p className="eyebrow max-w-[260px] leading-relaxed text-muted-foreground">
              No recording ever starts without your explicit consent
            </p>
            <CircularSeal size={110} className="-rotate-6 text-primary/70" spinning={false} />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-background px-4 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden" aria-label="Testify home">
            <Logo />
          </Link>
          <Link
            to="/"
            className="eyebrow text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="rule-top pt-5">
            <h1 className="font-display text-4xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
