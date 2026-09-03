import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { ProgressLineChart, ScoreBarChart, StatusBarChart, type SeriesPoint } from "@/components/shared/ScoreChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync } from "@/hooks/useAsync";
import { supabase } from "@/integrations/supabase/client";
import { INTERVIEW_STATUS_META } from "@/lib/constants";
import { safeAverage } from "@/lib/utils";
import { adminService } from "@/services/adminService";

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function lastSixMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default function AdminAnalytics() {
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [stats, interviewsRes, resultsRes, usersRes] = await Promise.all([
        adminService.platformStats(),
        supabase.from("interviews").select("id, status, created_at").limit(2000),
        supabase
          .from("interview_results")
          .select("overall_score, technical_score, communication_score, problem_solving_score, behavioral_score, mcq_score, confidence_score, created_at")
          .limit(2000),
        supabase.from("profiles").select("id, created_at").limit(5000),
      ]);
      if (interviewsRes.error) throw new Error(interviewsRes.error.message);
      if (resultsRes.error) throw new Error(resultsRes.error.message);
      if (usersRes.error) throw new Error(usersRes.error.message);
      return {
        stats,
        interviews: interviewsRes.data ?? [],
        results: resultsRes.data ?? [],
        users: usersRes.data ?? [],
      };
    },
    [],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const months = lastSixMonths();
  const monthLabel = (m: string) =>
    new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });

  const growthData: SeriesPoint[] = months.map((m) => ({
    label: monthLabel(m),
    Interviews: data.interviews.filter((i) => monthKey(i.created_at) === m).length,
    "New users": data.users.filter((u) => monthKey(u.created_at) === m).length,
  }));

  const statusData = Object.keys(INTERVIEW_STATUS_META).map((status) => ({
    label: INTERVIEW_STATUS_META[status].label,
    statusKey: status,
    value: data.interviews.filter((i) => i.status === status).length,
  }));

  const dimensionData = [
    { label: "Overall", value: safeAverage(data.results.map((r) => r.overall_score)) },
    { label: "Technical", value: safeAverage(data.results.map((r) => r.technical_score)) },
    { label: "Communication", value: safeAverage(data.results.map((r) => r.communication_score)) },
    { label: "Problem solving", value: safeAverage(data.results.map((r) => r.problem_solving_score)) },
    { label: "Behavioral", value: safeAverage(data.results.map((r) => r.behavioral_score)) },
    { label: "MCQ", value: safeAverage(data.results.map((r) => r.mcq_score)) },
  ].filter((d) => d.value != null);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Platform trends over the last six months." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Growth</CardTitle>
            <CardDescription>Interviews created and new users per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressLineChart
              data={growthData}
              series={[
                { key: "Interviews", label: "Interviews" },
                { key: "New users", label: "New users" },
              ]}
              yDomain={[0, Math.max(5, ...growthData.map((d) => Math.max(Number(d.Interviews) || 0, Number(d["New users"]) || 0))) + 2]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Interviews by status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBarChart data={statusData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Average scores by dimension</CardTitle>
          <CardDescription>
            Across {data.results.length} finalized results. The confidence indicator is an AI communication signal, not a
            psychological measurement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dimensionData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No finalized results yet.</p>
          ) : (
            <ScoreBarChart data={dimensionData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
