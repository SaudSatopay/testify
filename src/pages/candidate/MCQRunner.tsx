import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Flag,
  ListChecks,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { InterviewTimer } from "@/components/interview/InterviewTimer";
import { MonitoringBanner } from "@/components/interview/MonitoringBanner";
import { LogoMark } from "@/components/layout/Logo";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState } from "@/components/shared/ErrorState";
import { FullPageLoader } from "@/components/shared/LoadingState";
import { ScoreRing } from "@/components/shared/ScoreCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAssessmentMonitor } from "@/hooks/useAssessmentMonitor";
import { useAuth } from "@/hooks/useAuth";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import { mcqService } from "@/services/mcqService";
import type { Interview, MCQAnswerSubmission, MCQQuizStart, MCQSubmitResult } from "@/types";
import { readInterviewSettings } from "@/types";

type RunnerPhase = "intro" | "loading" | "running" | "submitting" | "review" | "error";

interface AnswerState {
  selected: "a" | "b" | "c" | "d" | null;
  marked: boolean;
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

export default function MCQRunner() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isPractice = id === "practice";
  const category = params.get("category") ?? undefined;
  const difficulty = params.get("difficulty") ?? undefined;
  const count = Number(params.get("count") ?? 10) || 10;

  const [phase, setPhase] = useState<RunnerPhase>("intro");
  const [interview, setInterview] = useState<Interview | null>(null);
  const [quiz, setQuiz] = useState<MCQQuizStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [result, setResult] = useState<MCQSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const submittedRef = useRef(false);

  const monitoringEnabled = useMemo(
    () => (interview ? readInterviewSettings(interview.settings).monitoring_enabled === true : false),
    [interview],
  );
  const { eventCount } = useAssessmentMonitor({
    interviewId: interview?.id ?? null,
    candidateId: user?.id ?? null,
    enabled: monitoringEnabled && phase === "running",
  });

  // Load interview context for assigned assessments.
  useEffect(() => {
    if (isPractice || !id) return;
    void interviewService
      .getById(id)
      .then((row) => {
        if (!row) {
          setError("This assessment doesn't exist or you don't have access to it.");
          setPhase("error");
          return;
        }
        setInterview(row);
      })
      .catch((err: unknown) => {
        setError(errorMessage(err));
        setPhase("error");
      });
  }, [id, isPractice]);

  const begin = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const started = await mcqService.startQuiz(
        isPractice
          ? { category, difficulty, count }
          : { interviewId: id },
      );
      if (!started.questions || started.questions.length === 0) {
        throw new Error("No questions are available for this configuration yet.");
      }
      setQuiz(started);
      setAnswers({});
      setCurrentIdx(0);
      setStartedAtMs(Date.now());
      setPhase("running");
    } catch (err) {
      setError(errorMessage(err));
      setPhase("error");
    }
  }, [isPractice, category, difficulty, count, id]);

  const submit = useCallback(async () => {
    if (!quiz || submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    const payload: MCQAnswerSubmission[] = quiz.questions.map((q) => ({
      question_id: q.id,
      selected_option: answers[q.id]?.selected ?? null,
      marked_for_review: answers[q.id]?.marked ?? false,
    }));
    try {
      const submitted = await mcqService.submitQuiz(quiz.attempt_id, payload);
      setResult(submitted);
      setPhase("review");
    } catch (err) {
      submittedRef.current = false;
      toast.error(errorMessage(err));
      setPhase("running");
    }
  }, [quiz, answers]);

  /* ---------------- intro ---------------- */

  if (phase === "intro") {
    const title = isPractice
      ? `${category ?? "Mixed"} assessment`
      : (interview?.title ?? "Assessment");
    const totalPlanned = isPractice
      ? count
      : (interview ? (readInterviewSettings(interview.settings).mcq_question_count ?? 10) : 10);
    return (
      <div className="flex min-h-screen items-center justify-center bg-room bg-grid-dark px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">
                  ~{totalPlanned} questions · {totalPlanned} minute limit
                </p>
              </div>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                Navigate freely between questions; mark any for review.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                Scoring happens server-side the moment you submit — with explanations.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                When the timer hits zero, your answers are submitted automatically.
              </li>
            </ul>
            {!isPractice && monitoringEnabled && <MonitoringBanner className="mt-5" />}
            <div className="mt-7 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => void begin()}
                disabled={!isPractice && !interview}
              >
                Start assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "loading") return <FullPageLoader />;

  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room px-4">
        <div className="w-full max-w-md">
          <ErrorState title="Assessment unavailable" message={error ?? undefined} onRetry={() => void begin()} />
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/candidate/assessments">Back to assessments</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- review ---------------- */

  if (phase === "review" && result) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
            <LogoMark className="h-7 w-7" />
            <p className="font-semibold">Assessment result</p>
          </div>
        </header>
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row">
              <ScoreRing score={result.percentage} label="Score" />
              <div className="grid flex-1 grid-cols-2 gap-4 text-center sm:grid-cols-4">
                <div>
                  <p className="score-mono text-2xl font-bold text-success">{result.correct_answers}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div>
                  <p className="score-mono text-2xl font-bold text-destructive">{result.incorrect_answers}</p>
                  <p className="text-xs text-muted-foreground">Incorrect</p>
                </div>
                <div>
                  <p className="score-mono text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div>
                  <p className="score-mono text-2xl font-bold">{formatDuration(result.time_taken_seconds)}</p>
                  <p className="text-xs text-muted-foreground">Time taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold">Answer review</h2>
          <div className="space-y-4">
            {result.results.map((row, i) => (
              <Card key={row.question_id} className={cn(!row.is_correct && row.selected_option && "border-destructive/30")}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-snug">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">Q{i + 1}</span>
                      {row.question}
                    </p>
                    {row.selected_option == null ? (
                      <Badge variant="secondary">Skipped</Badge>
                    ) : row.is_correct ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Correct
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3" aria-hidden="true" /> Incorrect
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    {OPTION_KEYS.map((key) => {
                      const text = row[`option_${key}` as const];
                      const isCorrect = row.correct_option === key;
                      const isSelected = row.selected_option === key;
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                            isCorrect
                              ? "border-success/40 bg-success/10"
                              : isSelected
                                ? "border-destructive/40 bg-destructive/10"
                                : "border-transparent bg-muted/40",
                          )}
                        >
                          <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">{key}</span>
                          <span className="flex-1">{text}</span>
                          {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Correct answer" />}
                          {isSelected && !isCorrect && (
                            <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-label="Your answer" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {row.explanation && (
                    <p className="rounded-lg bg-primary/5 px-3 py-2.5 text-sm leading-relaxed text-foreground/85">
                      <span className="font-semibold text-primary">Why: </span>
                      {row.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-2 pb-8 sm:flex-row">
            {!isPractice && interview && (
              <Button asChild>
                <Link to={`/candidate/results/${interview.id}`}>View interview result</Link>
              </Button>
            )}
            <Button asChild variant={isPractice ? "default" : "outline"}>
              <Link to="/candidate/assessments">Back to assessments</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/candidate/dashboard">Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  /* ---------------- running ---------------- */

  if (!quiz) return <FullPageLoader />;
  const question = quiz.questions[currentIdx];
  const answer = answers[question.id] ?? { selected: null, marked: false };
  const answeredCount = quiz.questions.filter((q) => answers[q.id]?.selected).length;

  const setSelected = (key: "a" | "b" | "c" | "d" | null) =>
    setAnswers((prev) => ({ ...prev, [question.id]: { selected: key, marked: prev[question.id]?.marked ?? false } }));
  const toggleMarked = () =>
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { selected: prev[question.id]?.selected ?? null, marked: !(prev[question.id]?.marked ?? false) },
    }));

  return (
    <div className="flex min-h-screen flex-col bg-room text-cream">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-room-line/50 px-4">
        <LogoMark className="h-7 w-7" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cream">
            {isPractice ? `${category ?? "Mixed"} assessment` : (interview?.title ?? "Assessment")}
          </p>
          <p className="text-[11px] text-cream-faint">
            {answeredCount}/{quiz.questions.length} answered
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <InterviewTimer
            startedAt={startedAtMs ? new Date(startedAtMs).toISOString() : undefined}
            durationSeconds={quiz.time_limit_seconds}
            onExpire={() => {
              toast.warning("Time's up — submitting your answers.");
              void submit();
            }}
            onWarning={(s) => toast.warning(`${s === 60 ? "One minute" : "30 seconds"} remaining.`)}
            compact
            className="border-room-line/80 bg-room-panel text-cream"
          />
        </div>
      </header>

      <Progress
        value={(answeredCount / quiz.questions.length) * 100}
        className="h-1 rounded-none bg-room-panel"
        aria-label={`${answeredCount} of ${quiz.questions.length} answered`}
      />

      {monitoringEnabled && (
        <div className="px-4 pt-3">
          <MonitoringBanner eventCount={eventCount} />
        </div>
      )}

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 p-4 lg:grid-cols-[1fr,280px]">
        {/* Question */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-xl border border-room-line/80 bg-room-panel p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-mint">
                Question {currentIdx + 1} of {quiz.questions.length}
              </span>
              <Badge variant="secondary" className="bg-room-raised text-cream-dim">
                {question.category}
              </Badge>
              <Badge variant="secondary" className="bg-room-raised capitalize text-cream-dim">
                {question.difficulty}
              </Badge>
              {answer.marked && (
                <Badge className="border-ember/40 bg-ember/10 text-ember" variant="outline">
                  <Flag className="h-3 w-3" aria-hidden="true" /> Marked
                </Badge>
              )}
            </div>
            <p className="mt-4 font-display text-2xl font-semibold leading-snug text-cream">{question.question}</p>

            <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label={`Options for question ${currentIdx + 1}`}>
              {OPTION_KEYS.map((key) => {
                const selected = answer.selected === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelected(selected ? null : key)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint",
                      selected
                        ? "border-mint bg-mint/15 text-cream"
                        : "border-room-line/80 bg-room/60 text-cream-dim hover:border-white/25 hover:bg-room-panel",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold uppercase",
                        selected ? "border-mint bg-mint text-cream" : "border-room-line text-cream-dim",
                      )}
                    >
                      {key}
                    </span>
                    {question[`option_${key}` as const]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-room-line bg-room-panel text-cream hover:bg-room-raised hover:text-cream"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft aria-hidden="true" /> Previous
            </Button>
            <Button
              variant="outline"
              className="border-room-line bg-room-panel text-cream hover:bg-room-raised hover:text-cream"
              onClick={toggleMarked}
              aria-pressed={answer.marked}
            >
              <Bookmark aria-hidden="true" /> {answer.marked ? "Unmark" : "Mark for review"}
            </Button>
            <Button
              variant="ghost"
              className="text-cream-dim hover:bg-room-raised hover:text-cream"
              disabled={!answer.selected}
              onClick={() => setSelected(null)}
            >
              <Eraser aria-hidden="true" /> Clear
            </Button>
            <div className="ml-auto flex gap-2">
              {currentIdx < quiz.questions.length - 1 ? (
                <Button onClick={() => setCurrentIdx((i) => Math.min(quiz.questions.length - 1, i + 1))}>
                  Next <ChevronRight aria-hidden="true" />
                </Button>
              ) : (
                <Button variant="success" onClick={() => setShowSubmitConfirm(true)}>
                  Submit assessment
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Palette */}
        <aside className="rounded-xl border border-room-line/80 bg-room-panel p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-cream-dim">Questions</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {quiz.questions.map((q, i) => {
              const state = answers[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(i)}
                  aria-label={`Go to question ${i + 1}${state?.selected ? ", answered" : ""}${state?.marked ? ", marked for review" : ""}`}
                  aria-current={i === currentIdx ? "true" : undefined}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-md font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint",
                    i === currentIdx
                      ? "bg-ember/20 text-mint ring-1 ring-ember"
                      : state?.selected
                        ? "bg-mint/90 text-cream"
                        : "bg-room-raised text-cream-dim hover:bg-room-line",
                  )}
                >
                  {i + 1}
                  {state?.marked && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ember" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-[11px] text-cream-faint">
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-mint/90" aria-hidden="true" /> Answered
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-room-raised" aria-hidden="true" /> Not answered
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ember" aria-hidden="true" /> Marked for review
            </p>
          </div>
          <Button variant="success" className="mt-5 w-full" onClick={() => setShowSubmitConfirm(true)}>
            Submit assessment
          </Button>
        </aside>
      </main>

      {phase === "submitting" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-room/90 backdrop-blur-sm" role="status">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-mint" aria-hidden="true" />
            <p className="text-sm text-cream-dim">Scoring your answers…</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        title="Submit your answers?"
        description={
          answeredCount < quiz.questions.length
            ? `You've answered ${answeredCount} of ${quiz.questions.length} questions — ${quiz.questions.length - answeredCount} will be counted as skipped.`
            : "All questions answered. Submitting will finalize your score."
        }
        confirmLabel="Submit"
        onConfirm={() => void submit()}
      />
    </div>
  );
}
