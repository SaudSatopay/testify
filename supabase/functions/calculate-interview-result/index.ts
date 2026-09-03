import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getAIProvider } from "../_shared/ai/index.ts";
import type { ComponentScores, ResultSummary } from "../_shared/ai/types.ts";
import { logAudit } from "../_shared/audit.ts";
import { readJsonBody, requireUuid } from "../_shared/validate.ts";

interface AnalysisRow {
  id: string;
  response_id: string | null;
  answer_relevance: number | null;
  technical_accuracy: number | null;
  communication_score: number | null;
  clarity_score: number | null;
  structure_score: number | null;
  confidence_indicator: number | null;
  overall_score: number | null;
  strengths: unknown;
  weaknesses: unknown;
  summary: string | null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round2(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

function weightedOverall(components: Array<[number | null, number]>): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const [value, weight] of components) {
    if (typeof value === "number" && Number.isFinite(value)) {
      sum += value * weight;
      weightSum += weight;
    }
  }
  return weightSum === 0 ? null : Math.round((sum / weightSum) * 100) / 100;
}

function recommendationFor(overall: number | null): string | null {
  if (overall === null) return null;
  if (overall >= 85) return "strong_hire";
  if (overall >= 70) return "hire";
  if (overall >= 55) return "consider";
  return "no_hire";
}

const COMPONENT_LABELS: Record<string, string> = {
  technical: "technical accuracy",
  communication: "communication",
  problem_solving: "problem solving",
  behavioral: "behavioral responses",
  mcq: "MCQ performance",
  confidence: "delivery signals",
};

function deterministicSummary(
  jobRole: string,
  interviewType: string,
  scores: ComponentScores,
): ResultSummary {
  const entries = Object.entries(scores).filter(
    ([key, value]) => key !== "overall" && typeof value === "number",
  ) as Array<[string, number]>;
  entries.sort((a, b) => b[1] - a[1]);

  const strengths = entries
    .filter(([, v]) => v >= 60)
    .slice(0, 3)
    .map(([k, v]) => `Solid ${COMPONENT_LABELS[k] ?? k} (average ${Math.round(v)}/100).`);
  const weaknesses = entries
    .filter(([, v]) => v < 60)
    .slice(-3)
    .map(([k, v]) => `${COMPONENT_LABELS[k] ?? k} needs improvement (average ${Math.round(v)}/100).`);

  const overallText = scores.overall !== null
    ? `an overall score of ${Math.round(scores.overall)}/100`
    : "no overall score";
  const best = entries[0];
  const worst = entries[entries.length - 1];
  const detail = best && worst && best[0] !== worst[0]
    ? ` The strongest area was ${COMPONENT_LABELS[best[0]] ?? best[0]} and the weakest was ${COMPONENT_LABELS[worst[0]] ?? worst[0]}.`
    : "";

  return {
    summary:
      `The candidate completed a ${interviewType} interview for the ${jobRole} role with ${overallText}.${detail}`,
    strengths,
    weaknesses,
    recommendation: (recommendationFor(scores.overall) ?? "consider") as ResultSummary["recommendation"],
  };
}

/**
 * POST calculate-interview-result
 * Aggregates ai_analysis rows + completed MCQ attempts into a single
 * interview_results row and marks the interview completed.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    await getProfile(userClient, user.id);

    if (!checkRateLimit(`calculate-interview-result:${user.id}`, 30)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const interviewId = requireUuid(body.interview_id, "interview_id");

    // RLS-scoped: only participants/admins see the row.
    const { data: interview, error: interviewError } = await userClient
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .maybeSingle();
    if (interviewError) throw new HttpError("DB_ERROR", interviewError.message, 500);
    if (!interview) {
      throw new HttpError("NOT_FOUND", "Interview not found or you are not a participant", 404);
    }

    const [analysesRes, responsesRes, attemptsRes] = await Promise.all([
      userClient
        .from("ai_analysis")
        .select(
          "id, response_id, answer_relevance, technical_accuracy, communication_score, clarity_score, structure_score, confidence_indicator, overall_score, strengths, weaknesses, summary",
        )
        .eq("interview_id", interviewId),
      userClient
        .from("responses")
        .select("id, question_id")
        .eq("interview_id", interviewId),
      userClient
        .from("mcq_attempts")
        .select("id, score, completed_at")
        .eq("interview_id", interviewId)
        .not("completed_at", "is", null),
    ]);
    if (analysesRes.error) throw new HttpError("DB_ERROR", analysesRes.error.message, 500);
    if (responsesRes.error) throw new HttpError("DB_ERROR", responsesRes.error.message, 500);
    if (attemptsRes.error) throw new HttpError("DB_ERROR", attemptsRes.error.message, 500);

    const analyses = (analysesRes.data ?? []) as AnalysisRow[];
    const responses = (responsesRes.data ?? []) as Array<{ id: string; question_id: string | null }>;
    const attempts = (attemptsRes.data ?? []) as Array<{ id: string; score: number | null }>;

    if (analyses.length === 0 && attempts.length === 0) {
      throw new HttpError(
        "NO_DATA",
        "Nothing to score yet: no AI analyses or completed MCQ attempts exist for this interview",
        400,
      );
    }

    // Map response -> question_type to isolate behavioral/situational answers.
    const questionIds = [
      ...new Set(responses.map((r) => r.question_id).filter((id): id is string => !!id)),
    ];
    const questionTypeById = new Map<string, string>();
    if (questionIds.length > 0) {
      const { data: questionRows, error: questionsError } = await userClient
        .from("questions")
        .select("id, question_type")
        .in("id", questionIds);
      if (questionsError) throw new HttpError("DB_ERROR", questionsError.message, 500);
      for (const q of (questionRows ?? []) as Array<{ id: string; question_type: string }>) {
        questionTypeById.set(q.id, q.question_type);
      }
    }
    const questionTypeByResponse = new Map<string, string>();
    for (const r of responses) {
      if (r.question_id && questionTypeById.has(r.question_id)) {
        questionTypeByResponse.set(r.id, questionTypeById.get(r.question_id) as string);
      }
    }

    const technical = avg(analyses.map((a) => a.technical_accuracy));
    const communication = avg(analyses.map((a) => a.communication_score));
    const confidence = avg(analyses.map((a) => a.confidence_indicator));
    const problemSolving = avg(
      analyses.map((a) => avg([a.answer_relevance, a.structure_score])),
    );

    const behavioralAnalyses = analyses.filter((a) => {
      const type = a.response_id ? questionTypeByResponse.get(a.response_id) : undefined;
      return type === "behavioral" || type === "situational";
    });
    let behavioral = avg(
      behavioralAnalyses.map(
        (a) => a.overall_score ?? avg([a.communication_score, a.clarity_score]),
      ),
    );
    if (behavioral === null && analyses.length > 0) {
      // Fallback: mean of communication and clarity across all analyses.
      behavioral = avg(
        analyses.map((a) => avg([a.communication_score, a.clarity_score])),
      );
    }

    const mcq = avg(attempts.map((a) => a.score));

    const overall = weightedOverall([
      [technical, 0.30],
      [communication, 0.20],
      [problemSolving, 0.20],
      [behavioral, 0.15],
      [mcq, 0.15],
    ]);

    const scores: ComponentScores = {
      technical: round2(technical),
      communication: round2(communication),
      confidence: round2(confidence),
      problem_solving: round2(problemSolving),
      behavioral: round2(behavioral),
      mcq: round2(mcq),
      overall,
    };

    // Narrative: AI when configured, deterministic fallback otherwise.
    const provider = getAIProvider();
    let narrative: ResultSummary;
    const fallback = deterministicSummary(
      (interview.job_role as string | null) ?? "target",
      interview.type as string,
      scores,
    );
    if (provider) {
      try {
        narrative = await provider.generateSummary({
          jobRole: (interview.job_role as string | null) ?? "target role",
          interviewType: interview.type as string,
          analyses: analyses.map((a) => ({
            overall_score: a.overall_score,
            relevance: a.answer_relevance ?? undefined,
            technical_accuracy: a.technical_accuracy ?? undefined,
            communication: a.communication_score ?? undefined,
            structure: a.structure_score ?? undefined,
            strengths: Array.isArray(a.strengths) ? (a.strengths as string[]) : [],
            weaknesses: Array.isArray(a.weaknesses) ? (a.weaknesses as string[]) : [],
            summary: a.summary ?? undefined,
          })),
          scores,
        });
        if (!narrative.summary) narrative = { ...narrative, summary: fallback.summary };
      } catch (aiError) {
        console.error("[calculate-interview-result] AI summary failed, using fallback:", aiError);
        narrative = fallback;
      }
    } else {
      narrative = fallback;
    }

    const candidateId = (interview.candidate_id as string | null) ?? user.id;
    const resultRow = {
      interview_id: interviewId,
      candidate_id: candidateId,
      technical_score: scores.technical,
      communication_score: scores.communication,
      confidence_score: scores.confidence,
      problem_solving_score: scores.problem_solving,
      behavioral_score: scores.behavioral,
      mcq_score: scores.mcq,
      overall_score: scores.overall,
      recommendation: recommendationFor(scores.overall),
      summary: narrative.summary,
      strengths: narrative.strengths,
      weaknesses: narrative.weaknesses,
    };

    const { data: result, error: upsertError } = await userClient
      .from("interview_results")
      .upsert(resultRow, { onConflict: "interview_id,candidate_id" })
      .select("*")
      .single();
    if (upsertError) {
      if (upsertError.code === "42501") {
        throw new HttpError("FORBIDDEN", "You are not allowed to write results for this interview", 403);
      }
      throw new HttpError("DB_ERROR", `Failed to save result: ${upsertError.message}`, 500);
    }

    if (interview.status !== "completed" || !interview.ended_at) {
      const { error: statusError } = await userClient
        .from("interviews")
        .update({
          status: "completed",
          ended_at: (interview.ended_at as string | null) ?? new Date().toISOString(),
        })
        .eq("id", interviewId);
      if (statusError) {
        console.error("[calculate-interview-result] status update failed:", statusError.message);
      }
    }

    await logAudit(userClient, user.id, "interview_result_calculated", "interview", interviewId, {
      overall_score: scores.overall,
      recommendation: resultRow.recommendation,
    });

    return ok({ result });
  } catch (err) {
    return failFromError(err, "calculate-interview-result");
  }
});
