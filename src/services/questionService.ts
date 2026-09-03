import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logAudit } from "@/services/auditService";
import type { Question } from "@/types";

export interface QuestionFilters {
  search?: string;
  category?: string;
  questionType?: string;
  difficulty?: string;
  page?: number;
  pageSize?: number;
}

export const questionService = {
  async list(filters: QuestionFilters = {}): Promise<{ rows: Question[]; count: number }> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? 20;
    let query = supabase
      .from("questions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (filters.search) query = query.ilike("question", `%${filters.search}%`);
    if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
    if (filters.questionType && filters.questionType !== "all")
      query = query.eq("question_type", filters.questionType);
    if (filters.difficulty && filters.difficulty !== "all") query = query.eq("difficulty", filters.difficulty);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: data ?? [], count: count ?? 0 };
  },

  async categories(): Promise<string[]> {
    const { data, error } = await supabase.from("questions").select("category").limit(1000);
    if (error) throw new Error(error.message);
    return [...new Set((data ?? []).map((r) => r.category))].sort();
  },

  async create(input: TablesInsert<"questions">): Promise<Question> {
    const { data, error } = await supabase.from("questions").insert(input).select().single();
    if (error) throw new Error(error.message);
    logAudit("question_created", "question", data.id);
    return data;
  },

  async update(id: string, patch: TablesUpdate<"questions">): Promise<Question> {
    const { data, error } = await supabase.from("questions").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    logAudit("question_updated", "question", id);
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    logAudit("question_deleted", "question", id);
  },

  async duplicate(question: Question, createdBy: string): Promise<Question> {
    return this.create({
      created_by: createdBy,
      category: question.category,
      question: `${question.question} (copy)`,
      question_type: question.question_type,
      difficulty: question.difficulty,
      expected_topics: question.expected_topics,
      ideal_answer: question.ideal_answer,
      time_limit_seconds: question.time_limit_seconds,
    });
  },
};
