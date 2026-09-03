import { corsHeaders } from "./cors.ts";

/**
 * Uniform JSON envelope used by every edge function:
 *   success: { success: true,  data: <object>, error: null }
 *   failure: { success: false, data: null,     error: { code, message } }
 */

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

/** Structured error carrying an envelope code and an HTTP status. */
export class HttpError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

const jsonHeaders: Record<string, string> = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

/** 200 success envelope. */
export function ok<T>(data: T): Response {
  const body: ApiEnvelope<T> = { success: true, data, error: null };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: jsonHeaders,
  });
}

/** Failure envelope with an appropriate HTTP status code. */
export function fail(code: string, message: string, status = 400): Response {
  const body: ApiEnvelope<never> = {
    success: false,
    data: null,
    error: { code, message },
  };
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

/**
 * Convert any thrown value into a failure Response.
 * HttpError keeps its code/status; everything else becomes INTERNAL_ERROR
 * (logged server-side, never leaked to the client).
 */
export function failFromError(err: unknown, context: string): Response {
  if (err instanceof HttpError) {
    if (err.status >= 500) console.error(`[${context}]`, err.code, err.message);
    return fail(err.code, err.message, err.status);
  }
  console.error(`[${context}] unhandled error:`, err);
  return fail("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
