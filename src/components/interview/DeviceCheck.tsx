import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Globe, Mic, MonitorSmartphone, Volume2, XCircle } from "lucide-react";

import { VideoPanel } from "@/components/interview/VideoPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeMediaError, type MediaDevicesState } from "@/hooks/useMediaDevices";
import { cn } from "@/lib/utils";

type CheckStatus = "pending" | "ok" | "fail";

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-success" aria-label="Working" />;
  if (status === "fail") return <XCircle className="h-5 w-5 text-destructive" aria-label="Not working" />;
  return <span className="block h-5 w-5 animate-pulse rounded-full bg-muted" aria-label="Checking" />;
}

interface DeviceCheckProps {
  media: MediaDevicesState;
  /** Camera optional for audio-only assessments. */
  requireCamera?: boolean;
  onReady: () => void;
  onCancel: () => void;
}

/** Pre-interview device check: camera, microphone, speaker, network, browser. */
export function DeviceCheck({ media, requireCamera = true, onReady, onCancel }: DeviceCheckProps) {
  const [micLevel, setMicLevel] = useState(0);
  const [micHeard, setMicHeard] = useState(false);
  const [speakerPlayed, setSpeakerPlayed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const browserOk =
    typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined";

  // Microphone level meter.
  useEffect(() => {
    const stream = media.stream;
    if (!stream || stream.getAudioTracks().length === 0) return;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, rms * 4);
      setMicLevel(level);
      if (level > 0.12) setMicHeard(true);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      void ctx.close();
      audioCtxRef.current = null;
    };
  }, [media.stream]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const playTestTone = useCallback(() => {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
    setSpeakerPlayed(true);
  }, []);

  const camStatus: CheckStatus = !requireCamera
    ? "ok"
    : media.error
      ? "fail"
      : media.hasVideoTrack
        ? "ok"
        : "pending";
  const micStatus: CheckStatus = media.error ? "fail" : media.hasAudioTrack ? (micHeard ? "ok" : "pending") : "pending";
  const speakerStatus: CheckStatus = speakerPlayed ? "ok" : "pending";
  const netStatus: CheckStatus = online ? "ok" : "fail";
  const browserStatus: CheckStatus = browserOk ? "ok" : "fail";

  const allReady =
    camStatus === "ok" && (micStatus === "ok" || micStatus === "pending") && netStatus === "ok" && browserStatus === "ok" && media.stream !== null;

  const rows: Array<{ icon: React.ReactNode; label: string; detail: string; status: CheckStatus }> = [
    {
      icon: <Camera className="h-4 w-4" aria-hidden="true" />,
      label: "Camera",
      detail: requireCamera
        ? media.hasVideoTrack
          ? "Camera detected and streaming."
          : "Waiting for camera…"
        : "Not required for this session.",
      status: camStatus,
    },
    {
      icon: <Mic className="h-4 w-4" aria-hidden="true" />,
      label: "Microphone",
      detail: media.hasAudioTrack
        ? micHeard
          ? "Microphone level detected."
          : "Say something — we're listening for input."
        : "Waiting for microphone…",
      status: micStatus,
    },
    {
      icon: <Volume2 className="h-4 w-4" aria-hidden="true" />,
      label: "Speaker",
      detail: speakerPlayed ? "Test tone played." : "Play the test tone and confirm you can hear it.",
      status: speakerStatus,
    },
    {
      icon: <Globe className="h-4 w-4" aria-hidden="true" />,
      label: "Internet",
      detail: online ? "You're online." : "No internet connection detected.",
      status: netStatus,
    },
    {
      icon: <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />,
      label: "Browser",
      detail: browserOk ? "Media capture and recording supported." : "This browser can't capture or record media — try Chrome or Edge.",
      status: browserStatus,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[1.1fr,1fr]">
      <VideoPanel
        stream={media.stream}
        muted
        mirrored
        camEnabled={media.camEnabled}
        label="Preview"
        className="aspect-video"
        placeholder="Camera preview will appear here"
      />

      <div className="flex flex-col gap-4">
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <span className="text-muted-foreground">{row.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
                {row.label === "Microphone" && media.hasAudioTrack && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-100", micLevel > 0.12 ? "bg-success" : "bg-primary")}
                      style={{ width: `${Math.round(micLevel * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              {row.label === "Speaker" && (
                <Button variant="outline" size="sm" onClick={playTestTone}>
                  Play tone
                </Button>
              )}
              <StatusIcon status={row.status} />
            </div>
          ))}
        </div>

        {media.error && (
          <Alert variant="destructive">
            <XCircle aria-hidden="true" />
            <AlertTitle>Device access problem</AlertTitle>
            <AlertDescription>
              {describeMediaError(media.error)}
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void media.request()}
                loading={media.requesting}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-auto flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onReady} disabled={!allReady}>
            Everything looks good — start
          </Button>
        </div>
      </div>
    </div>
  );
}
