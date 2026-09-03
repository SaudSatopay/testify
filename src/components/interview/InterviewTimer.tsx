import { useEffect, useRef, useState } from "react";
import { TimerIcon } from "lucide-react";

import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InterviewTimerProps {
  /**
   * Server-generated ISO timestamp anchoring the countdown. Using the
   * database `started_at` (not browser time) keeps assessment timing
   * honest across refreshes and clock tampering.
   */
  startedAt?: string | null;
  durationSeconds: number;
  running?: boolean;
  onExpire?: () => void;
  onWarning?: (secondsLeft: 60 | 30) => void;
  compact?: boolean;
  className?: string;
}

export function InterviewTimer({
  startedAt,
  durationSeconds,
  running = true,
  onExpire,
  onWarning,
  compact = false,
  className,
}: InterviewTimerProps) {
  const anchorRef = useRef<number>(startedAt ? Date.parse(startedAt) : Date.now());
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.round((anchorRef.current + durationSeconds * 1000 - Date.now()) / 1000)),
  );
  const firedRef = useRef({ warn60: false, warn30: false, expired: false });
  const pausedAtRef = useRef<number | null>(null);

  // Re-anchor if the server timestamp changes (e.g. interview restarted).
  useEffect(() => {
    if (startedAt) {
      anchorRef.current = Date.parse(startedAt);
      firedRef.current = { warn60: false, warn30: false, expired: false };
    }
  }, [startedAt]);

  useEffect(() => {
    if (!running) {
      if (pausedAtRef.current == null) pausedAtRef.current = Date.now();
      return;
    }
    // Shift the anchor by however long we were paused (pause only when allowed).
    if (pausedAtRef.current != null) {
      anchorRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }

    const tick = () => {
      const secondsLeft = Math.max(
        0,
        Math.round((anchorRef.current + durationSeconds * 1000 - Date.now()) / 1000),
      );
      setRemaining(secondsLeft);
      if (secondsLeft <= 60 && !firedRef.current.warn60) {
        firedRef.current.warn60 = true;
        onWarning?.(60);
      }
      if (secondsLeft <= 30 && !firedRef.current.warn30) {
        firedRef.current.warn30 = true;
        onWarning?.(30);
      }
      if (secondsLeft <= 0 && !firedRef.current.expired) {
        firedRef.current.expired = true;
        onExpire?.();
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [running, durationSeconds, onExpire, onWarning]);

  const danger = remaining <= 30;
  const warn = remaining <= 60 && !danger;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5",
        danger
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : warn
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-border bg-card text-foreground",
        className,
      )}
      role="timer"
      aria-live={danger ? "assertive" : "off"}
      aria-label={`Time remaining ${formatDuration(remaining)}`}
    >
      <TimerIcon className={cn("h-4 w-4", danger && "animate-pulse-dot")} aria-hidden="true" />
      <span className={cn("score-mono font-semibold", compact ? "text-sm" : "text-base")}>
        {formatDuration(remaining)}
      </span>
    </div>
  );
}
