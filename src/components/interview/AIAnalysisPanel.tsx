import { Lightbulb, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { CONFIDENCE_DISCLAIMER } from "@/lib/constants";
import { formatScore, scoreBarClass, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnswerAnalysis } from "@/types";

function MetricRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("score-mono text-sm font-semibold", scoreTextClass(value))}>{formatScore(value)}</span>
      </div>
      <Progress value={value ?? 0} className="mt-1 h-1.5" indicatorClassName={scoreBarClass(value)} aria-label={`${label} ${formatScore(value)}`} />
    </div>
  );
}

function BulletList({
  icon,
  title,
  items,
  toneClass,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  toneClass: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", toneClass)}>
        {icon}
        {title}
      </p>
      <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-foreground/90">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface AIAnalysisPanelProps {
  analysis: AnswerAnalysis;
  className?: string;
  compact?: boolean;
}

/** Per-answer AI analysis display, with the required indicator disclaimer. */
export function AIAnalysisPanel({ analysis, className, compact = false }: AIAnalysisPanelProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">AI answer analysis</h3>
        {analysis.overall_score != null && (
          <span className={cn("score-mono ml-auto text-sm font-bold", scoreTextClass(analysis.overall_score))}>
            {formatScore(analysis.overall_score)}
          </span>
        )}
      </div>

      <div className={cn("mt-3 grid gap-x-6 gap-y-2.5", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <MetricRow label="Relevance" value={analysis.relevance} />
        <MetricRow label="Technical accuracy" value={analysis.technical_accuracy} />
        <MetricRow label="Communication" value={analysis.communication} />
        <MetricRow label="Clarity" value={analysis.clarity} />
        <MetricRow label="Structure" value={analysis.structure} />
        <MetricRow label="Confidence indicator" value={analysis.confidence_indicator} />
      </div>

      {(analysis.speaking_pace != null || analysis.filler_word_count != null) && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {analysis.speaking_pace != null && (
            <span>
              Speaking pace: <span className="score-mono font-semibold text-foreground">{Math.round(analysis.speaking_pace)} wpm</span>
            </span>
          )}
          {analysis.filler_word_count != null && (
            <span>
              Filler words: <span className="score-mono font-semibold text-foreground">{analysis.filler_word_count}</span>
            </span>
          )}
        </div>
      )}

      {analysis.summary && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>}

      <div className="mt-4 space-y-4">
        <BulletList
          icon={<ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Strengths"
          items={analysis.strengths}
          toneClass="text-success"
        />
        <BulletList
          icon={<ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Areas to improve"
          items={analysis.weaknesses}
          toneClass="text-warning"
        />
        <BulletList
          icon={<Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />}
          title="Recommendations"
          items={analysis.recommendations}
          toneClass="text-primary"
        />
      </div>

      <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">{CONFIDENCE_DISCLAIMER}</p>
    </div>
  );
}
