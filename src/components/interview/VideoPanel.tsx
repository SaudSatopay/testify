import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { User, VideoOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface VideoPanelProps {
  stream: MediaStream | null;
  label?: string;
  /** Local self-view should be muted + mirrored. */
  muted?: boolean;
  mirrored?: boolean;
  camEnabled?: boolean;
  recording?: boolean;
  className?: string;
  /** Shown when there is no stream (e.g. "Waiting for candidate…"). */
  placeholder?: string;
}

export const VideoPanel = forwardRef<HTMLVideoElement | null, VideoPanelProps>(function VideoPanel(
  { stream, label, muted = false, mirrored = false, camEnabled = true, recording = false, className, placeholder },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      if (stream) void el.play().catch(() => undefined);
    }
  }, [stream]);

  const showVideo = Boolean(stream) && camEnabled;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-room-line/70 bg-room shadow-card",
        className,
      )}
    >
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        autoPlay
        className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]", !showVideo && "invisible")}
        aria-label={label ? `${label} video` : "Video"}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cream-faint">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-room-raised/90">
            {stream ? (
              <VideoOff className="h-7 w-7" aria-hidden="true" />
            ) : (
              <User className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
          <p className="text-sm">{stream ? "Camera is off" : (placeholder ?? "No video")}</p>
        </div>
      )}

      {label && (
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-cream backdrop-blur-sm">
          {label}
        </span>
      )}

      {recording && (
        <span
          className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-xs font-semibold text-cream backdrop-blur-sm"
          role="status"
        >
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-ember" aria-hidden="true" />
          REC
        </span>
      )}
    </div>
  );
});
