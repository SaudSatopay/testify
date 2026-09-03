/**
 * Provider-agnostic AI contracts shared by every AI-backed edge function.
 * All scores are numbers on a 0-100 scale.
 */

export type InterviewAIType = "hr" | "technical" | "behavioral" | "mixed";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface GenerateQuestionParams {
  role: string;
  experienceYears?: number;
  interviewType: InterviewAIType;
  difficulty: Difficulty;
  category?: string;
  questionNumber: number;
  totalQuestions: number;
  previousQuestions: string[];
  previousAnswers: string[];
  resumeSummary?: string;
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

export interface AudioMetadata {
  duration_seconds?: number;
  speaking_pace_wpm?: number;
  filler_word_count?: number;
}

export interface VideoMetadata {
  eye_contact_indicator?: number;
  face_presence_ratio?: number;
  head_movement_level?: string;
  expression_variation?: string;
}

export interface AnalyzeAnswerParams {
  question: string;
  answer: string;
  transcript?: string;
  jobRole: string;
  experienceYears?: number;
  questionType?: string;
  expectedTopics?: string[];
  audioMetadata?: AudioMetadata;
  videoMetadata?: VideoMetadata;
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
}

export interface ComponentScores {
  technical: number | null;
  communication: number | null;
  confidence: number | null;
  problem_solving: number | null;
  behavioral: number | null;
  mcq: number | null;
  overall: number | null;
}

export interface SummaryParams {
  jobRole: string;
  interviewType: string;
  analyses: Array<Partial<AnswerAnalysis> & { overall_score?: number | null }>;
  scores: ComponentScores;
}

export type Recommendation = "strong_hire" | "hire" | "consider" | "no_hire";

export interface ResultSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: Recommendation;
}

export interface AIProvider {
  name: string;
  generateQuestion(p: GenerateQuestionParams): Promise<GeneratedQuestion>;
  generateFollowUp(p: GenerateQuestionParams): Promise<GeneratedQuestion>;
  analyzeAnswer(p: AnalyzeAnswerParams): Promise<AnswerAnalysis>;
  generateSummary(p: SummaryParams): Promise<ResultSummary>;
  generateReport(p: { report: unknown }): Promise<string>;
}
