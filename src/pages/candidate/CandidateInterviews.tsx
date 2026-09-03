import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, PlayCircle, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { formatDateTime, formatRelative } from "@/lib/format";
import { interviewService } from "@/services/interviewService";
import type { InterviewWithPeople } from "@/types";

function typeLabel(type: string): string {
  return INTERVIEW_TYPES.find((t) => t.value === type)?.label ?? type;
}

function interviewHref(interview: InterviewWithPeople): string {
  return interview.type === "mcq"
    ? `/candidate/mcq/${interview.id}`
    : `/candidate/interview/${interview.id}`;
}

function InterviewRow({ interview }: { interview: InterviewWithPeople }) {
  const joinable = interview.status === "scheduled" || interview.status === "active";
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{interview.title}</p>
          <Badge variant="secondary">{typeLabel(interview.type)}</Badge>
          <StatusBadge status={interview.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {interview.scheduled_at
            ? `${formatDateTime(interview.scheduled_at)} (${formatRelative(interview.scheduled_at)})`
            : "No scheduled time"}
          {interview.creator ? ` · Hosted by ${interview.creator.full_name}` : ""}
          {` · ${interview.duration_minutes} min`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {interview.status === "completed" ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/candidate/results/${interview.id}`}>
              View result <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : joinable ? (
          <Button asChild size="sm">
            <Link to={interviewHref(interview)}>
              <PlayCircle aria-hidden="true" /> {interview.status === "active" ? "Rejoin" : "Join"}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function CandidateInterviews() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        interviewService.listForCandidate(userId),
        interviewService.listPractice(userId),
      ]),
    [userId],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const [assigned, practice] = data;
  const upcoming = assigned.filter((i) => ["scheduled", "active", "draft"].includes(i.status));
  const past = assigned.filter((i) => ["completed", "cancelled"].includes(i.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Interviews you've been invited to, plus your own practice sessions."
        actions={
          <Button asChild>
            <Link to="/candidate/mock-interview">
              <Sparkles aria-hidden="true" /> New practice session
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="practice">Practice ({practice.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming interviews"
              description="When an interviewer invites you, accepted invitations show up here."
            />
          ) : (
            upcoming.map((interview) => <InterviewRow key={interview.id} interview={interview} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No past interviews yet" />
          ) : (
            past.map((interview) => <InterviewRow key={interview.id} interview={interview} />)
          )}
        </TabsContent>

        <TabsContent value="practice">
          {practice.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No practice sessions yet"
              description="AI mock interviews and MCQ practice you start yourself will be listed here."
              action={
                <Button asChild size="sm">
                  <Link to="/candidate/mock-interview">Start your first session</Link>
                </Button>
              }
            />
          ) : (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm text-muted-foreground">
                  {practice.length} practice session{practice.length === 1 ? "" : "s"}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-6 pt-2">
                {practice.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel(session.type)} · {formatRelative(session.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={session.status} />
                    {session.status === "completed" ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/candidate/results/${session.id}`}>Result</Link>
                      </Button>
                    ) : session.status === "active" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={session.type === "mcq" ? `/candidate/mcq/${session.id}` : `/candidate/interview/${session.id}`}>
                          Resume
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
