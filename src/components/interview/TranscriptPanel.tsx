import { useEffect, useRef } from "react";
import { Captions } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
}

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  /** Words currently being recognized (interim, not final). */
  liveText?: string;
  listening?: boolean;
  emptyHint?: string;
  className?: string;
  dark?: boolean;
}

export function TranscriptPanel({
  segments,
  liveText,
  listening = false,
  emptyHint = "Transcript will appear here as you speak.",
  className,
  dark = false,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [segments.length, liveText]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border",
        dark ? "border-room-line/70 bg-room-panel/80" : "bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-2.5",
          dark ? "border-room-line/70 text-cream-dim" : "text-foreground",
        )}
      >
        <Captions className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Live transcript</h3>
        {listening && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-accent">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" aria-hidden="true" />
            Listening
          </span>
        )}
      </div>
      <div
        className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm", dark && "text-cream-dim")}
        aria-live="polite"
        aria-label="Interview transcript"
      >
        {segments.length === 0 && !liveText && (
          <p className={cn("text-sm", dark ? "text-cream-faint" : "text-muted-foreground")}>{emptyHint}</p>
        )}
        {segments.map((segment) => (
          <div key={segment.id}>
            <span className={cn("mr-2 text-xs font-semibold uppercase tracking-wide", dark ? "text-cream-faint" : "text-muted-foreground")}>
              {segment.speaker}
            </span>
            <span className="leading-relaxed">{segment.text}</span>
          </div>
        ))}
        {liveText && (
          <p className={cn("italic leading-relaxed", dark ? "text-cream-faint" : "text-muted-foreground")}>{liveText}…</p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
