import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Eye,
  Send,
  SkipForward,
  StickyNote,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { AudioControls } from "@/components/interview/AudioControls";
import { InterviewTimer } from "@/components/interview/InterviewTimer";
import { TranscriptPanel, type TranscriptSegment } from "@/components/interview/TranscriptPanel";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { LogoMark } from "@/components/layout/Logo";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState } from "@/components/shared/ErrorState";
import { FullPageLoader } from "@/components/shared/LoadingState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useMediaDevices, describeMediaError } from "@/hooks/useMediaDevices";
import { supabase } from "@/integrations/supabase/client";
import { formatDuration, initials } from "@/lib/format";
import { clientId, cn } from "@/lib/utils";
import { api, errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import { logAudit } from "@/services/auditService";
import { notesService } from "@/services/notesService";
import { WebRTCConnection, type ConnectionState, type SignalPayload } from "@/services/webrtcService";
import type { InterviewWithPeople, Question } from "@/types";
import { readInterviewSettings } from "@/types";

type PanelPhase = "loading" | "lobby" | "live" | "error";

interface ScoreState {
  technical: number;
  communication: number;
  problem_solving: number;
  behavioral: number;
  overall: number;
}

export default function LiveInterviewPanel() {
  const { id } = useParams<{ id: string }>();
  const interviewId = id ?? "";
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const media = useMediaDevices();

  const [phase, setPhase] = useState<PanelPhase>("loading");
  const [interview, setInterview] = useState<InterviewWithPeople | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [rtcState, setRtcState] = useState<ConnectionState>("idle");
  const [candidatePresent, setCandidatePresent] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [askedIndex, setAskedIndex] = useState(-1);
  const [customQuestion, setCustomQuestion] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notePrivate, setNotePrivate] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [scores, setScores] = useState<ScoreState>({
    technical: 50,
    communication: 50,
    problem_solving: 50,
    behavioral: 50,
    overall: 50,
  });
  const [savingScores, setSavingScores] = useState(false);
  const [scoresSaved, setScoresSaved] = useState(false);
  const [monitorEvents, setMonitorEvents] = useState<Array<{ id: string; event_type: string; occurred_at: string }>>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const rtcRef = useRef<WebRTCConnection | null>(null);
  const offerSentRef = useRef(false);
  const scoresSavedRef = useRef(false);

  const monitoringEnabled = useMemo(
    () => (interview ? readInterviewSettings(interview.settings).monitoring_enabled === true : false),
    [interview],
  );

  /* ---------------- load ---------------- */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const row = await interviewService.getWithPeople(interviewId);
        if (cancelled) return;
        if (!row) {
          setLoadError("Interview not found or you don't have access to it.");
          setPhase("error");
          return;
        }
        const qs = await interviewService.getQuestions(interviewId);
        if (cancelled) return;
        setInterview(row);
        setQuestions(qs);
        setPhase("lobby");
      } catch (err) {
        if (!cancelled) {
          setLoadError(errorMessage(err));
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  useEffect(() => () => media.stopAll(), [media.stopAll]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- join session ---------------- */

  const joinSession = async () => {
    const stream = await media.request({ video: true, audio: true });
    if (!stream || !interview) return;
    if (interview.status !== "active") {
      try {
        const updated = await interviewService.start(interview.id);
        setInterview({ ...interview, ...updated });
      } catch {
        /* candidate may have started it already */
      }
    }
    logAudit("live_panel_joined", "interview", interview.id);
    setPhase("live");
  };

  /* ---------------- realtime channel ---------------- */

  useEffect(() => {
    if (phase !== "live" || !interview || !user || !media.stream) return;

    const channel = supabase.channel(`interview:${interview.id}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    const rtc = new WebRTCConnection({
      channel,
      role: "interviewer",
      localStream: media.stream,
      onRemoteStream: setRemoteStream,
      onState: setRtcState,
    });
    rtcRef.current = rtc;

    const maybeOffer = () => {
      if (!offerSentRef.current) {
        offerSentRef.current = true;
        void rtc.startAsInitiator();
      }
    };

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ role: string; name: string }>();
        const present = Object.values(state)
          .flat()
          .some((p) => p.role === "candidate");
        setCandidatePresent(present);
        if (present) maybeOffer();
        else offerSentRef.current = false;
      })
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        void rtc.handleSignal(payload as SignalPayload);
      })
      .on("broadcast", { event: "transcript" }, ({ payload }) => {
        const seg = payload as { speaker: string; text: string };
        setSegments((prev) => [
          ...prev,
          { id: clientId(), speaker: seg.speaker === "candidate" ? "Candidate" : seg.speaker, text: seg.text },
        ]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ role: "interviewer", name: profile?.full_name ?? "Interviewer" });
        }
      });

    // Live assessment-event feed (monitoring).
    const eventsChannel = supabase
      .channel(`assessment-events:${interview.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "assessment_events", filter: `interview_id=eq.${interview.id}` },
        (payload) => {
          const row = payload.new as { id: string; event_type: string; occurred_at: string };
          setMonitorEvents((prev) => [...prev.slice(-49), row]);
        },
      )
      .subscribe();

    return () => {
      rtc.close();
      void supabase.removeChannel(channel);
      void supabase.removeChannel(eventsChannel);
      channelRef.current = null;
      offerSentRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, interview?.id, user?.id, media.stream]);

  /* ---------------- actions ---------------- */

  const broadcastQuestion = useCallback(
    (text: string, index: number) => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "question",
        payload: { text, index, total: Math.max(questions.length, index + 1) },
      });
      setSegments((prev) => [...prev, { id: clientId(), speaker: "You", text: `(Q${index + 1}) ${text}` }]);
    },
    [questions.length],
  );

  const askNext = () => {
    const next = askedIndex + 1;
    if (next >= questions.length) {
      toast.info("No more prepared questions — type a custom one below.");
      return;
    }
    setAskedIndex(next);
    broadcastQuestion(questions[next].question, next);
  };

  const skipQuestion = () => {
    const next = askedIndex + 1;
    if (next >= questions.length) return;
    setAskedIndex(next);
    toast.info(`Skipped to question ${next + 1}`);
  };

  const askCustom = () => {
    const text = customQuestion.trim();
    if (!text) return;
    const index = askedIndex + 1;
    setAskedIndex(index);
    broadcastQuestion(text, index);
    setCustomQuestion("");
  };

  const addNote = async () => {
    if (!user || !interview || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await notesService.add(interview.id, user.id, noteText.trim(), notePrivate);
      setNoteText("");
      toast.success("Note saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingNote(false);
    }
  };

  const saveScores = async () => {
    if (!interview?.candidate_id) {
      toast.error("No candidate is assigned to this interview.");
      return;
    }
    setSavingScores(true);
    try {
      const { error } = await supabase.from("interview_results").upsert(
        {
          interview_id: interview.id,
          candidate_id: interview.candidate_id,
          technical_score: scores.technical,
          communication_score: scores.communication,
          problem_solving_score: scores.problem_solving,
          behavioral_score: scores.behavioral,
          overall_score: scores.overall,
        },
        { onConflict: "interview_id,candidate_id" },
      );
      if (error) throw new Error(error.message);
      scoresSavedRef.current = true;
      setScoresSaved(true);
      logAudit("candidate_scored", "interview", interview.id);
      toast.success("Scores saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingScores(false);
    }
  };

  const endInterview = async () => {
    if (!interview) return;
    setEnding(true);
    try {
      void channelRef.current?.send({ type: "broadcast", event: "control", payload: { action: "end" } });
      await interviewService.end(interview.id, "completed");
      // Only run AI aggregation when no manual scores were saved, so manual
      // scoring is never silently overwritten.
      if (!scoresSavedRef.current) {
        try {
          await api.calculateInterviewResult(interview.id);
        } catch {
          /* AI aggregation optional */
        }
      }
      media.stopAll();
      toast.success("Interview ended");
      navigate(`/interviewer/interviews/${interview.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setEnding(false);
    }
  };

  /* ---------------- render ---------------- */

  if (phase === "loading") return <FullPageLoader />;

  if (phase === "error" || !interview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room px-4">
        <div className="w-full max-w-md">
          <ErrorState title="Can't open the live panel" message={loadError ?? undefined} />
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/interviewer/interviews">
              <ArrowLeft aria-hidden="true" /> Back to interviews
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room bg-grid-dark px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Video className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">{interview.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {interview.candidate?.full_name
                ? `With ${interview.candidate.full_name}`
                : "No candidate assigned yet"}{" "}
              · {interview.duration_minutes} min
            </p>
            {media.error && (
              <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
                {describeMediaError(media.error)}
              </p>
            )}
            <Button className="mt-6 w-full" size="lg" onClick={() => void joinSession()} loading={media.requesting}>
              Join session (enables camera &amp; mic)
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link to={`/interviewer/interviews/${interview.id}`}>Back to details</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = askedIndex >= 0 && askedIndex < questions.length ? questions[askedIndex] : null;

  return (
    <div className="flex min-h-screen flex-col bg-room text-cream">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-room-line/50 px-4">
        <LogoMark className="h-7 w-7" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cream">{interview.title}</p>
          <p className="text-[11px] text-cream-faint">Live interviewer panel</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "ml-2 hidden sm:inline-flex",
            rtcState === "connected"
              ? "border-mint/30 bg-mint/10 text-mint"
              : "border-room-line/80 bg-room-panel text-cream-dim",
          )}
        >
          {candidatePresent ? <Wifi className="h-3 w-3" aria-hidden="true" /> : <WifiOff className="h-3 w-3" aria-hidden="true" />}
          {candidatePresent
            ? rtcState === "connected"
              ? "Candidate connected"
              : "Connecting media…"
            : "Waiting for candidate"}
        </Badge>
        <div className="ml-auto">
          {interview.started_at && (
            <InterviewTimer
              startedAt={interview.started_at}
              durationSeconds={interview.duration_minutes * 60}
              compact
              className="border-room-line/80 bg-room-panel text-cream"
            />
          )}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] flex-1 gap-4 p-4 xl:grid-cols-[1.35fr,1fr]">
        {/* LEFT: video + transcript */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="relative">
            <VideoPanel
              stream={remoteStream}
              label={interview.candidate?.full_name ?? "Candidate"}
              placeholder={candidatePresent ? "Connecting to candidate video…" : "Waiting for the candidate to join…"}
              recording={candidatePresent}
              className="aspect-video w-full"
            />
            <VideoPanel
              stream={media.stream}
              muted
              mirrored
              camEnabled={media.camEnabled}
              label="You"
              className="absolute bottom-3 right-3 aspect-video w-36 border-room-line shadow-lg sm:w-48"
            />
          </div>
          <TranscriptPanel
            dark
            className="min-h-[180px] flex-1"
            segments={segments}
            emptyHint="The candidate's live transcript and your asked questions appear here."
          />
        </div>

        {/* RIGHT: control column */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Candidate info */}
          <div className="flex items-center gap-3 rounded-xl border border-room-line/80 bg-room-panel p-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={interview.candidate?.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{initials(interview.candidate?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-cream">
                {interview.candidate?.full_name ?? "Unassigned candidate"}
              </p>
              <p className="truncate text-xs text-cream-faint">
                {interview.job_role ?? "—"} · {interview.candidate?.email ?? ""}
              </p>
            </div>
            {monitoringEnabled && (
              <Badge variant="outline" className="border-ember/40 bg-ember/10 text-ember">
                <Eye className="h-3 w-3" aria-hidden="true" /> {monitorEvents.length} events
              </Badge>
            )}
          </div>

          {/* Current question + controls */}
          <div className="rounded-xl border border-room-line/80 bg-room-panel p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-mint">
                {currentQuestion
                  ? `Question ${askedIndex + 1} of ${questions.length}`
                  : askedIndex >= 0
                    ? `Custom question ${askedIndex + 1}`
                    : "No question asked yet"}
              </p>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={askNext} disabled={askedIndex + 1 >= questions.length}>
                  <Send aria-hidden="true" /> Ask next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-room-line bg-room-panel text-cream-dim hover:bg-room-raised hover:text-cream"
                  onClick={skipQuestion}
                  disabled={askedIndex + 1 >= questions.length}
                >
                  <SkipForward aria-hidden="true" /> Skip
                </Button>
              </div>
            </div>
            <p className="mt-2.5 min-h-[44px] font-display text-lg font-semibold leading-snug text-cream">
              {currentQuestion?.question ??
                (askedIndex >= 0 ? "(custom question sent)" : 'Press "Ask next" to push the first question to the candidate.')}
            </p>
            <div className="mt-3 flex gap-2">
              <Textarea
                rows={2}
                placeholder="Or type a custom question and send it…"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="border-room-line/80 bg-room/70 text-cream placeholder:text-cream-faint"
                aria-label="Custom question"
              />
              <Button variant="outline" className="border-room-line bg-room-panel text-cream-dim hover:bg-room-raised hover:text-cream" onClick={askCustom} disabled={!customQuestion.trim()}>
                Send
              </Button>
            </div>
          </div>

          {/* Notes + scoring tabs */}
          <Tabs defaultValue="score" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="bg-room-panel">
              <TabsTrigger value="score">Score candidate</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              {monitoringEnabled && <TabsTrigger value="events">Monitoring</TabsTrigger>}
            </TabsList>

            <TabsContent value="score" className="min-h-0 flex-1">
              <div className="space-y-4 rounded-xl border border-room-line/80 bg-room-panel p-4">
                {(
                  [
                    ["technical", "Technical"],
                    ["communication", "Communication"],
                    ["problem_solving", "Problem solving"],
                    ["behavioral", "Behavioral"],
                    ["overall", "Overall"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between">
                      <Label className="text-xs text-cream-dim">{label}</Label>
                      <span className="score-mono text-sm font-bold text-cream">{scores[key]}%</span>
                    </div>
                    <Slider
                      value={[scores[key]]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setScores((prev) => ({ ...prev, [key]: v }))}
                      className="mt-1.5"
                      aria-label={`${label} score`}
                    />
                  </div>
                ))}
                <Button className="w-full" onClick={() => void saveScores()} loading={savingScores}>
                  {scoresSaved ? "Update scores" : "Save scores"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="min-h-0 flex-1">
              <div className="space-y-3 rounded-xl border border-room-line/80 bg-room-panel p-4">
                <Textarea
                  rows={4}
                  placeholder="Note what you observed…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="border-room-line/80 bg-room/70 text-cream placeholder:text-cream-faint"
                  aria-label="Interview note"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-cream-dim">
                    <Switch checked={notePrivate} onCheckedChange={setNotePrivate} aria-label="Keep note private" />
                    {notePrivate ? "Private" : "Shared with candidate"}
                  </label>
                  <Button size="sm" onClick={() => void addNote()} loading={savingNote} disabled={!noteText.trim()}>
                    <StickyNote aria-hidden="true" /> Save note
                  </Button>
                </div>
              </div>
            </TabsContent>

            {monitoringEnabled && (
              <TabsContent value="events" className="min-h-0 flex-1">
                <ScrollArea className="h-56 rounded-xl border border-room-line/80 bg-room-panel p-3">
                  {monitorEvents.length === 0 ? (
                    <p className="py-8 text-center text-xs text-cream-faint">
                      No monitoring events yet. Tab switches, focus changes, and copy/paste events appear here in real
                      time. These are informational signals, not proof of misconduct.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {[...monitorEvents].reverse().map((event) => (
                        <li key={event.id} className="flex items-center gap-2 rounded-md bg-room/50 px-2.5 py-1.5 text-xs">
                          <span className="font-mono text-ember">{event.event_type}</span>
                          <span className="ml-auto text-cream-faint">
                            {formatDuration(
                              Math.max(0, (Date.parse(event.occurred_at) - Date.parse(interview.started_at ?? event.occurred_at)) / 1000),
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <footer className="shrink-0 border-t border-room-line/50 px-4 py-3">
        <AudioControls
          micEnabled={media.micEnabled}
          camEnabled={media.camEnabled}
          onToggleMic={media.toggleMic}
          onToggleCam={media.toggleCam}
          onEnd={() => setShowEndConfirm(true)}
          endLabel="End interview"
          disabled={ending}
        />
      </footer>

      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End this interview?"
        description={
          scoresSaved
            ? "The session will close for both sides. Your saved scores stand as the result."
            : "The session will close for both sides. If you haven't saved manual scores, an AI-aggregated result will be calculated from the transcript analysis."
        }
        confirmLabel="End interview"
        destructive
        onConfirm={endInterview}
      />
    </div>
  );
}
