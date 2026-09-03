import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type {
  AdminUsersInput,
  AnalyzeAnswerInput,
  AnalyzeVideoInput,
  AnalyzeVideoOutput,
  AnswerAnalysis,
  ApiEnvelope,
  CalculateResultOutput,
  GenerateInterviewInput,
  GenerateInterviewOutput,
  GenerateQuestionInput,
  GeneratedQuestion,
  ReportPayload,
  SendInvitationInput,
  SendInvitationOutput,
  TranscribeInput,
  TranscribeOutput,
} from "@/types";

/** Error codes the UI treats specially. */
export const API_CODES = {
  aiNotConfigured: "AI_NOT_CONFIGURED",
  transcriptionNotConfigured: "TRANSCRIPTION_NOT_CONFIGURED",
  rateLimited: "RATE_LIMITED",
} as const;

export class ApiException extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiException";
    this.code = code;
  }
}

export function isConfigError(error: unknown): boolean {
  return (
    error instanceof ApiException &&
    (error.code === API_CODES.aiNotConfigured || error.code === API_CODES.transcriptionNotConfigured)
  );
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiException) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Invoke a Supabase Edge Function and unwrap the standard
 * `{ success, data, error }` envelope. Throws ApiException on failure.
 */
async function invokeFn<TOut>(name: string, body: unknown): Promise<TOut> {
  let data: ApiEnvelope<TOut> | null = null;
  try {
    const result = await supabase.functions.invoke<ApiEnvelope<TOut>>(name, {
      body: body as Record<string, unknown>,
    });
    if (result.error) {
      if (result.error instanceof FunctionsHttpError) {
        try {
          data = (await result.error.context.json()) as ApiEnvelope<TOut>;
        } catch {
          /* non-JSON error body */
        }
      }
      if (!data) {
        throw new ApiException("NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
      }
    } else {
      data = result.data;
    }
  } catch (err) {
    if (err instanceof ApiException) throw err;
    throw new ApiException("NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
  }

  if (!data) throw new ApiException("EMPTY_RESPONSE", "The server returned an empty response.");
  if (!data.success || data.error) {
    throw new ApiException(data.error?.code ?? "UNKNOWN_ERROR", data.error?.message ?? "Request failed.");
  }
  return data.data as TOut;
}

/* ------------------------------------------------------------------ */
/* Typed edge-function wrappers                                        */
/* ------------------------------------------------------------------ */

export const api = {
  generateQuestion: (input: GenerateQuestionInput) =>
    invokeFn<GeneratedQuestion>("generate-question", input),

  generateInterview: (input: GenerateInterviewInput) =>
    invokeFn<GenerateInterviewOutput>("generate-interview", input),

  analyzeAnswer: (input: AnalyzeAnswerInput) => invokeFn<AnswerAnalysis>("analyze-answer", input),

  transcribeResponse: (input: TranscribeInput) => invokeFn<TranscribeOutput>("transcribe-response", input),

  analyzeVideo: (input: AnalyzeVideoInput) => invokeFn<AnalyzeVideoOutput>("analyze-video", input),

  calculateInterviewResult: (interviewId: string) =>
    invokeFn<CalculateResultOutput>("calculate-interview-result", { interview_id: interviewId }),

  generateReport: (interviewId: string, includeNotes = false) =>
    invokeFn<{ report: ReportPayload }>("generate-report", {
      interview_id: interviewId,
      include_notes: includeNotes,
    }),

  sendInvitation: (input: SendInvitationInput) =>
    invokeFn<SendInvitationOutput>("send-interview-invitation", input),

  adminUsers: (input: AdminUsersInput) =>
    invokeFn<{ user_id: string; action: string; role?: string; status?: string }>("admin-users", input),
};
