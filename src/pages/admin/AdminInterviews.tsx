import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { InterviewTable } from "@/components/tables/InterviewTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/useAsync";
import { INTERVIEW_STATUS_META } from "@/lib/constants";
import { errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import type { InterviewWithPeople } from "@/types";

const PAGE_SIZE = 15;

export default function AdminInterviews() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<InterviewWithPeople | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => interviewService.listAll(page, PAGE_SIZE, statusFilter),
    [page, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await interviewService.remove(deleting.id);
      toast.success("Interview deleted");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Interviews" description="All interviews across the platform." />

      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-44" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(INTERVIEW_STATUS_META).map(([value, meta]) => (
            <SelectItem key={value} value={value}>
              {meta.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No interviews found" />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <InterviewTable
                interviews={data.rows}
                showCreator
                onView={(i) => navigate(`/interviewer/interviews/${i.id}`)}
                onDelete={setDeleting}
              />
            </CardContent>
          </Card>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {data.count} interviews
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this interview?"
        description={`"${deleting?.title}" and all its data will be permanently deleted.`}
        confirmLabel="Delete permanently"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
