import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";

import { ReportViewer } from "@/components/reports/ReportViewer";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services/api";

export default function ResultDetail() {
  const { id } = useParams<{ id: string }>();
  const interviewId = id ?? "";

  const { data, loading, error, reload } = useAsync(
    () => api.generateReport(interviewId, true),
    [interviewId],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <ErrorState
        title="Couldn't load this report"
        message={error ?? "The report could not be generated."}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Interview report"
          description="Your full breakdown — scores, transcripts, and AI feedback."
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden="true" /> Download PDF
              </Button>
              <Button asChild variant="outline">
                <Link to="/candidate/mock-interview">
                  <Sparkles aria-hidden="true" /> Practice again
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/candidate/results">
                  <ArrowLeft aria-hidden="true" /> All results
                </Link>
              </Button>
            </>
          }
        />
      </div>
      <ReportViewer report={data.report} />
    </div>
  );
}
