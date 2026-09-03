import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, Plus, Target, Users, Video } from "lucide-react";

import { DashboardCard } from "@/components/shared/DashboardCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { ScoreBarChart, StatusBarChart } from "@/components/shared/ScoreChart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { INTERVIEW_STATUS_META } from "@/lib/constants";
import { formatDateTime, formatScore } from "@/lib/format";
import { safeAverage } from "@/lib/utils";
import { interviewService } from "@/services/interviewService";
import { resultsService } from "@/services/resultsService";

export default function InterviewerDashboard() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? "";

  const { data, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        interviewService.interviewerStats(userId),
        interviewService.listCreatedBy(userId),
        resultsService.listForCreator(userId),
      ]),
    [userId],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const [stats, interviews, results] = data;
  const upcoming = interviews
    .filter((i) => i.status === "scheduled" || i.status === "active")
    .slice(0, 8);

  const statusData = Object.keys(INTERVIEW_STATUS_META).map((status) => ({
    label: INTERVIEW_STATUS_META[status].label,
    statusKey: status,
    value: interviews.filter((i) => i.status === status).length,
  }));

  const recentResults = results.slice(0, 12);
  const scoreBreakdown = [
    { label: "Overall", value: safeAverage(recentResults.map((r) => r.overall_score)) },
    { label: "Technical", value: safeAverage(recentResults.map((r) => r.technical_score)) },
    { label: "Communication", value: safeAverage(recentResults.map((r) => r.communication_score)) },
    { label: "Problem solving", value: safeAverage(recentResults.map((r) => r.problem_solving_score)) },
    { label: "Behavioral", value: safeAverage(recentResults.map((r) => r.behavioral_score)) },
  ].filter((d) => d.value != null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "Interviewer"}`}
        description="Your interview pipeline at a glance."
        actions={
          <Button asChild>
            <Link to="/interviewer/interviews/create">
              <Plus aria-hidden="true" /> Create interview
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Total interviews" value={stats.total} icon={Video} tone="primary" />
        <DashboardCard title="Upcoming" value={stats.upcoming} icon={CalendarDays} tone="accent" />
        <DashboardCard title="Completed" value={stats.completed} icon={CheckCircle2} tone="success" />
        <DashboardCard title="Candidates" value={stats.candidates} icon={Users} tone="warning" />
        <DashboardCard
          title="Avg candidate score"
          value={stats.averageScore != null ? formatScore(stats.averageScore) : "—"}
          icon={Target}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Interview pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {interviews.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No interviews yet — create your first one to see pipeline stats.
              </p>
            ) : (
              <StatusBarChart data={statusData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Average candidate scores (recent results)</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Score breakdowns appear after your first completed interviews.
              </p>
            ) : (
              <ScoreBarChart data={scoreBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Upcoming interviews</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/interviewer/interviews">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing scheduled. Create an interview and invite a candidate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell>
                      <p className="font-medium">{interview.candidate?.full_name ?? "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground">{interview.title}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{interview.job_role ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={interview.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {interview.type === "live" && (
                          <Button asChild size="sm">
                            <Link to={`/interviewer/live/${interview.id}`}>Join</Link>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/interviewer/interviews/${interview.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
