import { Badge } from "@/components/ui/badge";
import { INTERVIEW_STATUS_META, RECOMMENDATION_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = INTERVIEW_STATUS_META[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-transparent",
  };
  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

export function RecommendationBadge({ recommendation, className }: { recommendation: string | null; className?: string }) {
  if (!recommendation) return null;
  const meta = RECOMMENDATION_META[recommendation] ?? {
    label: recommendation,
    className: "bg-muted text-muted-foreground border-transparent",
  };
  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}
