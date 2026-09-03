import { Progress } from "@/components/ui/progress";
import { formatScore, scoreBarClass, scoreLabel, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  score: number | null | undefined;
  hint?: string;
  className?: string;
}

/** Compact labelled score bar used across results and reports. */
export function ScoreCard({ label, score, hint, className }: ScoreCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-card", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={cn("score-mono text-lg font-bold", scoreTextClass(score))}>{formatScore(score)}</p>
      </div>
      <Progress
        value={score ?? 0}
        className="mt-2 h-1.5"
        indicatorClassName={scoreBarClass(score)}
        aria-label={`${label}: ${formatScore(score)}`}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">{hint ?? scoreLabel(score)}</p>
    </div>
  );
}

interface ScoreRingProps {
  score: number | null | undefined;
  size?: number;
  label?: string;
  className?: string;
}

/** Circular overall-score dial. */
export function ScoreRing({ score, size = 132, label = "Overall", className }: ScoreRingProps) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = circumference * (1 - pct / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} score ${formatScore(score)}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={9}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score == null ? circumference : offset}
          className="stroke-primary transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("score-mono text-3xl font-bold", scoreTextClass(score))}>
          {score == null ? "—" : Math.round(score)}
          {score != null && <span className="text-base font-semibold">%</span>}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
