import type { Difficulty, InterviewMode, InterviewType, QuestionType, Role } from "@/lib/constants";
import type { Json, Tables } from "@/integrations/supabase/types";

export type { Difficulty, InterviewMode, InterviewType, QuestionType, Role };

/* ------------------------------------------------------------------ */
/* Database row aliases                                                */
/* ------------------------------------------------------------------ */

export type Profile = Tables<"profiles">;
export type Interview = Tables<"interviews">;
export type Question = Tables<"questions">;
export type InterviewQuestion = Tables<"interview_questions">;
export type ResponseRow = Tables<"responses">;
export type MCQQuestion = Tables<"mcq_questions">;
export type MCQAttempt = Tables<"mcq_attempts">;
export type MCQAnswer = Tables<"mcq_answers">;
export type AIAnalysis = Tables<"ai_analysis">;
export type InterviewResult = Tables<"interview_results">;
export type InterviewerNote = Tables<"interviewer_notes">;
export type InterviewInvitation = Tables<"interview_invitations">;
export type Recording = Tables<"recordings">;
export type AssessmentEvent = Tables<"assessment_events">;
export type AuditLog = Tables<"audit_logs">;
export type PlatformSetting = Tables<"platform_settings">;

/** Interview joined with the participating profiles. */
export type InterviewWithPeople = Interview & {
  candidate?: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
  creator?: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
};

/** Typed view of interviews.settings JSONB. */
export interface InterviewSettings {
  monitoring_enabled?: boolean;
  video_analysis_enabled?: boolean;
  question_count?: number;
  experience_years?: number;
  mode?: InterviewMode;
  mcq_category?: string;
  mcq_question_count?: number;
  notes_visible_to_candidate?: boolean;
}

export function readInterviewSettings(settings: Json): InterviewSettings {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return settings as InterviewSettings;
  }
  return {};
}

export function readStringArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/* ------------------------------------------------------------------ */
/* Edge function contracts (mirrors supabase/functions)                */
/* ------------------------------------------------------------------ */

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface GeneratedQuestion {
  question: string;
  category: string;
  question_type: string;
  expected_topics: string[];
  time_limit_seconds: number;
  is_follow_up: boolean;
  difficulty: string;
}

export interface GenerateQuestionInput {
  role: string;
  experience_years?: number;
  interview_type: InterviewMode;
  difficulty: Difficulty;
  category?: string;
  question_number: number;
  total_questions: number;
  previous_questions: string[];
  previous_answers: string[];
  interview_id?: string;
  resume_summary?: string;
}

export interface GenerateInterviewInput {
  create_interview?: boolean;
  interview_id?: string;
  title?: string;
  description?: string;
  job_role: string;
  interview_type: InterviewType;
  difficulty: Difficulty;
  question_count: number;
  duration_minutes?: number;
  experience_years?: number;
  use_question_bank?: boolean;
  settings?: InterviewSettings;
}

export interface GenerateInterviewOutput {
  interview: Interview;
  questions: Array<Question | GeneratedQuestion>;
}

export interface AudioMetadata {
  duration_seconds?: number;
  speaking_pace_wpm?: number;
  filler_word_count?: number;
}

export interface VideoMetadata {
  eye_contact_indicator?: number;
  face_presence_ratio?: number;
  head_movement_level?: "low" | "moderate" | "high";
  expression_variation?: "low" | "moderate" | "high";
}

export interface AnalyzeAnswerInput {
  interview_id?: string;
  response_id?: string;
  question: string;
  answer: string;
  transcript?: string;
  job_role: string;
  experience_years?: number;
  question_type?: string;
  expected_topics?: string[];
  audio_metadata?: AudioMetadata;
  video_metadata?: VideoMetadata;
}

export interface AnswerAnalysis {
  relevance: number;
  technical_accuracy: number;
  communication: number;
  clarity: number;
  structure: number;
  confidence_indicator: number;
  speaking_pace: number | null;
  filler_word_count: number | null;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
  overall_score?: number;
}

export interface TranscribeInput {
  audio_path: string;
  response_id?: string;
  language?: string;
}

export interface TranscribeOutput {
  transcript: string;
}

export interface VideoSessionMetrics {
  frames_analyzed: number;
  face_presence_ratio: number;
  eye_contact_indicator: number;
  head_movement_level: "low" | "moderate" | "high";
  expression_variation: "low" | "moderate" | "high";
  attention_drops: number;
}

export interface AnalyzeVideoInput {
  interview_id: string;
  response_id?: string;
  metrics: VideoSessionMetrics;
}

export interface AnalyzeVideoOutput {
  eye_contact_indicator: number;
  facial_expression_summary: string;
  observations: string[];
}

export interface CalculateResultOutput {
  result: InterviewResult;
}

export interface ReportPayload {
  interview: Interview;
  candidate: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
  result: InterviewResult | null;
  responses: ResponseRow[];
  analyses: AIAnalysis[];
  mcq: {
    attempts: number;
    best_score: number | null;
    average_score: number | null;
    last_completed_at: string | null;
  } | null;
  notes: InterviewerNote[] | null;
  ai_narrative: string | null;
  generated_at: string;
}

export interface SendInvitationInput {
  interview_id: string;
  candidate_email: string;
  expires_in_hours?: number;
}

export interface SendInvitationOutput {
  invitation: InterviewInvitation;
  invite_url: string;
  email_sent: boolean;
}

export type AdminUserAction = "change_role" | "suspend" | "activate" | "delete";

export interface AdminUsersInput {
  action: AdminUserAction;
  user_id: string;
  role?: Role;
}

/* ------------------------------------------------------------------ */
/* MCQ RPC payloads                                                    */
/* ------------------------------------------------------------------ */

export interface MCQQuizQuestion {
  id: string;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty: string;
}

export interface MCQQuizStart {
  attempt_id: string;
  time_limit_seconds: number;
  questions: MCQQuizQuestion[];
}

export interface MCQAnswerSubmission {
  question_id: string;
  selected_option: "a" | "b" | "c" | "d" | null;
  marked_for_review: boolean;
}

export interface MCQQuestionResult {
  question_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  explanation: string | null;
  category: string;
  marked_for_review: boolean;
}

export interface MCQSubmitResult {
  attempt_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped: number;
  percentage: number;
  time_taken_seconds: number;
  results: MCQQuestionResult[];
}

/* ------------------------------------------------------------------ */
/* Mock interview session (client-side state)                          */
/* ------------------------------------------------------------------ */

export interface MockInterviewConfig {
  jobRole: string;
  customRole?: string;
  experienceYears: number;
  mode: InterviewMode;
  difficulty: Difficulty;
  questionCount: number;
  durationMinutes: number;
  videoAnalysisEnabled: boolean;
}

export interface SessionQuestion extends GeneratedQuestion {
  index: number;
  /** Set when the question came from the question bank (questions table). */
  bankQuestionId?: string;
  responseId?: string;
  answerTranscript?: string;
  analysis?: AnswerAnalysis;
}

export interface PlatformStats {
  total_users: number;
  candidates: number;
  interviewers: number;
  admins: number;
  total_interviews: number;
  completed_interviews: number;
  active_interviews: number;
  scheduled_interviews: number;
  avg_overall_score: number | null;
  total_questions: number;
  total_mcqs: number;
  total_attempts: number;
  users_last_30_days: number;
  interviews_last_30_days: number;
}
