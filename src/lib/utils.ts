import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to at most one decimal place. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Safe average over an array of possibly-null numbers; null when nothing present. */
export function safeAverage(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (present.length === 0) return null;
  return round1(present.reduce((a, b) => a + b, 0) / present.length);
}

/** Random id for client-side keys (not for database rows). */
export function clientId(): string {
  return Math.random().toString(36).slice(2, 10);
}
