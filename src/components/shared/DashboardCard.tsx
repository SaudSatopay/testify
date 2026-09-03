import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  tone?: "default" | "primary" | "accent" | "success" | "warning";
  className?: string;
}

const toneText: Record<NonNullable<DashboardCardProps["tone"]>, string> = {
  default: "text-muted-foreground",
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
};

/** Editorial stat tile: heavy top rule, expanded-caps label, big mono figure. */
export function DashboardCard({
  title,
  value,
  icon: Icon,
  hint,
  loading = false,
  tone = "primary",
  className,
}: DashboardCardProps) {
  return (
    <div className={cn("rule-top bg-transparent pt-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow text-muted-foreground">{title}</p>
        <Icon className={cn("h-4 w-4 shrink-0", toneText[tone])} aria-hidden="true" />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-10 w-24" />
      ) : (
        <p className="score-mono mt-1.5 text-[2.4rem] font-bold leading-none">{value}</p>
      )}
      {hint && !loading && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
