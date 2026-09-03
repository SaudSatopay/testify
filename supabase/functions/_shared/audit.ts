import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

/**
 * Best-effort audit logging - never throws, never fails the request.
 * With a user client the audit_logs INSERT policy requires
 * user_id === auth.uid(); with the service client any user_id is accepted.
 */
export async function logAudit(
  client: SupabaseClient,
  userId: string | null,
  action: string,
  resourceType?: string | null,
  resourceId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await client.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      metadata: metadata ?? {},
    });
    if (error) {
      console.error(`logAudit(${action}) insert failed:`, error.message);
    }
  } catch (err) {
    console.error(`logAudit(${action}) threw:`, err);
  }
}
