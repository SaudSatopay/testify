import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { logAudit } from "@/services/auditService";
import type { Profile } from "@/types";

function fileExtension(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "bin";
}

export const profileService = {
  async get(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async update(userId: string, patch: TablesUpdate<"profiles">): Promise<Profile> {
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
    if (error) throw new Error(error.message);
    logAudit("profile_updated", "profile", userId);
    return data;
  },

  /** Avatars bucket is public — returns the public URL. */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Avatar must be smaller than 5 MB.");
    const path = `${userId}/avatar-${Date.now()}.${fileExtension(file)}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await this.update(userId, { avatar_url: data.publicUrl });
    return data.publicUrl;
  },

  /** Resumes bucket is private — stores the storage path in resume_url. */
  async uploadResume(userId: string, file: File): Promise<string> {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) throw new Error("Resume must be a PDF or Word document.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Resume must be smaller than 10 MB.");
    const path = `${userId}/resume-${Date.now()}.${fileExtension(file)}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    await this.update(userId, { resume_url: path });
    logAudit("resume_uploaded", "profile", userId);
    return path;
  },

  /** Time-limited signed URL for a private resume path. */
  async resumeSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 10);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};
