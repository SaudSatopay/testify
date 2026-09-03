import { cn } from "@/lib/utils";

/* ==========================================================================
   The Testify stamp — the platform's signature motif. An inked circular
   seal (rotating ring text) and a rectangular verdict stamp used on
   reports ("STRONG HIRE", "VERIFIED", …).
   ========================================================================== */

interface SealProps {
  size?: number;
  className?: string;
  /** Ring text, repeated around the circle. */
  text?: string;
  spinning?: boolean;
}

/** Circular ring-text seal with the check mark at its center. */
export function CircularSeal({
  size = 120,
  className,
  text = "TESTIFY • SMARTER INTERVIEWS • BETTER DECISIONS •",
  spinning = true,
}: SealProps) {
  return (
    <span
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className={cn("absolute inset-0 h-full w-full", spinning && "animate-spin-slow")}
      >
        <defs>
          <path id="seal-circle" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <text fontSize="8.2" fontWeight="700" letterSpacing="1.6" fill="currentColor" fontFamily="Archivo, sans-serif">
          <textPath href="#seal-circle">{text}</textPath>
        </text>
      </svg>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <path
          d="M36 51l10 10.5L65 39"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const VERDICT_TONES: Record<string, string> = {
  strong_hire: "text-success border-success",
  hire: "text-primary border-primary",
  consider: "text-warning border-warning",
  no_hire: "text-destructive border-destructive",
};

const VERDICT_LABELS: Record<string, string> = {
  strong_hire: "Strong hire",
  hire: "Hire",
  consider: "Consider",
  no_hire: "Not recommended",
};

/** Rectangular inked verdict stamp for reports and result screens. */
export function VerdictStamp({
  verdict,
  className,
  animate = true,
}: {
  verdict: string | null;
  className?: string;
  animate?: boolean;
}) {
  if (!verdict) return null;
  const tone = VERDICT_TONES[verdict] ?? "text-muted-foreground border-muted-foreground";
  const label = VERDICT_LABELS[verdict] ?? verdict.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-block -rotate-[9deg] select-none border-[3px] px-3 py-1 opacity-90 mix-blend-multiply dark:mix-blend-screen",
        animate && "animate-stamp-in",
        tone,
        className,
      )}
      style={{ maskImage: "radial-gradient(circle at 30% 60%, black 92%, transparent 100%)" }}
      role="img"
      aria-label={`Recommendation: ${label}`}
    >
      <span className="eyebrow text-sm tracking-[0.22em]">{label}</span>
    </span>
  );
}
