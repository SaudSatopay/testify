/**
 * In-memory sliding-window rate limiter.
 *
 * LIMITATION: state lives in a module-level Map, i.e. it is PER EDGE-RUNTIME
 * INSTANCE. Supabase may run several isolates (and cold-starts reset the map),
 * so the effective limit is approximate. In production, back this with a
 * durable shared store (Redis/Upstash, or a Postgres table keyed by
 * user+function+window) for a hard guarantee. It still stops the common case:
 * a single client hammering one warm instance.
 *
 * Defaults: 30 requests/min per user per function; AI-backed functions use
 * 15/min. Callers return 429 RATE_LIMITED when this returns false.
 */

const WINDOW_DEFAULT_MS = 60_000;
const LIMIT_DEFAULT = 30;

/** Per-AI-function default (heavier upstream cost). */
export const AI_RATE_LIMIT = 15;

const buckets = new Map<string, number[]>();

/**
 * Returns true when the call is allowed, false when the key exceeded
 * `limit` calls within the sliding `windowMs` window.
 */
export function checkRateLimit(
  key: string,
  limit: number = LIMIT_DEFAULT,
  windowMs: number = WINDOW_DEFAULT_MS,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Opportunistic cleanup so the map cannot grow unbounded on a warm instance.
  if (buckets.size > 10_000) {
    for (const [k, ts] of buckets) {
      if (ts.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }
  return true;
}
