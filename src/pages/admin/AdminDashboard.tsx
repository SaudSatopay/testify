import { Link } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  MonitorPlay,
  Target,
  Users,
} from "lucide-react";

import { DashboardCard } from "@/components/shared/DashboardCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { ScoreBarChart } from "@/components/shared/ScoreChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync } from "@/hooks/useAsync";
import { formatRelative, formatScore } from "@/lib/format";
import { adminService } from "@/services/adminService";

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([adminService.platformStats(), adminService.auditLogs(0, 10)]),
    [],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const [stats, audit] = data;

  const roleData = [
    { label: "Candidates", value: stats.candidates },
    { label: "Interviewers", value: stats.interviewers },
    { label: "Admins", value: stats.admins },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="Live statistics across the whole Testify workspace."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/analytics">Full analytics</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total users"
          value={stats.total_users}
          hint={`+${stats.users_last_30_days} in the last 30 days`}
          icon={Users}
          tone="primary"
        />
        <DashboardCard title="Candidates" value={stats.candidates} icon={GraduationCap} tone="accent" />
        <DashboardCard title="Interviewers" value={stats.interviewers} icon={MonitorPlay} tone="warning" />
        <DashboardCard
          title="Interviews"
          value={stats.total_interviews}
          hint={`+${stats.interviews_last_30_days} in the last 30 days`}
          icon={CalendarDays}
          tone="primary"
        />
        <DashboardCard title="Completed interviews" value={stats.completed_interviews} icon={CheckCircle2} tone="success" />
        <DashboardCard
          title="Average score"
          value={stats.avg_overall_score != null ? formatScore(stats.avg_overall_score) : "—"}
          icon={Target}
          tone="accent"
        />
        <DashboardCard title="Question bank" value={stats.total_questions} icon={Activity} tone="default" />
        <DashboardCard title="MCQ attempts" value={stats.total_attempts} icon={Activity} tone="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Users by role</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreBarChart data={roleData} counts />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/audit-logs">All logs</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {audit.rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No audit activity recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {audit.rows.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 py-2.5">
                    <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
                      {log.action}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {log.resource_type ?? ""} {log.resource_id ? `· ${log.resource_id.slice(0, 8)}…` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(log.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
