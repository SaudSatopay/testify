import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/services/auditService";
import type { InterviewInvitation } from "@/types";

export const invitationService = {
  async listByInterview(interviewId: string): Promise<InterviewInvitation[]> {
    const { data, error } = await supabase
      .from("interview_invitations")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /**
   * Accept an invitation by token — SECURITY DEFINER RPC validates the token,
   * expiry, and that the caller's email matches. Returns the interview id.
   */
  async accept(token: string): Promise<string> {
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) throw new Error(error.message);
    logAudit("invitation_accepted", "interview", data ?? undefined);
    return data as string;
  },

  async cancel(id: string): Promise<void> {
    const { error } = await supabase
      .from("interview_invitations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
