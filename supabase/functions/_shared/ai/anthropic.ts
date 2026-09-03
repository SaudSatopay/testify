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

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const REQUEST_TIMEOUT_MS = 60_000;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content?: AnthropicContentBlock[];
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.model = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5";
  }

  private async completeJson(
    system: string,
    user: string,
    temperature: number,
    maxTokens = 2000,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Anthropic API error ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as AnthropicMessagesResponse;
    const text = payload.content
      ?.filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text as string)
      .join("\n");
    if (!text) throw new Error("Anthropic returned an empty completion");
    return parseJsonObject(text);
  }

  async generateQuestion(p: GenerateQuestionParams): Promise<GeneratedQuestion> {
    const obj = await this.completeJson(
      questionSystemPrompt(),
      questionUserPrompt(p, false),
      0.7,
    );
    return normalizeGeneratedQuestion(obj, p);
  }

  async generateFollowUp(p: GenerateQuestionParams): Promise<GeneratedQuestion> {
    const obj = await this.completeJson(
      questionSystemPrompt(),
      questionUserPrompt(p, true),
      0.7,
    );
    return { ...normalizeGeneratedQuestion(obj, p), is_follow_up: true };
  }

  async analyzeAnswer(p: AnalyzeAnswerParams): Promise<AnswerAnalysis> {
    const obj = await this.completeJson(
      analysisSystemPrompt(),
      analysisUserPrompt(p),
      0.2,
    );
    return normalizeAnswerAnalysis(obj);
  }

  async generateSummary(p: SummaryParams): Promise<ResultSummary> {
    const obj = await this.completeJson(
      summarySystemPrompt(),
      summaryUserPrompt(p),
      0.3,
    );
    return normalizeResultSummary(obj);
  }

  async generateReport(p: { report: unknown }): Promise<string> {
    const obj = await this.completeJson(
      reportSystemPrompt(),
      reportUserPrompt(p),
      0.4,
    );
    return typeof obj.narrative === "string" && obj.narrative.trim() !== ""
      ? obj.narrative.trim()
      : JSON.stringify(obj);
  }
}
