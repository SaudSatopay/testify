import { HttpError } from "./response.ts";

/**
 * Tiny request validators. Every failure throws
 * HttpError("VALIDATION_ERROR", ..., 400).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function invalid(message: string): HttpError {
  return new HttpError("VALIDATION_ERROR", message, 400);
}

/** Parse the JSON request body into a plain object. */
export async function readJsonBody(
  req: Request,
): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    throw invalid("Request body must be valid JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw invalid("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export interface StringOptions {
  min?: number;
  max?: number;
}

export function requireString(
  value: unknown,
  field: string,
  opts: StringOptions = {},
): string {
  if (typeof value !== "string") throw invalid(`${field} must be a string`);
  const trimmed = value.trim();
  const min = opts.min ?? 1;
  if (trimmed.length < min) {
    throw invalid(`${field} must be at least ${min} character(s)`);
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw invalid(`${field} must be at most ${opts.max} characters`);
  }
  return trimmed;
}

export function optionalString(
  value: unknown,
  field: string,
  opts: StringOptions = {},
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, opts);
}

export function requireNumberInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  const num = typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : value;
  if (typeof num !== "number" || !Number.isFinite(num)) {
    throw invalid(`${field} must be a number`);
  }
  if (num < min || num > max) {
    throw invalid(`${field} must be between ${min} and ${max}`);
  }
  return num;
}

export function optionalNumberInRange(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireNumberInRange(value, field, min, max);
}

export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw invalid(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function optionalEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireEnum(value, field, allowed);
}

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw invalid(`${field} must be a valid UUID`);
  }
  return value.toLowerCase();
}

export function optionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireUuid(value, field);
}

export function optionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw invalid(`${field} must be a boolean`);
  return value;
}

/** Missing value -> []; present value must be an array of strings. */
export function optionalStringArray(
  value: unknown,
  field: string,
  maxItems = 100,
  maxItemLength = 20_000,
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid(`${field} must be an array of strings`);
  if (value.length > maxItems) {
    throw invalid(`${field} must contain at most ${maxItems} items`);
  }
  return value.map((item, i) => {
    if (typeof item !== "string") {
      throw invalid(`${field}[${i}] must be a string`);
    }
    return item.length > maxItemLength ? item.slice(0, maxItemLength) : item;
  });
}

export function requireEmail(value: unknown, field: string): string {
  const email = requireString(value, field, { min: 5, max: 320 });
  if (!EMAIL_RE.test(email)) throw invalid(`${field} must be a valid email address`);
  return email;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
