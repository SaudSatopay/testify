import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lightbulb, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { ConsentModal } from "@/components/interview/ConsentModal";
import { VerdictStamp } from "@/components/shared/Stamp";
import { DeviceCheck } from "@/components/interview/DeviceCheck";
import { LiveCandidateSession } from "@/components/interview/LiveCandidateSession";
import { MockInterviewSession } from "@/components/interview/MockInterviewSession";
import { Logo } from "@/components/layout/Logo";
import { ErrorState } from "@/components/shared/ErrorState";
import { FullPageLoader } from "@/components/shared/LoadingState";
import { ScoreRing } from "@/components/shared/ScoreCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { interviewService } from "@/services/interviewService";
import { logAudit } from "@/services/auditService";
import type { Interview, InterviewResult, Question } from "@/types";
import { readInterviewSettings, readStringArray } from "@/types";

type RoomPhase = "loading" | "intro" | "device-check" | "session" | "complete" | "error";

export interface CompletionInfo {
  result: InterviewResult | null;
  message?: string;
}

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const interviewId = id ?? "";
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const media = useMediaDevices();

  const [phase, setPhase] = useState<RoomPhase>("loading");
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [videoAnalysisEnabled, setVideoAnalysisEnabled] = useState(false);
  const [completion, setCompletion] = useState<CompletionInfo | null>(null);

  const settings = useMemo(
    () => readInterviewSettings(interview?.settings ?? {}),
    [interview],
  );

  const load = useCallback(async () => {
    setPhase("loading");
    setLoadError(null);
    try {
      const row = await interviewService.getById(interviewId);
      if (!row) {
        setLoadError("This interview doesn't exist or you don't have access to it.");
        setPhase("error");
        return;
      }
      if (row.type === "mcq") {
        navigate(`/candidate/mcq/${row.id}`, { replace: true });
        return;
      }
      if (row.status === "completed") {
        navigate(`/candidate/results/${row.id}`, { replace: true });
        return;
      }
      if (row.status === "cancelled") {
        setLoadError("This interview has been cancelled.");
        setPhase("error");
        return;
      }
      const qs = await interviewService.getQuestions(row.id);
      setInterview(row);
      setQuestions(qs);
      setPhase("intro");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load the interview.");
      setPhase("error");
    }
  }, [interviewId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Always release devices on unmount.
  useEffect(() => () => media.stopAll(), [media.stopAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConsent = async ({ videoAnalysisEnabled: vae }: { videoAnalysisEnabled: boolean }) => {
    setVideoAnalysisEnabled(vae);
    setPhase("device-check");
    // Permission request happens only now — after explicit consent.
    await media.request({ video: true, audio: true });
  };

  const handleSessionStart = async () => {
    if (!interview) return;
    try {
      // Live interviews keep their original anchor on rejoin; self-run
      // sessions re-anchor the timer at the real start (post device-check).
      const keepAnchor = interview.type === "live" && interview.started_at && interview.status === "active";
      const updated = keepAnchor ? interview : await interviewService.start(interview.id);
      setInterview(updated);
      logAudit("interview_session_joined", "interview", interview.id);
      setPhase("session");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the interview.");
    }
  };

  const handleComplete = useCallback(
    (info: CompletionInfo) => {
      media.stopAll();
      setCompletion(info);
      setPhase("complete");
    },
    [media],
  );

  const handleExit = () => {
    media.stopAll();
    navigate("/candidate/dashboard");
  };

  if (phase === "loading") return <FullPageLoader />;

  if (phase === "error" || !interview || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room px-4">
        <div className="w-full max-w-md">
          <ErrorState
            title="Can't open this interview"
            message={loadError ?? "Something went wrong."}
            onRetry={() => void load()}
          />
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/candidate/dashboard">
              <ArrowLeft aria-hidden="true" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    const result = completion?.result ?? null;
    const strengths = readStringArray(result?.strengths ?? []);
    const weaknesses = readStringArray(result?.weaknesses ?? []);
    return (
      <div className="flex min-h-screen items-center justify-center bg-room bg-grid-dark px-4 py-10">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              {result?.recommendation ? (
                <VerdictStamp verdict={result.recommendation} className="mb-2" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-md border-[1.5px] border-success/40 bg-success/10">
                  <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
                </div>
              )}
              <h1 className="mt-4 font-display text-4xl font-black tracking-tight">Interview Complete</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {completion?.message ?? "Great work. Here's your snapshot — the full report has every answer analyzed."}
              </p>
            </div>

            {result && (
              <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row">
                <ScoreRing score={result.overall_score} />
                <div className="grid flex-1 gap-4 text-left sm:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Strengths
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {(strengths.length ? strengths : ["Completed the full session"]).slice(0, 3).map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-success" aria-hidden="true" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" /> Improvement
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {(weaknesses.length ? weaknesses : ["Keep practicing to build a trend"]).slice(0, 3).map((w) => (
                        <li key={w} className="flex gap-2">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-9 flex flex-col justify-center gap-2 sm:flex-row">
              {result && (
                <Button asChild size="lg">
                  <Link to={`/candidate/results/${interview.id}`}>View Detailed Report</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link to="/candidate/mock-interview">Practice Again</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/candidate/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Intro + consent + device check share the dark shell.
  if (phase === "intro" || phase === "device-check") {
    return (
      <div className="min-h-screen bg-room bg-grid-dark">
        <header className="flex h-16 items-center justify-between border-b border-room-line/50 px-4 sm:px-6">
          <Logo onDark />
          <Badge variant="secondary" className="bg-room-raised text-cream-dim">
            {interview.title}
          </Badge>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {phase === "intro" ? (
            <ConsentModal
              open
              offerVideoAnalysis={settings.video_analysis_enabled !== false}
              onCancel={handleExit}
              onContinue={(opts) => void handleConsent(opts)}
            />
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-cream">Device check</h1>
                <p className="mt-2 text-sm text-cream-dim">
                  Make sure everything works before the interview starts. Nothing is recorded yet.
                </p>
              </div>
              <div className="rounded-2xl border border-room-line/80 bg-room-panel/80 p-6 backdrop-blur">
                <DeviceCheck
                  media={media}
                  onReady={() => void handleSessionStart()}
                  onCancel={handleExit}
                />
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // phase === "session"
  return interview.type === "live" ? (
    <LiveCandidateSession
      interview={interview}
      media={media}
      candidateId={user.id}
      candidateName={profile?.full_name ?? "Candidate"}
      monitoringEnabled={settings.monitoring_enabled === true}
      onComplete={handleComplete}
    />
  ) : (
    <MockInterviewSession
      interview={interview}
      preloadedQuestions={questions}
      media={media}
      candidateId={user.id}
      videoAnalysisEnabled={videoAnalysisEnabled}
      monitoringEnabled={settings.monitoring_enabled === true}
      onComplete={handleComplete}
    />
  );
}
