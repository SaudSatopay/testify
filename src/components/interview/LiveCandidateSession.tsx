import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Radio, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { AudioControls } from "@/components/interview/AudioControls";
import { InterviewTimer } from "@/components/interview/InterviewTimer";
import { MonitoringBanner } from "@/components/interview/MonitoringBanner";
import { TranscriptPanel, type TranscriptSegment } from "@/components/interview/TranscriptPanel";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { LogoMark } from "@/components/layout/Logo";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useAssessmentMonitor } from "@/hooks/useAssessmentMonitor";
import type { MediaDevicesState } from "@/hooks/useMediaDevices";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { clientId, cn } from "@/lib/utils";
import { RecorderSession } from "@/services/recordingService";
import { responseService } from "@/services/responseService";
import { storageService } from "@/services/storageService";
import { WebRTCConnection, type ConnectionState, type SignalPayload } from "@/services/webrtcService";
import type { CompletionInfo } from "@/pages/candidate/InterviewRoom";
import type { Interview } from "@/types";

export interface LiveQuestionPayload {
  text: string;
  index: number;
  total: number;
}

interface LiveCandidateSessionProps {
  interview: Interview;
  media: MediaDevicesState;
  candidateId: string;
  candidateName: string;
  monitoringEnabled: boolean;
  onComplete: (info: CompletionInfo) => void;
}

export function LiveCandidateSession({
  interview,
  media,
  candidateId,
  candidateName,
  monitoringEnabled,
  onComplete,
}: LiveCandidateSessionProps) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [rtcState, setRtcState] = useState<ConnectionState>("idle");
  const [interviewerPresent, setInterviewerPresent] = useState(false);
  const [question, setQuestion] = useState<LiveQuestionPayload | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const rtcRef = useRef<WebRTCConnection | null>(null);
  const recorderRef = useRef<RecorderSession | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const endedRef = useRef(false);
  const lastTranscriptLenRef = useRef(0);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  segmentsRef.current = segments;

  const speech = useSpeechRecognition();
  const { eventCount } = useAssessmentMonitor({
    interviewId: interview.id,
    candidateId,
    enabled: monitoringEnabled,
  });

  /* ---------------- session wrap-up ---------------- */

  const wrapUp = useCallback(
    async (message: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      speech.stop();
      rtcRef.current?.close();
      screenTrackRef.current?.stop();

      // Persist the session recording + full transcript for the report.
      const blob = await (recorderRef.current?.stop().catch(() => null) ?? Promise.resolve(null));
      const durationSeconds = recorderRef.current?.elapsedSeconds ?? 0;
      const fullTranscript = segmentsRef.current
        .filter((s) => s.speaker === "You")
        .map((s) => s.text)
        .join(" ")
        .trim();
      try {
        let videoPath: string | null = null;
        if (blob && blob.size > 5000) {
          videoPath = await storageService.uploadRecording(blob, candidateId, interview.id, "video");
          await supabase.from("recordings").insert({
            interview_id: interview.id,
            candidate_id: candidateId,
            video_url: videoPath,
            duration_seconds: durationSeconds || null,
          });
        }
        if (fullTranscript) {
          await responseService.create({
            interview_id: interview.id,
            candidate_id: candidateId,
            question_text: "Live interview — full candidate transcript",
            transcript: fullTranscript,
            video_url: videoPath,
            duration_seconds: durationSeconds || null,
          });
        }
      } catch (err) {
        console.warn("live session wrap-up save failed:", err);
      }
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      onComplete({ result: null, message });
    },
    [candidateId, interview.id, onComplete, speech],
  );

  /* ---------------- realtime channel + webrtc ---------------- */

  useEffect(() => {
    const stream = media.stream;
    if (!stream) return;

    const channel = supabase.channel(`interview:${interview.id}`, {
      config: { presence: { key: candidateId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    const rtc = new WebRTCConnection({
      channel,
      role: "candidate",
      localStream: stream,
      onRemoteStream: setRemoteStream,
      onState: setRtcState,
    });
    rtcRef.current = rtc;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ role: string; name: string }>();
        const present = Object.values(state)
          .flat()
          .some((p) => p.role === "interviewer");
        setInterviewerPresent(present);
      })
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        void rtc.handleSignal(payload as SignalPayload);
      })
      .on("broadcast", { event: "question" }, ({ payload }) => {
        const q = payload as LiveQuestionPayload;
        setQuestion(q);
        setSegments((prev) => [
          ...prev,
          { id: clientId(), speaker: "Interviewer", text: `(Question ${q.index + 1}) ${q.text}` },
        ]);
      })
      .on("broadcast", { event: "control" }, ({ payload }) => {
        const control = payload as { action?: string };
        if (control.action === "end") {
          toast.info("The interviewer ended the session.");
          void wrapUp("The interviewer has ended this session. Your results will appear once they're finalized.");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ role: "candidate", name: candidateName });
        }
      });

    // Record the whole live session locally (uploaded at the end).
    try {
      const recorder = new RecorderSession("video");
      recorder.start(stream);
      recorderRef.current = recorder;
    } catch {
      recorderRef.current = null;
    }
    speech.start();

    return () => {
      rtc.close();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.id, candidateId, candidateName, media.stream]);

  /* Broadcast finalized transcript chunks to the interviewer panel. */
  useEffect(() => {
    const full = speech.transcript;
    if (full.length <= lastTranscriptLenRef.current) return;
    const chunk = full.slice(lastTranscriptLenRef.current).trim();
    lastTranscriptLenRef.current = full.length;
    if (!chunk) return;
    setSegments((prev) => [...prev, { id: clientId(), speaker: "You", text: chunk }]);
    void channelRef.current?.send({
      type: "broadcast",
      event: "transcript",
      payload: { speaker: "candidate", text: chunk, at: new Date().toISOString() },
    });
  }, [speech.transcript]);

  /* ---------------- screen sharing ---------------- */

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      const camTrack = media.stream?.getVideoTracks()[0];
      if (camTrack && rtcRef.current) await rtcRef.current.replaceVideoTrack(camTrack);
      setScreenSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      screenTrackRef.current = track;
      if (rtcRef.current) await rtcRef.current.replaceVideoTrack(track);
      setScreenSharing(true);
      track.onended = () => {
        screenTrackRef.current = null;
        const camTrack = media.stream?.getVideoTracks()[0];
        if (camTrack && rtcRef.current) void rtcRef.current.replaceVideoTrack(camTrack);
        setScreenSharing(false);
      };
    } catch {
      toast.error("Screen sharing was cancelled or isn't available.");
    }
  }, [screenSharing, media.stream]);

  /* ---------------- render ---------------- */

  const connectionLabel = !interviewerPresent
    ? "Waiting for interviewer"
    : rtcState === "connected"
      ? "Connected"
      : rtcState === "failed"
        ? "Media connection failed — transcript still syncing"
        : "Connecting media…";

  return (
    <div className="flex min-h-screen flex-col bg-room text-cream">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-room-line/50 px-4">
        <LogoMark className="h-7 w-7" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cream">{interview.title}</p>
          <p className="text-[11px] text-cream-faint">Live interview</p>
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
          {interviewerPresent ? (
            <Wifi className="h-3 w-3" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3 w-3" aria-hidden="true" />
          )}
          {connectionLabel}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ember" role="status">
            <Radio className="h-3.5 w-3.5 animate-pulse-dot" aria-hidden="true" />
            Recording
          </span>
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

      {monitoringEnabled && (
        <div className="px-4 pt-3">
          <MonitoringBanner eventCount={eventCount} />
        </div>
      )}

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[1.4fr,1fr]">
        {/* LEFT: interviewer video + self PIP */}
        <div className="relative">
          <VideoPanel
            stream={remoteStream}
            muted={speakerMuted}
            label="Interviewer"
            placeholder={interviewerPresent ? "Connecting to interviewer video…" : "Waiting for the interviewer to join…"}
            className="aspect-video w-full lg:h-full lg:max-h-[calc(100vh-220px)]"
          />
          <VideoPanel
            stream={media.stream}
            muted
            mirrored
            camEnabled={media.camEnabled}
            label="You"
            recording
            className="absolute bottom-3 right-3 aspect-video w-40 border-room-line shadow-lg sm:w-52"
          />
        </div>

        {/* RIGHT: question + transcript */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="rounded-xl border border-room-line/80 bg-room-panel p-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-mint">
              {question ? `Question ${question.index + 1} of ${question.total}` : "Current question"}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold leading-snug text-cream">
              {question?.text ?? "Your interviewer will push questions here as the conversation progresses."}
            </p>
          </div>
          <TranscriptPanel
            dark
            className="min-h-[220px] flex-1"
            segments={segments}
            liveText={speech.interimTranscript}
            listening={speech.listening}
            emptyHint={
              speech.supported
                ? "The shared live transcript appears here."
                : "Live transcription isn't supported in this browser — the interviewer will still see and hear you."
            }
          />
        </div>
      </main>

      <footer className="shrink-0 border-t border-room-line/50 px-4 py-3">
        <AudioControls
          micEnabled={media.micEnabled}
          camEnabled={media.camEnabled}
          onToggleMic={media.toggleMic}
          onToggleCam={media.toggleCam}
          screenSharing={screenSharing}
          onToggleScreenShare={() => void toggleScreenShare()}
          speakerMuted={speakerMuted}
          onToggleSpeaker={() => setSpeakerMuted((m) => !m)}
          onEnd={() => setShowLeaveConfirm(true)}
          endLabel="Leave interview"
        />
      </footer>

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Leave this interview?"
        description="Your recording and transcript will be saved. The interviewer can finalize your results after you leave."
        confirmLabel="Leave"
        destructive
        onConfirm={() =>
          void wrapUp("You left the live session. Your results will appear once the interviewer finalizes them.")
        }
      />
    </div>
  );
}
