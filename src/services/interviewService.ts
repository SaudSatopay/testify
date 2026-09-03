import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { safeAverage } from "@/lib/utils";
import { logAudit } from "@/services/auditService";
import type { Interview, InterviewWithPeople, Profile, Question } from "@/types";

type PersonSlice = Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;

async function fetchPeople(ids: string[]): Promise<Map<string, PersonSlice>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", unique);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/** Attach candidate + creator profile slices to interview rows. */
export async function attachPeople(interviews: Interview[]): Promise<InterviewWithPeople[]> {
  const ids = interviews.flatMap((i) => [i.candidate_id ?? "", i.created_by]);
  const people = await fetchPeople(ids);
  return interviews.map((i) => ({
    ...i,
    candidate: i.candidate_id ? (people.get(i.candidate_id) ?? null) : null,
    creator: people.get(i.created_by) ?? null,
  }));
}

export const interviewService = {
  async getById(id: string): Promise<Interview | null> {
    const { data, error } = await supabase.from("interviews").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async getWithPeople(id: string): Promise<InterviewWithPeople | null> {
    const interview = await this.getById(id);
    if (!interview) return null;
    const [withPeople] = await attachPeople([interview]);
    return withPeople ?? null;
  },

  /** Interviews assigned to a candidate (excludes their own practice sessions). */
  async listForCandidate(candidateId: string): Promise<InterviewWithPeople[]> {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("candidate_id", candidateId)
      .neq("created_by", candidateId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return attachPeople(data ?? []);
  },

  /** Practice sessions the candidate created for themselves. */
  async listPractice(candidateId: string): Promise<Interview[]> {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("created_by", candidateId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async listCreatedBy(userId: string): Promise<InterviewWithPeople[]> {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return attachPeople(data ?? []);
  },

  /** Admin: paginated listing of all interviews. */
  async listAll(page: number, pageSize: number, status?: string): Promise<{ rows: InterviewWithPeople[]; count: number }> {
    let query = supabase
      .from("interviews")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: await attachPeople(data ?? []), count: count ?? 0 };
  },

  async create(input: TablesInsert<"interviews">): Promise<Interview> {
    const { data, error } = await supabase.from("interviews").insert(input).select().single();
    if (error) throw new Error(error.message);
    logAudit("interview_created", "interview", data.id, { type: data.type, title: data.title });
    return data;
  },

  async update(id: string, patch: TablesUpdate<"interviews">): Promise<Interview> {
    const { data, error } = await supabase.from("interviews").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("interviews").delete().eq("id", id);
    if (error) throw new Error(error.message);
    logAudit("interview_deleted", "interview", id);
  },

  async start(id: string): Promise<Interview> {
    const patch: TablesUpdate<"interviews"> = { status: "active", started_at: new Date().toISOString() };
    const { data, error } = await supabase.from("interviews").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    logAudit("interview_started", "interview", id);
    return data;
  },

  async end(id: string, status: "completed" | "cancelled" = "completed"): Promise<Interview> {
    const { data, error } = await supabase
      .from("interviews")
      .update({ status, ended_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    logAudit("interview_ended", "interview", id, { status });
    return data;
  },

  /** Ordered question list for an interview. */
  async getQuestions(interviewId: string): Promise<Question[]> {
    const { data: links, error } = await supabase
      .from("interview_questions")
      .select("question_id, order_number")
      .eq("interview_id", interviewId)
      .order("order_number", { ascending: true });
    if (error) throw new Error(error.message);
    if (!links || links.length === 0) return [];

    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .in("id", links.map((l) => l.question_id));
    if (qError) throw new Error(qError.message);

    const byId = new Map((questions ?? []).map((q) => [q.id, q]));
    return links
      .map((l) => byId.get(l.question_id))
      .filter((q): q is Question => Boolean(q));
  },

  async setQuestions(interviewId: string, questionIds: string[]): Promise<void> {
    const { error: delError } = await supabase
      .from("interview_questions")
      .delete()
      .eq("interview_id", interviewId);
    if (delError) throw new Error(delError.message);
    if (questionIds.length === 0) return;
    const rows = questionIds.map((question_id, i) => ({
      interview_id: interviewId,
      question_id,
      order_number: i + 1,
    }));
    const { error } = await supabase.from("interview_questions").insert(rows);
    if (error) throw new Error(error.message);
  },

  /* ---------------- dashboard aggregates ---------------- */

  async candidateStats(userId: string): Promise<{
    completed: number;
    practiceSessions: number;
    averageScore: number | null;
    bestScore: number | null;
  }> {
    const [completedRes, practiceRes, resultsRes] = await Promise.all([
      supabase
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", userId)
        .eq("status", "completed"),
      supabase
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", userId)
        .eq("created_by", userId),
      supabase
        .from("interview_results")
        .select("overall_score")
        .eq("candidate_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (completedRes.error) throw new Error(completedRes.error.message);
    if (practiceRes.error) throw new Error(practiceRes.error.message);
    if (resultsRes.error) throw new Error(resultsRes.error.message);

    const scores = (resultsRes.data ?? []).map((r) => r.overall_score);
    const present = scores.filter((s): s is number => s != null);
    return {
      completed: completedRes.count ?? 0,
      practiceSessions: practiceRes.count ?? 0,
      averageScore: safeAverage(scores),
      bestScore: present.length ? Math.max(...present) : null,
    };
  },

  async interviewerStats(userId: string): Promise<{
    total: number;
    upcoming: number;
    completed: number;
    candidates: number;
    averageScore: number | null;
  }> {
    const { data, error } = await supabase
      .from("interviews")
      .select("id, status, candidate_id, scheduled_at")
      .eq("created_by", userId);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const ids = rows.map((r) => r.id);

    let averageScore: number | null = null;
    if (ids.length > 0) {
      const { data: results, error: rErr } = await supabase
        .from("interview_results")
        .select("overall_score, interview_id")
        .in("interview_id", ids.slice(0, 500));
      if (rErr) throw new Error(rErr.message);
      averageScore = safeAverage((results ?? []).map((r) => r.overall_score));
    }

    return {
      total: rows.length,
      upcoming: rows.filter((r) => r.status === "scheduled").length,
      completed: rows.filter((r) => r.status === "completed").length,
      candidates: new Set(rows.map((r) => r.candidate_id).filter(Boolean)).size,
      averageScore,
    };
  },
};
