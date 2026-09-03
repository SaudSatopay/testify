import { Link } from "react-router-dom";
import { ArrowRight, FileBarChart } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { RecommendationBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate, formatScore, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { attachPeople } from "@/services/interviewService";
import { resultsService } from "@/services/resultsService";

export default function InterviewerReports() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data, loading, error, reload } = useAsync(
    async () => {
      const results = await resultsService.listForCreator(userId);
      const interviews = results
        .map((r) => r.interview)
        .filter((i): i is NonNullable<typeof i> => i !== null);
      const withPeople = await attachPeople(interviews);
      const peopleByInterview = new Map(withPeople.map((i) => [i.id, i]));
      return results.map((r) => ({ ...r, interviewWithPeople: peopleByInterview.get(r.interview_id) ?? null }));
    },
    [userId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Finalized candidate results across your interviews. Open one for the full report and PDF export."
      />

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="No reports yet"
          description="Reports appear here after interviews are completed and scored."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden md:table-cell">Interview</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead className="hidden sm:table-cell">Recommendation</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <p className="font-medium">
                        {result.interviewWithPeople?.candidate?.full_name ?? "Candidate"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.interviewWithPeople?.candidate?.email ?? ""}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {result.interview?.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className={cn("score-mono text-base font-bold", scoreTextClass(result.overall_score))}>
                        {formatScore(result.overall_score)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <RecommendationBadge recommendation={result.recommendation} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatDate(result.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/interviewer/interviews/${result.interview_id}`}>
                          Open <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
