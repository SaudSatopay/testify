import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.45.4";
import { HttpError } from "./response.ts";
import { createUserClient } from "./supabase.ts";

export type UserRole = "candidate" | "interviewer" | "admin";
export type UserStatus = "active" | "suspended";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  experience_years: number | null;
}

export interface AuthContext {
  user: User;
  userClient: SupabaseClient;
}

/**
 * Verify the caller's JWT (config.toml sets verify_jwt = false so that the
 * CORS preflight succeeds; THIS is the mandatory auth gate for every request).
 * Returns the verified user plus an RLS-scoped client.
 */
export async function requireUser(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new HttpError("UNAUTHORIZED", "Missing Authorization bearer token", 401);
  }

  const userClient = createUserClient(req);
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError("UNAUTHORIZED", "Invalid or expired token", 401);
  }
  return { user: data.user, userClient };
}

/**
 * Load the caller's profile and enforce that the account is active.
 * Throws 404 PROFILE_NOT_FOUND / 403 ACCOUNT_SUSPENDED.
 */
export async function getProfile(
  client: SupabaseClient,
  userId: string,
): Promise<Profile> {
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, status, experience_years")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError("DB_ERROR", `Failed to load profile: ${error.message}`, 500);
  }
  if (!data) {
    throw new HttpError("PROFILE_NOT_FOUND", "No profile exists for this user", 404);
  }
  const profile = data as Profile;
  if (profile.status !== "active") {
    throw new HttpError("ACCOUNT_SUSPENDED", "This account is suspended", 403);
  }
  return profile;
}

/** Throw 403 FORBIDDEN unless the profile has one of the allowed roles. */
export function requireRole(profile: Profile, roles: readonly UserRole[]): void {
  if (!roles.includes(profile.role)) {
    throw new HttpError(
      "FORBIDDEN",
      `This action requires one of the roles: ${roles.join(", ")}`,
      403,
    );
  }
}
