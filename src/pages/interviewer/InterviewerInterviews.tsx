import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";

import { InterviewTable } from "@/components/tables/InterviewTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { INTERVIEW_STATUS_META } from "@/lib/constants";
import { errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import type { InterviewWithPeople } from "@/types";

export default function InterviewerInterviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, loading, error, reload, setData } = useAsync(
    () => interviewService.listCreatedBy(userId),
    [userId],
  );

  const [rescheduling, setRescheduling] = useState<InterviewWithPeople | null>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [cancelling, setCancelling] = useState<InterviewWithPeople | null>(null);
  const [deleting, setDeleting] = useState<InterviewWithPeople | null>(null);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const term = debouncedSearch.trim().toLowerCase();
    return rows.filter((interview) => {
      if (statusFilter !== "all" && interview.status !== statusFilter) return false;
      if (!term) return true;
      return (
        interview.title.toLowerCase().includes(term) ||
        (interview.candidate?.full_name.toLowerCase().includes(term) ?? false) ||
        (interview.job_role?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [data, debouncedSearch, statusFilter]);

  const applyPatch = (id: string, patch: Partial<InterviewWithPeople>) => {
    setData((prev) => (prev ? prev.map((i) => (i.id === id ? { ...i, ...patch } : i)) : prev));
  };

  const handleReschedule = async () => {
    if (!rescheduling || !newDateTime) return;
    setSavingReschedule(true);
    try {
      const iso = new Date(newDateTime).toISOString();
      await interviewService.update(rescheduling.id, { scheduled_at: iso, status: "scheduled" });
      applyPatch(rescheduling.id, { scheduled_at: iso, status: "scheduled" });
      toast.success("Interview rescheduled");
      setRescheduling(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    try {
      await interviewService.end(cancelling.id, "cancelled");
      applyPatch(cancelling.id, { status: "cancelled" });
      toast.success("Interview cancelled");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await interviewService.remove(deleting.id);
      setData((prev) => (prev ? prev.filter((i) => i.id !== deleting.id) : prev));
      toast.success("Interview deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Everything you've created — drafts, scheduled sessions, and history."
        actions={
          <Button asChild>
            <Link to="/interviewer/interviews/create">
              <Plus aria-hidden="true" /> Create interview
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title, candidate, or role…"
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
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
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={search || statusFilter !== "all" ? "No interviews match your filters" : "No interviews yet"}
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your search or status filter."
              : "Create your first interview and invite a candidate."
          }
          action={
            !search &&
            statusFilter === "all" && (
              <Button asChild size="sm">
                <Link to="/interviewer/interviews/create">Create interview</Link>
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <InterviewTable
              interviews={filtered}
              onView={(i) => navigate(`/interviewer/interviews/${i.id}`)}
              onJoin={(i) => navigate(`/interviewer/live/${i.id}`)}
              onReschedule={(i) => {
                setRescheduling(i);
                setNewDateTime(i.scheduled_at ? i.scheduled_at.slice(0, 16) : "");
              }}
              onCancel={setCancelling}
              onDelete={setDeleting}
            />
          </CardContent>
        </Card>
      )}

      {/* Reschedule dialog */}
      <Dialog open={Boolean(rescheduling)} onOpenChange={(open) => !open && setRescheduling(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-datetime">New date &amp; time</Label>
            <Input
              id="new-datetime"
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleReschedule()} loading={savingReschedule} disabled={!newDateTime}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel this interview?"
        description={`"${cancelling?.title}" will be marked cancelled. The candidate will see it as cancelled.`}
        confirmLabel="Cancel interview"
        destructive
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this interview?"
        description={`"${deleting?.title}" and all its responses, analysis, and results will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete permanently"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
