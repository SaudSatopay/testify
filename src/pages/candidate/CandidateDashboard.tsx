import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CalendarDays,
  ClipboardCheck,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { ProgressLineChart, type SeriesPoint } from "@/components/shared/ScoreChart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { CONFIDENCE_DISCLAIMER } from "@/lib/constants";
import { formatDate, formatDateTime, formatScore, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { interviewService } from "@/services/interviewService";
import { resultsService } from "@/services/resultsService";

export default function CandidateDashboard() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? "";

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [stats, upcoming, results, progress] = await Promise.all([
        interviewService.candidateStats(userId),
        interviewService.listForCandidate(userId),
        resultsService.listForCandidate(userId),
        resultsService.progressForCandidate(userId),
      ]);
      return { stats, upcoming, results, progress };
    },
    [userId],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const { stats, upcoming, results, progress } = data;
  const upcomingList = upcoming.filter((i) => i.status === "scheduled" || i.status === "active").slice(0, 5);
  const recentResults = results.slice(0, 5);

  const chartData: SeriesPoint[] = progress.map((r, i) => ({
    label: formatDate(r.created_at) === "—" ? `#${i + 1}` : formatDate(r.created_at),
    Overall: r.overall_score,
    Technical: r.technical_score,
    Communication: r.communication_score,
    "Confidence indicator": r.confidence_score,
  }));

  // Recommend practice targeting the weakest recent dimension.
  const latest = progress[progress.length - 1];
  const weakest = latest
    ? ([
        ["Technical", latest.technical_score, "technical"],
        ["Communication", latest.communication_score, "hr"],
        ["Behavioral", latest.behavioral_score, "behavioral"],
      ] as const)
        .filter(([, score]) => score != null)
        .sort((a, b) => (a[1] ?? 101) - (b[1] ?? 101))[0]
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        description="Here's how your interview practice is going."
        actions={
          <>
            <Button asChild>
              <Link to="/candidate/mock-interview">
                <Sparkles aria-hidden="true" /> Start AI Interview
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/candidate/assessments">
                <ListChecks aria-hidden="true" /> Take MCQ
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/candidate/interviews">View Interviews</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Interviews completed" value={stats.completed} icon={ClipboardCheck} tone="primary" />
        <DashboardCard
          title="Average score"
          value={stats.averageScore != null ? formatScore(stats.averageScore) : "—"}
          icon={Target}
          tone="accent"
        />
        <DashboardCard title="Practice sessions" value={stats.practiceSessions} icon={Sparkles} tone="warning" />
        <DashboardCard
          title="Best score"
          value={stats.bestScore != null ? formatScore(stats.bestScore) : "—"}
          icon={Award}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        {/* Progress chart */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              Score progress
            </CardTitle>
            <Badge variant="secondary">{progress.length} results</Badge>
          </CardHeader>
          <CardContent>
            {chartData.length >= 2 ? (
              <>
                <ProgressLineChart
                  data={chartData}
                  series={[
                    { key: "Overall", label: "Overall" },
                    { key: "Technical", label: "Technical" },
                    { key: "Communication", label: "Communication" },
                    { key: "Confidence indicator", label: "Confidence indicator" },
                  ]}
                />
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{CONFIDENCE_DISCLAIMER}</p>
              </>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Not enough data yet"
                description="Complete at least two interviews or practice sessions to see your progress over time."
                action={
                  <Button asChild size="sm">
                    <Link to="/candidate/mock-interview">Start practicing</Link>
                  </Button>
                }
                className="border-0 bg-transparent py-10"
              />
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              Upcoming interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming interviews. Invitations you accept will appear here.
              </p>
            ) : (
              upcomingList.map((interview) => (
                <Link
                  key={interview.id}
                  to={`/candidate/interview/${interview.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{interview.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : "Not scheduled"}
                      {interview.creator ? ` · ${interview.creator.full_name}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={interview.status} />
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        {/* Recent results */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent results</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Your interview results will appear here after your first session.
              </p>
            ) : (
              <ul className="divide-y">
                {recentResults.map((result) => (
                  <li key={result.id}>
                    <Link
                      to={`/candidate/results/${result.interview_id}`}
                      className="flex items-center gap-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span
                        className={cn(
                          "score-mono w-14 shrink-0 text-lg font-bold",
                          scoreTextClass(result.overall_score),
                        )}
                      >
                        {formatScore(result.overall_score)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{result.interview?.title ?? "Interview"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(result.created_at)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recommended practice */}
        <Card className="bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Recommended practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakest ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Your recent <span className="font-medium text-foreground">{weakest[0].toLowerCase()}</span> score was{" "}
                  <span className={cn("score-mono font-semibold", scoreTextClass(weakest[1]))}>
                    {formatScore(weakest[1])}
                  </span>
                  . A focused session can move it fastest.
                </p>
                <Button asChild className="w-full">
                  <Link to={`/candidate/mock-interview?mode=${weakest[2]}`}>
                    Practice {weakest[0].toLowerCase()} questions
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Start with a mixed mock interview to establish your baseline — we'll recommend focus areas from there.
              </p>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/candidate/assessments">Take a quick MCQ round</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
