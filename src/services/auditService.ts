import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Fire-and-forget audit logging. Uses the `log_audit` SECURITY DEFINER
 * RPC so entries are attributed server-side to the authenticated user.
 * Never throws — auditing must not break the user flow.
 */
export function logAudit(
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, Json | undefined>,
): void {
  void supabase
    .rpc("log_audit", {
      p_action: action,
      p_resource_type: resourceType ?? null,
      p_resource_id: resourceId ?? null,
      p_metadata: (metadata ?? {}) as Json,
    })
    .then(({ error }) => {
      if (error) console.warn("audit log failed:", error.message);
    });
}
