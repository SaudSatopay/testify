import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { AI_RATE_LIMIT, checkRateLimit } from "../_shared/rateLimit.ts";
import { getAIProvider } from "../_shared/ai/index.ts";
import type {
  AnalyzeAnswerParams,
  AnswerAnalysis,
  AudioMetadata,
  VideoMetadata,
} from "../_shared/ai/types.ts";
import {
  optionalNumberInRange,
  optionalString,
  optionalStringArray,
  optionalUuid,
  readJsonBody,
  requireString,
} from "../_shared/validate.ts";

const FILLER_RE =
  /\b(uh+|um+|erm+|hmm+|like|you know|i mean|sort of|kind of|basically|actually|literally)\b/gi;

/** Deterministic server-side metrics; the provider may refine them. */
function computeMetrics(
  text: string,
  durationSeconds: number | undefined,
): { wordCount: number; speakingPace: number | null; fillerCount: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const speakingPace =
    durationSeconds && durationSeconds > 0
      ? Math.round((wordCount / (durationSeconds / 60)) * 10) / 10
      : null;
  const fillerCount = (text.match(FILLER_RE) ?? []).length;
  return { wordCount, speakingPace, fillerCount };
}

/** Weighted overall score; weights renormalized over present components. */
function weightedOverall(
  components: Array<[number | null, number]>,
): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const [value, weight] of components) {
    if (typeof value === "number" && Number.isFinite(value)) {
      sum += value * weight;
      weightSum += weight;
    }
  }
  if (weightSum === 0) return null;
  return Math.round((sum / weightSum) * 100) / 100;
}

function parseAudioMetadata(value: unknown): AudioMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  return {
    duration_seconds: optionalNumberInRange(obj.duration_seconds, "audio_metadata.duration_seconds", 0, 86_400),
    speaking_pace_wpm: optionalNumberInRange(obj.speaking_pace_wpm, "audio_metadata.speaking_pace_wpm", 0, 400),
    filler_word_count: optionalNumberInRange(obj.filler_word_count, "audio_metadata.filler_word_count", 0, 10_000),
  };
}

function parseVideoMetadata(value: unknown): VideoMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  return {
    eye_contact_indicator: optionalNumberInRange(obj.eye_contact_indicator, "video_metadata.eye_contact_indicator", 0, 100),
    face_presence_ratio: optionalNumberInRange(obj.face_presence_ratio, "video_metadata.face_presence_ratio", 0, 1),
    head_movement_level: optionalString(obj.head_movement_level, "video_metadata.head_movement_level", { max: 20 }),
    expression_variation: optionalString(obj.expression_variation, "video_metadata.expression_variation", { max: 20 }),
  };
}

/**
 * POST analyze-answer
 * AI-scores one answer, merges deterministic speech metrics, and (when
 * interview_id + response_id are provided) persists an ai_analysis row.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    await getProfile(userClient, user.id);

    if (!checkRateLimit(`analyze-answer:${user.id}`, AI_RATE_LIMIT)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const question = requireString(body.question, "question", { min: 2, max: 4000 });
    const answerRaw = optionalString(body.answer, "answer", { max: 40_000 });
    const transcript = optionalString(body.transcript, "transcript", { max: 40_000 });
    if (!answerRaw && !transcript) {
      throw new HttpError("VALIDATION_ERROR", "Either answer or transcript is required", 400);
    }
    const answer = answerRaw ?? transcript ?? "";
    const jobRole = requireString(body.job_role, "job_role", { min: 2, max: 120 });
    const experienceYears = optionalNumberInRange(body.experience_years, "experience_years", 0, 60);
    const questionType = optionalString(body.question_type, "question_type", { max: 40 });
    const expectedTopics = optionalStringArray(body.expected_topics, "expected_topics", 20, 300);
    const interviewId = optionalUuid(body.interview_id, "interview_id");
    const responseId = optionalUuid(body.response_id, "response_id");
    const audioMetadata = parseAudioMetadata(body.audio_metadata);
    const videoMetadata = parseVideoMetadata(body.video_metadata);

    const provider = getAIProvider();
    if (!provider) {
      throw new HttpError(
        "AI_NOT_CONFIGURED",
        "No AI provider is configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY (and optionally AI_PROVIDER).",
        503,
      );
    }

    // Deterministic metrics computed server-side (independent of the model).
    const analysisText = transcript ?? answer;
    const metrics = computeMetrics(analysisText, audioMetadata?.duration_seconds);
    const mergedAudio: AudioMetadata = {
      ...audioMetadata,
      speaking_pace_wpm: audioMetadata?.speaking_pace_wpm ?? metrics.speakingPace ?? undefined,
      filler_word_count: audioMetadata?.filler_word_count ?? metrics.fillerCount,
    };

    const params: AnalyzeAnswerParams = {
      question,
      answer,
      transcript,
      jobRole,
      experienceYears,
      questionType,
      expectedTopics,
      audioMetadata: mergedAudio,
      videoMetadata,
    };

    const analysis: AnswerAnalysis = await provider.analyzeAnswer(params);

    // Merge: provider values win when present, deterministic values fill gaps.
    analysis.speaking_pace = analysis.speaking_pace ??
      mergedAudio.speaking_pace_wpm ?? metrics.speakingPace;
    analysis.filler_word_count = analysis.filler_word_count ??
      mergedAudio.filler_word_count ?? metrics.fillerCount;

    // Weighted overall (relevance .25, technical .30, communication .20,
    // clarity .10, structure .15) renormalized over present components.
    const overallScore = weightedOverall([
      [analysis.relevance, 0.25],
      [analysis.technical_accuracy, 0.30],
      [analysis.communication, 0.20],
      [analysis.clarity, 0.10],
      [analysis.structure, 0.15],
    ]);

    if (interviewId && responseId) {
      const voiceSummary = analysis.speaking_pace !== null || analysis.filler_word_count !== null
        ? `Speaking pace ${analysis.speaking_pace ?? "n/a"} wpm; ${analysis.filler_word_count ?? 0} filler word(s) detected across ${metrics.wordCount} words.`
        : null;

      const { error: insertError } = await userClient.from("ai_analysis").insert({
        interview_id: interviewId,
        response_id: responseId,
        candidate_id: user.id,
        answer_relevance: analysis.relevance,
        technical_accuracy: analysis.technical_accuracy,
        communication_score: analysis.communication,
        clarity_score: analysis.clarity,
        structure_score: analysis.structure,
        confidence_indicator: analysis.confidence_indicator,
        speaking_pace: analysis.speaking_pace,
        filler_word_count: analysis.filler_word_count,
        voice_analysis_summary: voiceSummary,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        summary: analysis.summary,
        overall_score: overallScore,
      });
      if (insertError) {
        if (insertError.code === "42501") {
          throw new HttpError("FORBIDDEN", "You are not a participant of this interview", 403);
        }
        throw new HttpError("DB_ERROR", `Failed to store analysis: ${insertError.message}`, 500);
      }
    }

    return ok({ ...analysis, overall_score: overallScore });
  } catch (err) {
    return failFromError(err, "analyze-answer");
  }
});
