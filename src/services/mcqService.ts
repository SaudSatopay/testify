import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logAudit } from "@/services/auditService";
import type { MCQAnswerSubmission, MCQAttempt, MCQQuestion, MCQQuizStart, MCQSubmitResult } from "@/types";

export interface MCQFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  page?: number;
  pageSize?: number;
}

export const mcqService = {
  /* ---------------- bank management (interviewer/admin) ---------------- */

  async list(filters: MCQFilters = {}): Promise<{ rows: MCQQuestion[]; count: number }> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? 20;
    let query = supabase
      .from("mcq_questions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (filters.search) query = query.ilike("question", `%${filters.search}%`);
    if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
    if (filters.difficulty && filters.difficulty !== "all") query = query.eq("difficulty", filters.difficulty);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: data ?? [], count: count ?? 0 };
  },

  async create(input: TablesInsert<"mcq_questions">): Promise<MCQQuestion> {
    const { data, error } = await supabase.from("mcq_questions").insert(input).select().single();
    if (error) throw new Error(error.message);
    logAudit("mcq_created", "mcq_question", data.id);
    return data;
  },

  async update(id: string, patch: TablesUpdate<"mcq_questions">): Promise<MCQQuestion> {
    const { data, error } = await supabase.from("mcq_questions").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    logAudit("mcq_updated", "mcq_question", id);
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("mcq_questions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    logAudit("mcq_deleted", "mcq_question", id);
  },

  async duplicate(q: MCQQuestion, createdBy: string): Promise<MCQQuestion> {
    return this.create({
      created_by: createdBy,
      category: q.category,
      question: `${q.question} (copy)`,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: q.difficulty,
    });
  },

  /* ---------------- taking assessments (candidate) ---------------- */

  /**
   * Starts an attempt server-side (SECURITY DEFINER RPC): the client never
   * receives correct answers before submission.
   */
  async startQuiz(params: {
    category?: string;
    difficulty?: string;
    count?: number;
    interviewId?: string;
  }): Promise<MCQQuizStart> {
    const { data, error } = await supabase.rpc("start_mcq_attempt", {
      p_category: params.category ?? null,
      p_difficulty: params.difficulty ?? null,
      p_count: params.count ?? 10,
      p_interview_id: params.interviewId ?? null,
    });
    if (error) throw new Error(error.message);
    return data as unknown as MCQQuizStart;
  },

  /** Scores are computed server-side; explanations are returned post-submit. */
  async submitQuiz(attemptId: string, answers: MCQAnswerSubmission[]): Promise<MCQSubmitResult> {
    const { data, error } = await supabase.rpc("submit_mcq_attempt", {
      p_attempt_id: attemptId,
      p_answers: answers as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return data as unknown as MCQSubmitResult;
  },

  async attemptsForCandidate(candidateId: string): Promise<MCQAttempt[]> {
    const { data, error } = await supabase
      .from("mcq_attempts")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async attemptsForInterview(interviewId: string): Promise<MCQAttempt[]> {
    const { data, error } = await supabase
      .from("mcq_attempts")
      .select("*")
      .eq("interview_id", interviewId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async categoriesInBank(): Promise<string[]> {
    const { data, error } = await supabase.from("mcq_questions").select("category").limit(1000);
    if (error) throw new Error(error.message);
    return [...new Set((data ?? []).map((r) => r.category))].sort();
  },
};
