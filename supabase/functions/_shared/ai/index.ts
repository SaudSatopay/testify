import type { AIProvider } from "./types.ts";
import { OpenAIProvider } from "./openai.ts";
import { AnthropicProvider } from "./anthropic.ts";

/**
 * Resolve the configured AI provider:
 *  - AI_PROVIDER=openai|anthropic selects explicitly (needs its key);
 *  - otherwise auto-detect by whichever of OPENAI_API_KEY / ANTHROPIC_API_KEY
 *    exists (OpenAI wins when both are set);
 *  - null when nothing is configured. Callers respond with a
 *    503 AI_NOT_CONFIGURED envelope in that case.
 */
export function getAIProvider(): AIProvider | null {
  const preference = (Deno.env.get("AI_PROVIDER") ?? "").trim().toLowerCase();
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (preference === "openai") {
    return openaiKey ? new OpenAIProvider(openaiKey) : null;
  }
  if (preference === "anthropic") {
    return anthropicKey ? new AnthropicProvider(anthropicKey) : null;
  }
  if (openaiKey) return new OpenAIProvider(openaiKey);
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  return null;
}

export type { AIProvider };
