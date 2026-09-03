import { supabase } from "@/integrations/supabase/client";
import type { InterviewerNote } from "@/types";

export const notesService = {
  async listByInterview(interviewId: string): Promise<InterviewerNote[]> {
    const { data, error } = await supabase
      .from("interviewer_notes")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async add(interviewId: string, interviewerId: string, note: string, isPrivate = true): Promise<InterviewerNote> {
    const { data, error } = await supabase
      .from("interviewer_notes")
      .insert({ interview_id: interviewId, interviewer_id: interviewerId, note, is_private: isPrivate })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("interviewer_notes").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
