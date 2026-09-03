import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getAIProvider } from "../_shared/ai/index.ts";
import { logAudit } from "../_shared/audit.ts";
import { optionalBoolean, readJsonBody, requireUuid } from "../_shared/validate.ts";

interface McqSummary {
  attempts: number;
  best_score: number | null;
  average_score: number | null;
  last_completed_at: string | null;
}

/**
 * POST generate-report
 * Assembles a full interview report (interview, candidate, result, responses,
 * analyses, MCQ summary, optional notes, optional AI narrative). RLS gates
 * every read: candidates only reach their own interviews and only public
 * notes; creators see their interviews and their own notes; admins see all.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    await getProfile(userClient, user.id);

    if (!checkRateLimit(`generate-report:${user.id}`, 30)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const interviewId = requireUuid(body.interview_id, "interview_id");
    const includeNotes = optionalBoolean(body.include_notes, "include_notes") ?? false;

    const { data: interview, error: interviewError } = await userClient
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .maybeSingle();
    if (interviewError) throw new HttpError("DB_ERROR", interviewError.message, 500);
    if (!interview) {
      throw new HttpError("NOT_FOUND", "Interview not found or you are not a participant", 404);
    }

    const candidateId = interview.candidate_id as string | null;

    const [candidateRes, resultRes, responsesRes, analysesRes, attemptsRes] = await Promise.all([
      candidateId
        ? userClient
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", candidateId)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      userClient
        .from("interview_results")
        .select("*")
        .eq("interview_id", interviewId)
        .order("created_at", { ascending: false })
        .limit(1),
      userClient
        .from("responses")
        .select(
          "id, question_id, question_text, text_answer, transcript, audio_url, video_url, duration_seconds, created_at",
        )
        .eq("interview_id", interviewId)
        .order("created_at", { ascending: true }),
      userClient
        .from("ai_analysis")
        .select("*")
        .eq("interview_id", interviewId)
        .order("created_at", { ascending: true }),
      userClient
        .from("mcq_attempts")
        .select("id, score, total_questions, correct_answers, time_taken_seconds, completed_at")
        .eq("interview_id", interviewId)
        .not("completed_at", "is", null),
    ]);

    for (const res of [candidateRes, resultRes, responsesRes, analysesRes, attemptsRes]) {
      if (res.error) throw new HttpError("DB_ERROR", res.error.message, 500);
    }

    const attempts = (attemptsRes.data ?? []) as Array<{
      score: number | null;
      completed_at: string | null;
    }>;
    const scores = attempts
      .map((a) => a.score)
      .filter((s): s is number => typeof s === "number");
    const mcq: McqSummary | null = attempts.length === 0 ? null : {
      attempts: attempts.length,
      best_score: scores.length ? Math.max(...scores) : null,
      average_score: scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : null,
      last_completed_at: attempts
        .map((a) => a.completed_at)
        .filter((d): d is string => !!d)
        .sort()
        .pop() ?? null,
    };

    // Notes: only when requested. RLS already scopes visibility (creator sees
    // their own notes, admin all, candidate only is_private = false).
    let notes: unknown[] | null = null;
    if (includeNotes) {
      const { data: noteRows, error: notesError } = await userClient
        .from("interviewer_notes")
        .select("id, interviewer_id, note, is_private, created_at")
        .eq("interview_id", interviewId)
        .order("created_at", { ascending: true });
      if (notesError) throw new HttpError("DB_ERROR", notesError.message, 500);
      notes = noteRows ?? [];
    }

    const result = (resultRes.data ?? [])[0] ?? null;
    const report = {
      interview,
      candidate: candidateRes.data ?? null,
      result,
      responses: responsesRes.data ?? [],
      analyses: analysesRes.data ?? [],
      mcq,
      notes,
      ai_narrative: null as string | null,
      generated_at: new Date().toISOString(),
    };

    // Optional AI executive narrative - skipped silently when not configured.
    const provider = getAIProvider();
    if (provider) {
      try {
        report.ai_narrative = await provider.generateReport({
          report: {
            interview: {
              title: interview.title,
              type: interview.type,
              difficulty: interview.difficulty,
              job_role: interview.job_role,
              status: interview.status,
            },
            result,
            mcq,
            analyses_count: report.analyses.length,
            responses_count: report.responses.length,
          },
        });
      } catch (aiError) {
        console.error("[generate-report] AI narrative skipped:", aiError);
        report.ai_narrative = null;
      }
    }

    await logAudit(userClient, user.id, "report_generated", "interview", interviewId, {
      include_notes: includeNotes,
    });

    return ok({ report });
  } catch (err) {
    return failFromError(err, "generate-report");
  }
});
