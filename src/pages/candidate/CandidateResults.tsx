import { Link } from "react-router-dom";
import { ArrowRight, BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { RecommendationBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { formatDate, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resultsService } from "@/services/resultsService";

export default function CandidateResults() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data, loading, error, reload } = useAsync(() => resultsService.listForCandidate(userId), [userId]);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Results" description="Every completed interview and assessment, with full AI feedback." />

      {data.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No results yet"
          description="Complete a mock interview or assessment and your scores will appear here."
          action={
            <Button asChild size="sm">
              <Link to="/candidate/mock-interview">Start a practice interview</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((result) => {
            const typeMeta = INTERVIEW_TYPES.find((t) => t.value === result.interview?.type);
            return (
              <Link key={result.id} to={`/candidate/results/${result.interview_id}`} className="group">
                <Card className="card-hover h-full">
                  <CardContent className="flex items-center gap-5 p-5">
                    <div
                      className={cn(
                        "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border bg-muted/40",
                      )}
                    >
                      <span className={cn("score-mono text-xl font-bold", scoreTextClass(result.overall_score))}>
                        {result.overall_score != null ? Math.round(result.overall_score) : "—"}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">overall</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{result.interview?.title ?? "Interview"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(result.created_at)}
                        {result.interview?.job_role ? ` · ${result.interview.job_role}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {typeMeta && <Badge variant="secondary">{typeMeta.label}</Badge>}
                        <RecommendationBadge recommendation={result.recommendation} />
                      </div>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
