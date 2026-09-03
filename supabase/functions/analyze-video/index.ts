import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import {
  optionalUuid,
  readJsonBody,
  requireEnum,
  requireNumberInRange,
  requireUuid,
} from "../_shared/validate.ts";

interface VideoMetrics {
  frames_analyzed: number;
  face_presence_ratio: number;
  eye_contact_indicator: number;
  head_movement_level: "low" | "moderate" | "high";
  expression_variation: "low" | "moderate" | "high";
  attention_drops: number;
}

/**
 * Deterministic, OBSERVABLE-ONLY observations. No emotion, honesty, or
 * competence claims are ever derived from appearance - only neutral
 * descriptions of measurable signals.
 */
function buildObservations(m: VideoMetrics): string[] {
  if (m.frames_analyzed === 0) {
    return ["No video frames were available for analysis."];
  }

  const observations: string[] = [];

  if (m.face_presence_ratio < 0.7) {
    observations.push(
      "The candidate's face was out of frame for a notable portion of the response.",
    );
  } else if (m.face_presence_ratio >= 0.95) {
    observations.push(
      "The candidate's face remained consistently in frame throughout the response.",
    );
  } else {
    observations.push("The candidate's face was in frame for most of the response.");
  }

  if (m.eye_contact_indicator < 40) {
    observations.push("Eye gaze frequently moved away from the camera.");
  } else if (m.eye_contact_indicator < 70) {
    observations.push(
      "Eye gaze was directed toward the camera for a moderate portion of the response.",
    );
  } else {
    observations.push("Eye gaze was directed toward the camera for most of the response.");
  }

  if (m.head_movement_level === "high") {
    observations.push("Frequent head movement was observed during the response.");
  } else if (m.head_movement_level === "low") {
    observations.push("Head position remained largely steady during the response.");
  }

  if (m.expression_variation === "low") {
    observations.push("Facial expression varied little on camera during the response.");
  } else if (m.expression_variation === "high") {
    observations.push("Facial expression varied noticeably on camera during the response.");
  }

  if (m.attention_drops > 0) {
    observations.push(
      `Gaze moved away from the screen area ${m.attention_drops} time(s) during the response.`,
    );
  }

  return observations;
}

/**
 * POST analyze-video
 * Converts client-computed video metrics into a neutral, observable-only
 * summary and stores it on the matching ai_analysis row. Fully deterministic;
 * no AI provider involved.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    await getProfile(userClient, user.id);

    if (!checkRateLimit(`analyze-video:${user.id}`, 30)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const interviewId = requireUuid(body.interview_id, "interview_id");
    const responseId = optionalUuid(body.response_id, "response_id");

    const rawMetrics = body.metrics;
    if (!rawMetrics || typeof rawMetrics !== "object" || Array.isArray(rawMetrics)) {
      throw new HttpError("VALIDATION_ERROR", "metrics must be an object", 400);
    }
    const m = rawMetrics as Record<string, unknown>;
    const metrics: VideoMetrics = {
      frames_analyzed: requireNumberInRange(m.frames_analyzed, "metrics.frames_analyzed", 0, 1_000_000_000),
      face_presence_ratio: requireNumberInRange(m.face_presence_ratio, "metrics.face_presence_ratio", 0, 1),
      eye_contact_indicator: requireNumberInRange(m.eye_contact_indicator, "metrics.eye_contact_indicator", 0, 100),
      head_movement_level: requireEnum(m.head_movement_level, "metrics.head_movement_level", ["low", "moderate", "high"] as const),
      expression_variation: requireEnum(m.expression_variation, "metrics.expression_variation", ["low", "moderate", "high"] as const),
      attention_drops: requireNumberInRange(m.attention_drops, "metrics.attention_drops", 0, 1_000_000),
    };

    // Participant check: the RLS-scoped select returns a row only for the
    // creator, the candidate, or an admin.
    const { data: interview, error: interviewError } = await userClient
      .from("interviews")
      .select("id")
      .eq("id", interviewId)
      .maybeSingle();
    if (interviewError) throw new HttpError("DB_ERROR", interviewError.message, 500);
    if (!interview) {
      throw new HttpError("NOT_FOUND", "Interview not found or you are not a participant", 404);
    }

    const observations = buildObservations(metrics);
    const facialExpressionSummary = observations.join(" ");
    const eyeContactIndicator = metrics.frames_analyzed === 0 ? null : metrics.eye_contact_indicator;

    if (responseId) {
      const { data: existing, error: findError } = await userClient
        .from("ai_analysis")
        .select("id")
        .eq("response_id", responseId)
        .maybeSingle();
      if (findError) throw new HttpError("DB_ERROR", findError.message, 500);

      if (existing) {
        const { error: updateError } = await userClient
          .from("ai_analysis")
          .update({
            eye_contact_indicator: eyeContactIndicator,
            facial_expression_summary: facialExpressionSummary,
          })
          .eq("id", existing.id);
        if (updateError) {
          throw new HttpError("DB_ERROR", `Failed to update analysis: ${updateError.message}`, 500);
        }
      } else {
        const { error: insertError } = await userClient.from("ai_analysis").insert({
          interview_id: interviewId,
          response_id: responseId,
          candidate_id: user.id,
          eye_contact_indicator: eyeContactIndicator,
          facial_expression_summary: facialExpressionSummary,
        });
        if (insertError) {
          if (insertError.code === "42501") {
            throw new HttpError("FORBIDDEN", "You are not a participant of this interview", 403);
          }
          throw new HttpError("DB_ERROR", `Failed to store analysis: ${insertError.message}`, 500);
        }
      }
    }

    return ok({
      eye_contact_indicator: eyeContactIndicator,
      facial_expression_summary: facialExpressionSummary,
      observations,
    });
  } catch (err) {
    return failFromError(err, "analyze-video");
  }
});
