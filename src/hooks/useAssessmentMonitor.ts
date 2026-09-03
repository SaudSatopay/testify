import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface MonitorEvent {
  event_type: string;
  occurred_at: string;
  metadata?: Record<string, Json>;
}

/**
 * Assessment monitoring (anti-cheating signals) — records ONLY observable
 * browser events for the current tab, and only while `enabled` is true.
 * The UI must display a clear "Assessment monitoring is enabled" notice.
 * These signals are informational; they never prove misconduct by themselves.
 */
export function useAssessmentMonitor(params: {
  interviewId: string | null;
  candidateId: string | null;
  enabled: boolean;
}): { events: MonitorEvent[]; eventCount: number } {
  const { interviewId, candidateId, enabled } = params;
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const idsRef = useRef({ interviewId, candidateId });
  idsRef.current = { interviewId, candidateId };

  const record = useCallback((eventType: string, metadata?: Record<string, Json>) => {
    const { interviewId: iid, candidateId: cid } = idsRef.current;
    const event: MonitorEvent = {
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      metadata,
    };
    setEvents((prev) => [...prev, event].slice(-200));
    if (iid && cid) {
      void supabase
        .from("assessment_events")
        .insert({
          interview_id: iid,
          candidate_id: cid,
          event_type: eventType,
          occurred_at: event.occurred_at,
          metadata: (metadata ?? {}) as Json,
        })
        .then(({ error }) => {
          if (error) console.warn("assessment event insert failed:", error.message);
        });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      record(document.hidden ? "tab_hidden" : "tab_visible");
    };
    const onBlur = () => record("window_blur");
    const onFocus = () => record("window_focus");
    const onFullscreen = () => {
      if (!document.fullscreenElement) record("fullscreen_exit");
    };
    const onCopy = () => record("copy");
    const onPaste = () => record("paste");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    record("monitoring_started", {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      // Multi-display hint where the browser exposes it (coarse, best-effort).
      is_extended: (window.screen as { isExtended?: boolean }).isExtended ?? null,
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      record("monitoring_stopped");
    };
  }, [enabled, record]);

  return { events, eventCount: events.filter((e) => !e.event_type.startsWith("monitoring_")).length };
}
