import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { AI_RATE_LIMIT, checkRateLimit } from "../_shared/rateLimit.ts";
import { getAIProvider } from "../_shared/ai/index.ts";
import type { GenerateQuestionParams } from "../_shared/ai/types.ts";
import {
  optionalNumberInRange,
  optionalString,
  optionalStringArray,
  optionalUuid,
  readJsonBody,
  requireEnum,
  requireNumberInRange,
  requireString,
} from "../_shared/validate.ts";

/**
 * POST generate-question
 * Generates the next adaptive interview question (or a follow-up ~30% of the
 * time after question 2 when the previous answer has substance).
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    await getProfile(userClient, user.id); // enforces active account

    if (!checkRateLimit(`generate-question:${user.id}`, AI_RATE_LIMIT)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const role = requireString(body.role, "role", { min: 2, max: 120 });
    const interviewType = requireEnum(body.interview_type, "interview_type", [
      "hr",
      "technical",
      "behavioral",
      "mixed",
    ] as const);
    const difficulty = requireEnum(body.difficulty, "difficulty", [
      "easy",
      "medium",
      "hard",
      "expert",
    ] as const);
    const questionNumber = requireNumberInRange(body.question_number, "question_number", 1, 100);
    const totalQuestions = requireNumberInRange(body.total_questions, "total_questions", 1, 100);
    const previousQuestions = optionalStringArray(body.previous_questions, "previous_questions", 100, 2000);
    const previousAnswers = optionalStringArray(body.previous_answers, "previous_answers", 100, 20_000);
    const experienceYears = optionalNumberInRange(body.experience_years, "experience_years", 0, 60);
    const category = optionalString(body.category, "category", { max: 120 });
    const resumeSummary = optionalString(body.resume_summary, "resume_summary", { max: 6000 });
    const interviewId = optionalUuid(body.interview_id, "interview_id");

    // If tied to an interview, the RLS-scoped select proves the caller is a
    // participant (creator/candidate/admin) - non-participants see no row.
    if (interviewId) {
      const { data: interview, error } = await userClient
        .from("interviews")
        .select("id")
        .eq("id", interviewId)
        .maybeSingle();
      if (error) throw new HttpError("DB_ERROR", error.message, 500);
      if (!interview) {
        throw new HttpError("NOT_FOUND", "Interview not found or you are not a participant", 404);
      }
    }

    const provider = getAIProvider();
    if (!provider) {
      throw new HttpError(
        "AI_NOT_CONFIGURED",
        "No AI provider is configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY (and optionally AI_PROVIDER).",
        503,
      );
    }

    const params: GenerateQuestionParams = {
      role,
      experienceYears,
      interviewType,
      difficulty,
      category,
      questionNumber,
      totalQuestions,
      previousQuestions,
      previousAnswers,
      resumeSummary,
    };

    // Adaptive behavior: first question is always an introduction (handled in
    // the prompt); after Q2, ~30% of questions become follow-ups when the last
    // answer has enough substance to probe.
    const lastAnswer = previousAnswers[previousAnswers.length - 1] ?? "";
    const askFollowUp =
      questionNumber > 2 &&
      lastAnswer.trim().split(/\s+/).filter(Boolean).length >= 12 &&
      Math.random() < 0.3;

    const question = askFollowUp
      ? await provider.generateFollowUp(params)
      : await provider.generateQuestion(params);

    return ok(question);
  } catch (err) {
    return failFromError(err, "generate-question");
  }
});
