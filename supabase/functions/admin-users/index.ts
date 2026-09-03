import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { logAudit } from "../_shared/audit.ts";
import { readJsonBody, requireEnum, requireUuid } from "../_shared/validate.ts";

type AdminAction = "change_role" | "suspend" | "activate" | "delete";

/**
 * POST admin-users
 * Admin-only user management: change_role | suspend | activate | delete.
 * The caller's admin role is verified through the SERVICE client (never
 * trusting the user-scoped view), and acting on your own account is refused.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user } = await requireUser(req);

    // Verify the caller via the service role, as required by the spec.
    const serviceClient = createServiceClient();
    const { data: caller, error: callerError } = await serviceClient
      .from("profiles")
      .select("id, role, status")
      .eq("id", user.id)
      .maybeSingle();
    if (callerError) throw new HttpError("DB_ERROR", callerError.message, 500);
    if (!caller || caller.role !== "admin") {
      throw new HttpError("FORBIDDEN", "Admin role required", 403);
    }
    if (caller.status !== "active") {
      throw new HttpError("ACCOUNT_SUSPENDED", "This account is suspended", 403);
    }

    if (!checkRateLimit(`admin-users:${user.id}`, 30)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const action = requireEnum(body.action, "action", [
      "change_role",
      "suspend",
      "activate",
      "delete",
    ] as const) as AdminAction;
    const targetUserId = requireUuid(body.user_id, "user_id");

    if (targetUserId === user.id) {
      throw new HttpError("CANNOT_MODIFY_SELF", "You cannot perform admin actions on your own account", 400);
    }

    if (action === "change_role") {
      const role = requireEnum(body.role, "role", [
        "candidate",
        "interviewer",
        "admin",
      ] as const);

      const { data: updated, error } = await serviceClient
        .from("profiles")
        .update({ role })
        .eq("id", targetUserId)
        .select("id")
        .maybeSingle();
      if (error) throw new HttpError("DB_ERROR", error.message, 500);
      if (!updated) throw new HttpError("USER_NOT_FOUND", "No user exists with that id", 404);

      await logAudit(serviceClient, user.id, "admin_change_role", "profile", targetUserId, { role });
      return ok({ user_id: targetUserId, action, role });
    }

    if (action === "suspend" || action === "activate") {
      const status = action === "suspend" ? "suspended" : "active";

      const { data: updated, error } = await serviceClient
        .from("profiles")
        .update({ status })
        .eq("id", targetUserId)
        .select("id")
        .maybeSingle();
      if (error) throw new HttpError("DB_ERROR", error.message, 500);
      if (!updated) throw new HttpError("USER_NOT_FOUND", "No user exists with that id", 404);

      await logAudit(
        serviceClient,
        user.id,
        action === "suspend" ? "admin_suspend_user" : "admin_activate_user",
        "profile",
        targetUserId,
        { status },
      );
      return ok({ user_id: targetUserId, action, status });
    }

    // action === "delete": removes the auth user; the profile row (and its
    // dependents) cascade from auth.users.
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      const status = typeof deleteError.status === "number" ? deleteError.status : 500;
      if (status === 404) {
        throw new HttpError("USER_NOT_FOUND", "No user exists with that id", 404);
      }
      throw new HttpError("DELETE_FAILED", `Failed to delete user: ${deleteError.message}`, 500);
    }

    await logAudit(serviceClient, user.id, "admin_delete_user", "profile", targetUserId, {});
    return ok({ user_id: targetUserId, action });
  } catch (err) {
    return failFromError(err, "admin-users");
  }
});
