import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Loader2, SkipForward, Sparkles, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { AIAnalysisPanel } from "@/components/interview/AIAnalysisPanel";
import { AudioControls } from "@/components/interview/AudioControls";
import { InterviewTimer } from "@/components/interview/InterviewTimer";
import { MonitoringBanner } from "@/components/interview/MonitoringBanner";
import { TranscriptPanel } from "@/components/interview/TranscriptPanel";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { LogoMark } from "@/components/layout/Logo";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAssessmentMonitor } from "@/hooks/useAssessmentMonitor";
import type { MediaDevicesState } from "@/hooks/useMediaDevices";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { FILLER_WORDS, INTERVIEW_MODES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api, ApiException } from "@/services/api";
import { RecorderSession } from "@/services/recordingService";
import { responseService } from "@/services/responseService";
import { storageService } from "@/services/storageService";
import { createVideoAnalysisService, type VideoAnalysisService } from "@/services/video";
import type { CompletionInfo } from "@/pages/candidate/InterviewRoom";
import type { Interview, Question, SessionQuestion } from "@/types";
import { readInterviewSettings, readStringArray } from "@/types";

function countFillerWords(text: string): number {
  const lower = ` ${text.toLowerCase().replace(/[.,!?]/g, " ")} `;
  return FILLER_WORDS.reduce((acc, word) => acc + (lower.split(` ${word} `).length - 1), 0);
}

function toSessionQuestion(q: Question, index: number): SessionQuestion {
  return {
    index,
    question: q.question,
    category: q.category,
    question_type: q.question_type,
    expected_topics: readStringArray(q.expected_topics),
    time_limit_seconds: q.time_limit_seconds,
    is_follow_up: false,
    difficulty: q.difficulty,
    bankQuestionId: q.id,
  };
}

interface MockInterviewSessionProps {
  interview: Interview;
  preloadedQuestions: Question[];
  media: MediaDevicesState;
  candidateId: string;
  videoAnalysisEnabled: boolean;
  monitoringEnabled: boolean;
  onComplete: (info: CompletionInfo) => void;
}

type QuestionPhase = "fetching" | "asking" | "answering" | "processing";

export function MockInterviewSession({
  interview,
  preloadedQuestions,
  media,
  candidateId,
  videoAnalysisEnabled,
  monitoringEnabled,
  onComplete,
}: MockInterviewSessionProps) {
  const settings = useMemo(() => readInterviewSettings(interview.settings), [interview.settings]);
  const jobRole = interview.job_role ?? "Software Engineer";
  const experienceYears = settings.experience_years ?? 2;
  const totalQuestions =
    settings.question_count ?? (preloadedQuestions.length > 0 ? preloadedQuestions.length : 5);
  const interviewMode = useMemo(() => {
    const stored = settings.mode;
    if (stored && INTERVIEW_MODES.some((m) => m.value === stored)) return stored;
    if (interview.type === "technical") return "technical" as const;
    return "mixed" as const;
  }, [settings.mode, interview.type]);

  const [questions, setQuestions] = useState<SessionQuestion[]>(() =>
    preloadedQuestions.map(toSessionQuestion),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qPhase, setQPhase] = useState<QuestionPhase>(preloadedQuestions.length > 0 ? "asking" : "fetching");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [aiAnalysisAvailable, setAiAnalysisAvailable] = useState(true);
  const [processingStep, setProcessingStep] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const speech = useSpeechRecognition();
  const recorderRef = useRef<RecorderSession | null>(null);
  const videoSvcRef = useRef<VideoAnalysisService | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const finishedRef = useRef(false);

  const { eventCount } = useAssessmentMonitor({
    interviewId: interview.id,
    candidateId,
    enabled: monitoringEnabled,
  });

  const current = questions[currentIndex];

  /* ---------------- adaptive question fetching ---------------- */

  const fetchQuestion = useCallback(
    async (index: number): Promise<SessionQuestion | null> => {
      const prior = questionsRef.current.slice(0, index);
      try {
        const generated = await api.generateQuestion({
          role: jobRole,
          experience_years: experienceYears,
          interview_type: interviewMode,
          difficulty: (interview.difficulty as "easy" | "medium" | "hard" | "expert") ?? "medium",
          question_number: index + 1,
          total_questions: totalQuestions,
          previous_questions: prior.map((q) => q.question),
          previous_answers: prior.map((q) => q.answerTranscript ?? ""),
          interview_id: interview.id,
        });
        return { ...generated, index };
      } catch (err) {
        if (err instanceof ApiException && err.code === "AI_NOT_CONFIGURED") {
          return null;
        }
        throw err;
      }
    },
    [jobRole, experienceYears, interviewMode, interview.difficulty, interview.id, totalQuestions],
  );

  // Initial question when running fully adaptive (no preloaded bank questions).
  useEffect(() => {
    if (preloadedQuestions.length > 0) return;
    let cancelled = false;
    void fetchQuestion(0)
      .then((q) => {
        if (cancelled) return;
        if (!q) {
          setFatalError(
            "AI question generation isn't configured on the server and this session has no prepared questions.",
          );
          return;
        }
        setQuestions([q]);
        setQPhase("answering");
      })
      .catch(() => {
        if (!cancelled) setFatalError("Couldn't fetch the first question. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- video analysis (optional, lazy-loaded) ---------------- */

  useEffect(() => {
    if (!videoAnalysisEnabled) return;
    let cancelled = false;
    void createVideoAnalysisService().then((svc) => {
      if (cancelled) return;
      videoSvcRef.current = svc;
      if (videoElRef.current) svc.start(videoElRef.current);
    });
    return () => {
      cancelled = true;
      videoSvcRef.current?.stop();
      videoSvcRef.current = null;
    };
  }, [videoAnalysisEnabled]);

  /* ----------------------------------------------------------------
     Question lifecycle. Answering opens IMMEDIATELY — typing and the
     submit button never wait on text-to-speech. The question is read
     aloud in parallel, and the microphone starts listening once TTS
     finishes (so it doesn't transcribe the interviewer's own voice),
     with hard failsafes for stalled/broken TTS engines.
     ---------------------------------------------------------------- */

  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const speechApiRef = useRef(speech);
  speechApiRef.current = speech;
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  /** Index whose mic listening already started (blocks late TTS guards). */
  const listenStartedForRef = useRef(-1);

  useEffect(() => {
    if (!current) return;
    const questionIndex = current.index;

    setQPhase("answering");
    setTypedAnswer("");
    speechApiRef.current.reset();
    videoSvcRef.current?.reset();
    if (videoElRef.current) videoSvcRef.current?.start(videoElRef.current);

    const stream = mediaRef.current.stream;
    if (stream && stream.getAudioTracks().length > 0) {
      try {
        const recorder = new RecorderSession("audio");
        recorder.start(stream);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null;
      }
    }

    let disposed = false;
    const timers: number[] = [];
    const startListening = () => {
      if (disposed || listenStartedForRef.current === questionIndex) return;
      listenStartedForRef.current = questionIndex;
      setTtsSpeaking(false);
      const liveStream = mediaRef.current.stream;
      if (liveStream && liveStream.getAudioTracks().length > 0) {
        speechApiRef.current.start();
      }
    };

    if (voiceEnabledRef.current && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(current.question);
      utterance.rate = 1;
      let started = false;
      utterance.onstart = () => {
        started = true;
        if (!disposed) setTtsSpeaking(true);
      };
      utterance.onend = startListening;
      utterance.onerror = startListening;
      // Failsafe 1: engine never starts speaking (no voices / muted engine).
      timers.push(
        window.setTimeout(() => {
          if (!started) startListening();
        }, 2500),
      );
      // Failsafe 2: absolute cap so a hung engine can't block the microphone.
      timers.push(window.setTimeout(startListening, Math.min(25000, current.question.length * 90 + 4000)));
      window.speechSynthesis.speak(utterance);
    } else {
      startListening();
    }

    return () => {
      disposed = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, current?.question]);

  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  /* ---------------- submit / finish pipeline ---------------- */

  const finishInterview = useCallback(
    async (message?: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setQPhase("processing");
      setProcessingStep("Wrapping up your interview…");
      speech.stop();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      await recorderRef.current?.stop().catch(() => null);
      videoSvcRef.current?.stop();

      const answered = questionsRef.current.filter((q) => q.responseId).length;
      if (answered === 0) {
        try {
          await api.calculateInterviewResult(interview.id);
        } catch {
          /* no answers — mark ended without a result */
        }
        onComplete({ result: null, message: message ?? "The session ended before any answers were recorded." });
        return;
      }
      try {
        setProcessingStep("Calculating your results…");
        const { result } = await api.calculateInterviewResult(interview.id);
        onComplete({ result, message });
      } catch (err) {
        onComplete({
          result: null,
          message:
            err instanceof ApiException && err.message
              ? `Your answers were saved, but the final result couldn't be calculated: ${err.message}`
              : "Your answers were saved, but the final result couldn't be calculated.",
        });
      }
    },
    [interview.id, onComplete, speech],
  );

  const submitAnswer = useCallback(
    async (skipped = false) => {
      if (!current || qPhase !== "answering") return;
      setQPhase("processing");
      // Silence the interviewer voice and block any pending TTS failsafe from
      // re-starting the microphone while we process this answer.
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      listenStartedForRef.current = current.index;
      setTtsSpeaking(false);
      speech.stop();

      const spoken = `${speech.transcript} ${speech.interimTranscript}`.trim();
      const typed = typedAnswer.trim();
      const durationSeconds = recorderRef.current?.elapsedSeconds ?? 0;

      // 1. Stop recording + upload audio (non-fatal on failure).
      setProcessingStep("Saving your answer…");
      let audioPath: string | null = null;
      const blob = await (recorderRef.current?.stop().catch(() => null) ?? Promise.resolve(null));
      recorderRef.current = null;
      if (blob && blob.size > 2000) {
        try {
          audioPath = await storageService.uploadRecording(blob, candidateId, interview.id, "audio");
        } catch {
          audioPath = null;
        }
      }

      // 2. Persist the response row.
      const bankId = current.bankQuestionId ?? null;
      let responseId: string | undefined;
      try {
        const response = await responseService.create({
          interview_id: interview.id,
          question_id: bankId,
          candidate_id: candidateId,
          question_text: current.question,
          text_answer: typed || null,
          transcript: spoken || null,
          audio_url: audioPath,
          duration_seconds: durationSeconds || null,
        });
        responseId = response.id;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save your answer.");
      }

      // 3. Server-side transcription fallback when live transcription had nothing.
      let finalTranscript = spoken;
      if (!finalTranscript && !typed && audioPath && responseId) {
        try {
          setProcessingStep("Transcribing your answer…");
          const { transcript } = await api.transcribeResponse({ audio_path: audioPath, response_id: responseId });
          finalTranscript = transcript;
        } catch {
          /* transcription unavailable — continue honestly without it */
        }
      }

      // 4. Optional video-signal summary for this answer.
      let videoMetadata: Parameters<typeof api.analyzeAnswer>[0]["video_metadata"];
      if (videoSvcRef.current) {
        const summary = videoSvcRef.current.analyzeSession();
        if (summary.framesAnalyzed > 3) {
          videoMetadata = {
            eye_contact_indicator: summary.faceDetectionSupported ? summary.eyeContactIndicator : undefined,
            face_presence_ratio: summary.faceDetectionSupported ? summary.facePresenceRatio : undefined,
            head_movement_level: summary.headMovementLevel,
            expression_variation: summary.expressionVariation,
          };
          if (responseId && summary.faceDetectionSupported) {
            void api
              .analyzeVideo({
                interview_id: interview.id,
                response_id: responseId,
                metrics: {
                  frames_analyzed: summary.framesAnalyzed,
                  face_presence_ratio: summary.facePresenceRatio,
                  eye_contact_indicator: summary.eyeContactIndicator,
                  head_movement_level: summary.headMovementLevel,
                  expression_variation: summary.expressionVariation,
                  attention_drops: summary.attentionDrops,
                },
              })
              .catch(() => undefined);
          }
        }
      }

      // 5. AI analysis of the answer (honest degradation when unconfigured).
      let updatedQuestions = questionsRef.current;
      const effectiveAnswer = finalTranscript || typed;
      if (!skipped && effectiveAnswer && aiAnalysisAvailable) {
        try {
          setProcessingStep("Analyzing your answer…");
          const words = effectiveAnswer.split(/\s+/).filter(Boolean).length;
          const analysis = await api.analyzeAnswer({
            interview_id: interview.id,
            response_id: responseId,
            question: current.question,
            answer: effectiveAnswer,
            transcript: finalTranscript || undefined,
            job_role: jobRole,
            experience_years: experienceYears,
            question_type: current.question_type,
            expected_topics: current.expected_topics,
            audio_metadata: {
              duration_seconds: durationSeconds || undefined,
              speaking_pace_wpm:
                durationSeconds > 4 && finalTranscript ? Math.round((words / durationSeconds) * 60) : undefined,
              filler_word_count: finalTranscript ? countFillerWords(finalTranscript) : undefined,
            },
            video_metadata: videoMetadata,
          });
          updatedQuestions = updatedQuestions.map((q) =>
            q.index === current.index ? { ...q, responseId, answerTranscript: effectiveAnswer, analysis } : q,
          );
        } catch (err) {
          if (err instanceof ApiException && err.code === "AI_NOT_CONFIGURED") {
            setAiAnalysisAvailable(false);
            toast.info("Answer saved. AI analysis is unavailable until a provider key is configured.");
          }
          updatedQuestions = updatedQuestions.map((q) =>
            q.index === current.index ? { ...q, responseId, answerTranscript: effectiveAnswer } : q,
          );
        }
      } else {
        updatedQuestions = updatedQuestions.map((q) =>
          q.index === current.index ? { ...q, responseId, answerTranscript: effectiveAnswer } : q,
        );
      }
      setQuestions(updatedQuestions);
      questionsRef.current = updatedQuestions;

      // 6. Advance or finish.
      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalQuestions) {
        await finishInterview();
        return;
      }
      if (nextIndex < updatedQuestions.length) {
        setCurrentIndex(nextIndex);
        setQPhase("answering");
        return;
      }
      try {
        setProcessingStep("Preparing your next question…");
        const next = await fetchQuestion(nextIndex);
        if (!next) {
          await finishInterview("AI question generation became unavailable, so the session ended early.");
          return;
        }
        const withNext = [...questionsRef.current, next];
        setQuestions(withNext);
        questionsRef.current = withNext;
        setCurrentIndex(nextIndex);
        setQPhase("answering");
      } catch {
        await finishInterview("We couldn't fetch the next question, so the session ended early.");
      }
    },
    [
      current,
      qPhase,
      speech,
      typedAnswer,
      candidateId,
      interview.id,
      jobRole,
      experienceYears,
      aiAnalysisAvailable,
      currentIndex,
      totalQuestions,
      fetchQuestion,
      finishInterview,
    ],
  );

  /* ---------------- render ---------------- */

  const lastAnalyzed = [...questions].reverse().find((q) => q.analysis && q.index < currentIndex);

  if (fatalError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-room px-4">
        <div className="max-w-md rounded-2xl border border-room-line/80 bg-room-panel p-8 text-center">
          <p className="text-sm leading-relaxed text-cream-dim">{fatalError}</p>
          <Button className="mt-6" onClick={() => void finishInterview("Session closed.")}>
            Exit session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-room text-cream">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-room-line/50 px-4">
        <LogoMark className="h-7 w-7" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cream">{interview.title}</p>
          <p className="text-[11px] text-cream-faint">
            {jobRole} · Question {Math.min(currentIndex + 1, totalQuestions)} of {totalQuestions}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-cream-dim hover:bg-room-raised hover:text-cream"
            onClick={() => setVoiceEnabled((v) => !v)}
            aria-label={voiceEnabled ? "Disable spoken questions" : "Enable spoken questions"}
            aria-pressed={voiceEnabled}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {interview.started_at && (
            <InterviewTimer
              startedAt={interview.started_at}
              durationSeconds={interview.duration_minutes * 60}
              onExpire={() => void finishInterview("Time is up — nicely done sticking with it!")}
              onWarning={(s) => toast.warning(`${s === 60 ? "One minute" : "30 seconds"} left in the interview.`)}
              compact
              className="border-room-line/80 bg-room-panel text-cream"
            />
          )}
        </div>
      </header>

      {monitoringEnabled && (
        <div className="px-4 pt-3">
          <MonitoringBanner eventCount={eventCount} />
        </div>
      )}

      {/* Body */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[1.05fr,1fr]">
        {/* LEFT: candidate video + transcript */}
        <div className="flex min-h-0 flex-col gap-4">
          <VideoPanel
            ref={videoElRef}
            stream={media.stream}
            muted
            mirrored
            camEnabled={media.camEnabled}
            recording={qPhase === "answering"}
            label="You"
            className="aspect-video w-full"
          />
          <TranscriptPanel
            dark
            className="min-h-[160px] flex-1"
            listening={speech.listening}
            segments={
              speech.transcript
                ? [{ id: "current", speaker: "You", text: speech.transcript }]
                : []
            }
            liveText={speech.interimTranscript}
            emptyHint={
              speech.supported
                ? "Your live transcript appears here as you speak."
                : "Live transcription isn't supported in this browser — type your answer, or your recording will be transcribed server-side."
            }
          />
        </div>

        {/* RIGHT: question + answer input */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="rounded-xl border border-room-line/80 bg-room-panel p-5">
            {qPhase === "fetching" || !current ? (
              <div className="flex items-center gap-3 py-6 text-cream-dim">
                <Loader2 className="h-5 w-5 animate-spin text-mint" aria-hidden="true" />
                Preparing your first question…
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-mint">
                    Question {currentIndex + 1} · {current.category}
                  </span>
                  {current.is_follow_up && (
                    <Badge variant="accent" className="border-mint/30 bg-mint/10 text-mint">
                      Follow-up
                    </Badge>
                  )}
                  {qPhase === "answering" && (
                    <InterviewTimer
                      key={currentIndex}
                      durationSeconds={current.time_limit_seconds || 180}
                      onExpire={() => void submitAnswer()}
                      compact
                      className="ml-auto border-room-line/80 bg-room-panel text-cream"
                    />
                  )}
                </div>
                <p className="mt-3 font-display text-2xl font-semibold leading-snug text-cream">{current.question}</p>
                {ttsSpeaking && (
                  <p className="mt-3 inline-flex items-center gap-2 text-xs text-cream-faint">
                    <Sparkles className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
                    Reading the question aloud — you can start answering anytime
                  </p>
                )}
              </>
            )}
          </div>

          {current && qPhase !== "fetching" && (
            <div className="flex flex-1 flex-col gap-3 rounded-xl border border-room-line/80 bg-room-panel p-5">
              <label htmlFor="typed-answer" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cream-dim">
                <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                Speak your answer, or type it here
              </label>
              <Textarea
                id="typed-answer"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                disabled={qPhase !== "answering"}
                placeholder="Optional written answer — useful for code sketches or when you can't speak aloud."
                className="min-h-[110px] flex-1 border-room-line/80 bg-room/70 text-cream placeholder:text-cream-faint"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cream-dim hover:bg-room-raised hover:text-cream"
                  disabled={qPhase !== "answering"}
                  onClick={() => void submitAnswer(true)}
                >
                  <SkipForward aria-hidden="true" /> Skip question
                </Button>
                <Button
                  size="lg"
                  disabled={qPhase !== "answering"}
                  onClick={() => void submitAnswer()}
                >
                  {qPhase === "processing" ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      {processingStep || "Processing…"}
                    </>
                  ) : (
                    "Submit answer"
                  )}
                </Button>
              </div>
            </div>
          )}

          {lastAnalyzed?.analysis && (
            <div className="max-h-[300px] overflow-y-auto">
              <AIAnalysisPanel
                analysis={lastAnalyzed.analysis}
                compact
                className="border-room-line/80 bg-room-panel text-cream [&_h3]:text-cream"
              />
            </div>
          )}

          {!aiAnalysisAvailable && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              AI analysis is not configured on the server — answers are being saved without per-answer scoring.
            </p>
          )}
        </div>
      </main>

      {/* Controls */}
      <footer className="shrink-0 border-t border-room-line/50 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            {questions.slice(0, totalQuestions).map((q) => (
              <span
                key={q.index}
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  q.index < currentIndex
                    ? "bg-mint"
                    : q.index === currentIndex
                      ? "bg-ember"
                      : "bg-room-line",
                )}
              />
            ))}
            {Array.from({ length: Math.max(0, totalQuestions - questions.length) }).map((_, i) => (
              <span key={`pending-${i}`} aria-hidden="true" className="h-1.5 w-6 rounded-full bg-room-raised" />
            ))}
          </div>
          <AudioControls
            micEnabled={media.micEnabled}
            camEnabled={media.camEnabled}
            onToggleMic={media.toggleMic}
            onToggleCam={media.toggleCam}
            onEnd={() => setShowEndConfirm(true)}
            disabled={qPhase === "processing"}
            className="ml-auto"
          />
        </div>
      </footer>

      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End this interview?"
        description="Answers you've already submitted are saved and will be scored. Unanswered questions will be skipped."
        confirmLabel="End interview"
        destructive
        onConfirm={() => void finishInterview()}
      />
    </div>
  );
}
