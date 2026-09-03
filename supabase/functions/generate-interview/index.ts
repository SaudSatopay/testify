import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { AI_RATE_LIMIT, checkRateLimit } from "../_shared/rateLimit.ts";
import { getAIProvider } from "../_shared/ai/index.ts";
import type {
  AIProvider,
  Difficulty,
  GeneratedQuestion,
  InterviewAIType,
} from "../_shared/ai/types.ts";
import { logAudit } from "../_shared/audit.ts";
import {
  optionalBoolean,
  optionalNumberInRange,
  optionalString,
  optionalUuid,
  readJsonBody,
  requireEnum,
  requireNumberInRange,
} from "../_shared/validate.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

type InterviewType = "ai_mock" | "live" | "mcq" | "technical" | "mixed";

interface InterviewRow {
  id: string;
  title: string;
  created_by: string;
  candidate_id: string | null;
  type: InterviewType;
  status: string;
  difficulty: Difficulty;
  job_role: string | null;
  settings: Record<string, unknown>;
  [key: string]: unknown;
}

interface QuestionRow {
  id: string;
  category: string;
  question: string;
  question_type: string;
  difficulty: string;
  expected_topics: unknown;
  ideal_answer: string | null;
  time_limit_seconds: number;
  is_ai_generated: boolean;
  [key: string]: unknown;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function pickFromQuestionBank(
  client: SupabaseClient,
  aiType: InterviewAIType,
  difficulty: Difficulty,
  count: number,
): Promise<QuestionRow[]> {
  const types = aiType === "technical"
    ? ["technical", "coding"]
    : aiType === "hr"
    ? ["hr"]
    : aiType === "behavioral"
    ? ["behavioral", "situational"]
    : ["behavioral", "hr", "technical", "situational"];

  // expert falls back to include hard; a second pass drops the difficulty
  // filter entirely if nothing matched.
  const difficulties = difficulty === "expert" ? ["expert", "hard"] : [difficulty];

  let { data, error } = await client
    .from("questions")
    .select("*")
    .in("question_type", types)
    .in("difficulty", difficulties)
    .limit(100);
  if (error) throw new HttpError("DB_ERROR", `Question bank query failed: ${error.message}`, 500);

  if (!data || data.length === 0) {
    const retry = await client
      .from("questions")
      .select("*")
      .in("question_type", types)
      .limit(100);
    if (retry.error) {
      throw new HttpError("DB_ERROR", `Question bank query failed: ${retry.error.message}`, 500);
    }
    data = retry.data;
  }

  return shuffle((data ?? []) as QuestionRow[]).slice(0, count);
}

async function generateWithAI(
  client: SupabaseClient,
  provider: AIProvider,
  userId: string,
  jobRole: string,
  aiType: InterviewAIType,
  difficulty: Difficulty,
  count: number,
  experienceYears: number | undefined,
): Promise<QuestionRow[]> {
  const generated: GeneratedQuestion[] = [];
  for (let i = 1; i <= count; i++) {
    const question = await provider.generateQuestion({
      role: jobRole,
      experienceYears,
      interviewType: aiType,
      difficulty,
      questionNumber: i,
      totalQuestions: count,
      previousQuestions: generated.map((q) => q.question),
      previousAnswers: [],
    });
    generated.push(question);
  }

  const { data, error } = await client
    .from("questions")
    .insert(
      generated.map((q) => ({
        created_by: userId,
        category: q.category,
        question: q.question,
        question_type: q.question_type,
        difficulty: q.difficulty,
        expected_topics: q.expected_topics,
        time_limit_seconds: q.time_limit_seconds,
        is_ai_generated: true,
      })),
    )
    .select("*");
  if (error) throw new HttpError("DB_ERROR", `Failed to store generated questions: ${error.message}`, 500);
  return (data ?? []) as QuestionRow[];
}

/**
 * POST generate-interview
 * Creates (or reuses) an interview and assembles its question set from the
 * question bank and/or the AI provider.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    const profile = await getProfile(userClient, user.id);

    if (!checkRateLimit(`generate-interview:${user.id}`, AI_RATE_LIMIT)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const interviewId = optionalUuid(body.interview_id, "interview_id");
    const createInterview = optionalBoolean(body.create_interview, "create_interview") ?? !interviewId;
    const jobRole = optionalString(body.job_role, "job_role", { max: 120 });
    const interviewType = requireEnum(body.interview_type, "interview_type", [
      "ai_mock",
      "live",
      "mcq",
      "technical",
      "mixed",
    ] as const);
    const difficulty = requireEnum(body.difficulty, "difficulty", [
      "easy",
      "medium",
      "hard",
      "expert",
    ] as const);
    const questionCount = Math.round(
      requireNumberInRange(body.question_count, "question_count", 1, 20),
    );
    const durationMinutesRaw = optionalNumberInRange(body.duration_minutes, "duration_minutes", 5, 480);
    const durationMinutes = durationMinutesRaw === undefined ? undefined : Math.round(durationMinutesRaw);
    const experienceYears = optionalNumberInRange(body.experience_years, "experience_years", 0, 60);
    const useQuestionBank = optionalBoolean(body.use_question_bank, "use_question_bank") ?? false;
    const title = optionalString(body.title, "title", { max: 200 });
    const description = optionalString(body.description, "description", { max: 2000 });
    const extraSettings =
      body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
        ? (body.settings as Record<string, unknown>)
        : {};

    if (!interviewId && !jobRole) {
      throw new HttpError("VALIDATION_ERROR", "job_role is required when creating an interview", 400);
    }

    let interview: InterviewRow;

    if (interviewId) {
      const { data, error } = await userClient
        .from("interviews")
        .select("*")
        .eq("id", interviewId)
        .maybeSingle();
      if (error) throw new HttpError("DB_ERROR", error.message, 500);
      if (!data) {
        throw new HttpError("NOT_FOUND", "Interview not found or you are not a participant", 404);
      }
      interview = data as InterviewRow;
    } else if (createInterview) {
      const isCandidate = profile.role === "candidate";
      if (isCandidate && interviewType !== "ai_mock") {
        throw new HttpError(
          "FORBIDDEN",
          "Candidates can only create AI mock practice interviews",
          403,
        );
      }

      const settings: Record<string, unknown> = {
        ...extraSettings,
        question_count: questionCount,
      };
      if (experienceYears !== undefined) settings.experience_years = experienceYears;
      if (interviewType === "mcq" && settings.mcq_question_count === undefined) {
        settings.mcq_question_count = questionCount;
      }

      const now = new Date().toISOString();
      const insertRow = {
        title: title ?? `${jobRole} - ${interviewType.replace("_", " ")} interview`,
        description: description ?? null,
        created_by: user.id,
        candidate_id: isCandidate ? user.id : null,
        type: interviewType,
        status: isCandidate ? "active" : "draft",
        difficulty,
        job_role: jobRole,
        duration_minutes: durationMinutes ?? 30,
        started_at: isCandidate ? now : null,
        settings,
      };

      const { data, error } = await userClient
        .from("interviews")
        .insert(insertRow)
        .select("*")
        .single();
      if (error) {
        if (error.code === "42501") {
          throw new HttpError("FORBIDDEN", "You are not allowed to create this interview", 403);
        }
        throw new HttpError("DB_ERROR", `Failed to create interview: ${error.message}`, 500);
      }
      interview = data as InterviewRow;
    } else {
      throw new HttpError(
        "VALIDATION_ERROR",
        "Provide interview_id or set create_interview = true",
        400,
      );
    }

    // MCQ interviews have no `questions` rows; the MCQ set is drawn later by
    // the start_mcq_attempt RPC from interview.settings.
    if (interview.type === "mcq") {
      await logAudit(userClient, user.id, "interview_generated", "interview", interview.id, {
        type: interview.type,
        question_count: 0,
      });
      return ok({ interview, questions: [] });
    }

    const aiType: InterviewAIType = interviewType === "technical" ? "technical" : "mixed";
    const effectiveRole = jobRole ?? interview.job_role ?? "General";
    const provider = getAIProvider();

    let questions: QuestionRow[] = [];
    if (!useQuestionBank && provider) {
      questions = await generateWithAI(
        userClient,
        provider,
        user.id,
        effectiveRole,
        aiType,
        difficulty,
        questionCount,
        experienceYears,
      );
    } else {
      questions = await pickFromQuestionBank(userClient, aiType, difficulty, questionCount);
      if (questions.length === 0 && provider) {
        questions = await generateWithAI(
          userClient,
          provider,
          user.id,
          effectiveRole,
          aiType,
          difficulty,
          questionCount,
          experienceYears,
        );
      }
    }

    if (questions.length === 0) {
      throw new HttpError(
        "AI_NOT_CONFIGURED",
        "No AI provider is configured and the question bank has no matching questions. Set OPENAI_API_KEY or ANTHROPIC_API_KEY, or seed the question bank.",
        503,
      );
    }

    const { error: linkError } = await userClient.from("interview_questions").insert(
      questions.map((q, index) => ({
        interview_id: interview.id,
        question_id: q.id,
        order_number: index + 1,
      })),
    );
    if (linkError && linkError.code !== "23505") {
      throw new HttpError("DB_ERROR", `Failed to attach questions: ${linkError.message}`, 500);
    }

    await logAudit(userClient, user.id, "interview_generated", "interview", interview.id, {
      type: interview.type,
      question_count: questions.length,
      source: !useQuestionBank && provider ? "ai" : "question_bank",
    });

    return ok({ interview, questions });
  } catch (err) {
    return failFromError(err, "generate-interview");
  }
});
