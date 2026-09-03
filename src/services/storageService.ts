import { supabase } from "@/integrations/supabase/client";

/**
 * Recording uploads follow the path convention enforced by storage RLS:
 * recordings/{candidate_id}/{interview_id}/{timestamp}-{kind}.webm
 */
export const storageService = {
  async uploadRecording(
    blob: Blob,
    candidateId: string,
    interviewId: string,
    kind: "audio" | "video",
  ): Promise<string> {
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${candidateId}/${interviewId}/${Date.now()}-${kind}.${ext}`;
    const { error } = await supabase.storage.from("recordings").upload(path, blob, {
      contentType: blob.type || (kind === "audio" ? "audio/webm" : "video/webm"),
    });
    if (error) throw new Error(error.message);
    return path;
  },

  async recordingSignedUrl(path: string, expiresInSeconds = 60 * 30): Promise<string> {
    const { data, error } = await supabase.storage
      .from("recordings")
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};
