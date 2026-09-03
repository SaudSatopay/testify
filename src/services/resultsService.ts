import { supabase } from "@/integrations/supabase/client";
import type { Interview, InterviewResult } from "@/types";

export interface ResultWithInterview extends InterviewResult {
  interview: Interview | null;
}

async function attachInterviews(results: InterviewResult[]): Promise<ResultWithInterview[]> {
  const ids = [...new Set(results.map((r) => r.interview_id))];
  if (ids.length === 0) return results.map((r) => ({ ...r, interview: null }));
  const { data, error } = await supabase.from("interviews").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map((data ?? []).map((i) => [i.id, i]));
  return results.map((r) => ({ ...r, interview: byId.get(r.interview_id) ?? null }));
}

export const resultsService = {
  async listForCandidate(candidateId: string): Promise<ResultWithInterview[]> {
    const { data, error } = await supabase
      .from("interview_results")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return attachInterviews(data ?? []);
  },

  async getByInterview(interviewId: string): Promise<InterviewResult | null> {
    const { data, error } = await supabase
      .from("interview_results")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  /** Results for interviews created by an interviewer. */
  async listForCreator(creatorId: string): Promise<ResultWithInterview[]> {
    const { data: interviews, error } = await supabase
      .from("interviews")
      .select("id")
      .eq("created_by", creatorId);
    if (error) throw new Error(error.message);
    const ids = (interviews ?? []).map((i) => i.id);
    if (ids.length === 0) return [];
    const { data, error: rErr } = await supabase
      .from("interview_results")
      .select("*")
      .in("interview_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    if (rErr) throw new Error(rErr.message);
    return attachInterviews(data ?? []);
  },

  /** Score history (oldest → newest) for candidate progress charts. */
  async progressForCandidate(candidateId: string): Promise<InterviewResult[]> {
    const { data, error } = await supabase
      .from("interview_results")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: true })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
