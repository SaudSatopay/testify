import type {
  AIProvider,
  AnalyzeAnswerParams,
  AnswerAnalysis,
  GeneratedQuestion,
  GenerateQuestionParams,
  ResultSummary,
  SummaryParams,
} from "./types.ts";
import {
  analysisSystemPrompt,
  analysisUserPrompt,
  normalizeAnswerAnalysis,
  normalizeGeneratedQuestion,
  normalizeResultSummary,
  parseJsonObject,
  questionSystemPrompt,
  questionUserPrompt,
  reportSystemPrompt,
  reportUserPrompt,
  summarySystemPrompt,
  summaryUserPrompt,
} from "./prompts.ts";

/**
 * Base URL is configurable so any OpenAI-compatible provider works —
 * including free tiers: Groq (https://api.groq.com/openai/v1), Google
 * Gemini (https://generativelanguage.googleapis.com/v1beta/openai),
 * OpenRouter (https://openrouter.ai/api/v1). Defaults to OpenAI itself.
 */
export function openAIBaseUrl(): string {
  return (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
}

const REQUEST_TIMEOUT_MS = 60_000;

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly chatUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.model = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";
    this.chatUrl = `${openAIBaseUrl()}/chat/completions`;
  }

  private async chatJson(
    system: string,
    user: string,
    temperature: number,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(this.chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`OpenAI API error ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as OpenAIChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty completion");
    return parseJsonObject(content);
  }

  async generateQuestion(p: GenerateQuestionParams): Promise<GeneratedQuestion> {
    const obj = await this.chatJson(
      questionSystemPrompt(),
      questionUserPrompt(p, false),
      0.7,
    );
    return normalizeGeneratedQuestion(obj, p);
  }

  async generateFollowUp(p: GenerateQuestionParams): Promise<GeneratedQuestion> {
    const obj = await this.chatJson(
      questionSystemPrompt(),
      questionUserPrompt(p, true),
      0.7,
    );
    return { ...normalizeGeneratedQuestion(obj, p), is_follow_up: true };
  }

  async analyzeAnswer(p: AnalyzeAnswerParams): Promise<AnswerAnalysis> {
    const obj = await this.chatJson(
      analysisSystemPrompt(),
      analysisUserPrompt(p),
      0.2,
    );
    return normalizeAnswerAnalysis(obj);
  }

  async generateSummary(p: SummaryParams): Promise<ResultSummary> {
    const obj = await this.chatJson(
      summarySystemPrompt(),
      summaryUserPrompt(p),
      0.3,
    );
    return normalizeResultSummary(obj);
  }

  async generateReport(p: { report: unknown }): Promise<string> {
    const obj = await this.chatJson(
      reportSystemPrompt(),
      reportUserPrompt(p),
      0.4,
    );
    return typeof obj.narrative === "string" && obj.narrative.trim() !== ""
      ? obj.narrative.trim()
      : JSON.stringify(obj);
  }
}
