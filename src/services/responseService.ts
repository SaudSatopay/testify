import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { AIAnalysis, ResponseRow } from "@/types";

export const responseService = {
  async create(input: TablesInsert<"responses">): Promise<ResponseRow> {
    const { data, error } = await supabase.from("responses").insert(input).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, patch: TablesUpdate<"responses">): Promise<ResponseRow> {
    const { data, error } = await supabase.from("responses").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listByInterview(interviewId: string): Promise<ResponseRow[]> {
    const { data, error } = await supabase
      .from("responses")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async analysesByInterview(interviewId: string): Promise<AIAnalysis[]> {
    const { data, error } = await supabase
      .from("ai_analysis")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
