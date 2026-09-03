import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";
import { HttpError } from "./response.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError("CONFIG_ERROR", `${name} is not configured`, 500);
  }
  return value;
}

/**
 * RLS-scoped client: anon key + the caller's Authorization header.
 * Every query runs as the calling user, so Row Level Security applies.
 */
export function createUserClient(req: Request): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client: BYPASSES Row Level Security.
 * Use ONLY where the spec requires it (admin verification/actions, storage
 * downloads that were already authorized in code, profile lookups by email).
 */
export function createServiceClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface PostgrestLikeError {
  message: string;
  code?: string;
}

interface PostgrestLikeResult<T> {
  data: T | null;
  error: PostgrestLikeError | null;
}

/**
 * Unwrap a supabase-js result, mapping common PostgREST failures onto the
 * envelope error codes.
 */
export function unwrap<T>(result: PostgrestLikeResult<T>, what: string): T {
  if (result.error) {
    if (result.error.code === "42501") {
      throw new HttpError("FORBIDDEN", `Not allowed: ${what}`, 403);
    }
    if (result.error.code === "PGRST116") {
      throw new HttpError("NOT_FOUND", `${what}: not found`, 404);
    }
    throw new HttpError("DB_ERROR", `${what}: ${result.error.message}`, 500);
  }
  return result.data as T;
}
