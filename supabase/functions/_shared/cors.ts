/**
 * CORS headers attached to EVERY response (success, failure, and preflight).
 * verify_jwt is disabled in config.toml so the OPTIONS preflight (which
 * carries no Authorization header) reaches the function; each function then
 * verifies the JWT itself via requireUser().
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/** Standard response for the CORS preflight request. */
export function handleOptions(): Response {
  return new Response("ok", { status: 200, headers: corsHeaders });
}
