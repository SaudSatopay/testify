import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

import { CandidateTable, type CandidateSummary } from "@/components/tables/CandidateTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { safeAverage } from "@/lib/utils";
import { interviewService } from "@/services/interviewService";
import { resultsService } from "@/services/resultsService";

export default function InterviewerCandidates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [interviews, results] = await Promise.all([
        interviewService.listCreatedBy(userId),
        resultsService.listForCreator(userId),
      ]);

      const map = new Map<string, CandidateSummary>();
      for (const interview of interviews) {
        if (!interview.candidate_id || !interview.candidate) continue;
        const existing = map.get(interview.candidate_id);
        const entry: CandidateSummary = existing ?? {
          profile: interview.candidate,
          interviewCount: 0,
          completedCount: 0,
          averageScore: null,
          lastInterviewAt: null,
          lastInterviewId: null,
        };
        entry.interviewCount += 1;
        if (interview.status === "completed") entry.completedCount += 1;
        const activityAt = interview.scheduled_at ?? interview.created_at;
        if (!entry.lastInterviewAt || activityAt > entry.lastInterviewAt) {
          entry.lastInterviewAt = activityAt;
          entry.lastInterviewId = interview.id;
        }
        map.set(interview.candidate_id, entry);
      }
      for (const [candidateId, entry] of map) {
        entry.averageScore = safeAverage(
          results.filter((r) => r.candidate_id === candidateId).map((r) => r.overall_score),
        );
      }
      return [...map.values()].sort((a, b) => (b.lastInterviewAt ?? "").localeCompare(a.lastInterviewAt ?? ""));
    },
    [userId],
  );

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (c) =>
        c.profile.full_name.toLowerCase().includes(term) || c.profile.email.toLowerCase().includes(term),
    );
  }, [data, debouncedSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Everyone who has taken (or is scheduled for) one of your interviews."
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search candidates…" className="max-w-xs" />

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No candidates match your search" : "No candidates yet"}
          description={
            search
              ? "Try a different name or email."
              : "Candidates appear here once they're assigned to your interviews via invitations."
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <CandidateTable
              candidates={filtered}
              onView={(c) =>
                navigate(c.lastInterviewId ? `/interviewer/interviews/${c.lastInterviewId}` : "/interviewer/interviews")
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
