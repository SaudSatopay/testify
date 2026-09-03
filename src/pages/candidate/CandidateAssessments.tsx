import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { History, ListChecks, PlayCircle, Timer } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DIFFICULTIES, MCQ_CATEGORIES, MCQ_COUNTS } from "@/lib/constants";
import { formatDateTime, formatDuration, formatScore, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { interviewService } from "@/services/interviewService";
import { mcqService } from "@/services/mcqService";

export default function CandidateAssessments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const [category, setCategory] = useState<string>("JavaScript");
  const [difficulty, setDifficulty] = useState<string>("any");
  const [count, setCount] = useState<number>(10);

  const { data, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        mcqService.attemptsForCandidate(userId),
        interviewService.listForCandidate(userId),
      ]),
    [userId],
  );

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const [attempts, interviews] = data;
  const assignedMcqs = interviews.filter(
    (i) => i.type === "mcq" && (i.status === "scheduled" || i.status === "active"),
  );
  const completedAttempts = attempts.filter((a) => a.completed_at);

  const startPractice = () => {
    const params = new URLSearchParams({ category, count: String(count) });
    if (difficulty !== "any") params.set("difficulty", difficulty);
    navigate(`/candidate/mcq/practice?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Timed multiple-choice tests with automatic scoring and explanations."
      />

      {assignedMcqs.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle>Assigned assessments</CardTitle>
            <CardDescription>These were assigned to you by an interviewer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedMcqs.map((interview) => (
              <div key={interview.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{interview.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {interview.creator ? `From ${interview.creator.full_name} · ` : ""}
                    {interview.duration_minutes} min
                  </p>
                </div>
                <StatusBadge status={interview.status} />
                <Button asChild size="sm">
                  <Link to={`/candidate/mcq/${interview.id}`}>
                    <PlayCircle aria-hidden="true" /> Start
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
              Practice MCQ test
            </CardTitle>
            <CardDescription>Pick a category and length — scoring is instant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mcq-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="mcq-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MCQ_CATEGORIES.filter((c) => c !== "Custom").map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcq-difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="mcq-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any difficulty</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of questions</Label>
              <div className="grid grid-cols-5 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Question count">
                {MCQ_COUNTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={count === c}
                    onClick={() => setCount(c)}
                    className={cn(
                      "rounded-md px-1 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      count === c ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Time limit: {count} minutes (1 minute per question)
            </div>
            <Button className="w-full" onClick={startPractice}>
              Start assessment
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" aria-hidden="true" />
              Attempt history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedAttempts.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No attempts yet"
                description="Your completed MCQ assessments will show up here with scores and timing."
                className="border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Correct</TableHead>
                    <TableHead className="hidden md:table-cell">Time</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">{attempt.category ?? "Mixed"}</TableCell>
                      <TableCell>
                        <span className={cn("score-mono font-bold", scoreTextClass(attempt.score))}>
                          {formatScore(attempt.score)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="score-mono">
                          {attempt.correct_answers}/{attempt.total_questions}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="score-mono">{formatDuration(attempt.time_taken_seconds)}</span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {formatDateTime(attempt.completed_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
