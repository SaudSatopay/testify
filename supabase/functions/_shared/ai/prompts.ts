import type {
  AnalyzeAnswerParams,
  AnswerAnalysis,
  GeneratedQuestion,
  GenerateQuestionParams,
  Recommendation,
  ResultSummary,
  SummaryParams,
} from "./types.ts";

/**
 * Prompt builders + robust JSON parsing/normalization shared by all providers,
 * so OpenAI and Anthropic stay thin transport adapters.
 */

/** Non-negotiable assessment rules baked into every system prompt. */
export const SAFETY_RULES = `Non-negotiable rules:
- All score dimensions use a 0-100 scale.
- Act as a realistic professional interviewer/assessor: reward specific, structured, accurate, relevant content; penalize vague, off-topic, or empty content. Do not inflate scores.
- NEVER infer or mention race, ethnicity, religion, health, disability, sexuality, personality traits, mental health, honesty, or criminality.
- Any commentary about video or facial signals must describe only observable behavior in neutral language (e.g. "eye gaze frequently moved away from the camera"), never claims about emotion, honesty, or competence based on appearance.
- confidence_indicator is a composite of observable communication signals (steady pacing, few filler words, decisive phrasing); it is NOT a psychological measurement or personality judgment.`;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)} [...truncated]` : text;
}

// ---------------------------------------------------------------------------
// Question generation
// ---------------------------------------------------------------------------

export function questionSystemPrompt(): string {
  return `You are an experienced, professional job interviewer conducting a structured interview. You ask exactly one question at a time, pitched to the role, interview type, difficulty, and the candidate's experience level.

Behavior:
- Question 1 of an interview is a warm opener (an introduction / "walk me through your background" style question) tailored to the role.
- Never repeat or closely paraphrase any previously asked question.
- When explicitly instructed to ask a follow-up, reference a concrete detail from the candidate's most recent answer.
- Adapt difficulty: if previous answers are strong and detailed, step depth up gradually; if they are weak, keep difficulty steady and supportive.
- Never ask illegal or discriminatory interview questions (age, family plans, religion, health, etc.).

${SAFETY_RULES}

Respond ONLY with one JSON object, no prose, exactly this shape:
{"question": string, "category": string, "question_type": "behavioral" | "hr" | "technical" | "situational", "expected_topics": string[], "time_limit_seconds": number (60-600), "is_follow_up": boolean, "difficulty": "easy" | "medium" | "hard" | "expert"}`;
}

export function questionUserPrompt(
  p: GenerateQuestionParams,
  followUp: boolean,
): string {
  const previousQuestions = p.previousQuestions.length
    ? `Questions already asked:\n${p.previousQuestions
        .map((q, i) => `${i + 1}. ${truncate(q, 400)}`)
        .join("\n")}`
    : "No questions have been asked yet.";

  const previousAnswers = p.previousAnswers.length
    ? `Candidate's answers so far (same order):\n${p.previousAnswers
        .map((a, i) => `${i + 1}. ${truncate(a, 700)}`)
        .join("\n")}`
    : null;

  let instruction: string;
  if (followUp) {
    instruction =
      'Ask a FOLLOW-UP question that explicitly references a concrete detail from the candidate\'s most recent answer. Set "is_follow_up": true.';
  } else if (p.questionNumber === 1) {
    instruction =
      'This is the opening question: ask a warm introduction question tailored to the role. Set "is_follow_up": false.';
  } else {
    instruction =
      'Ask the next fresh question (not a follow-up). Set "is_follow_up": false. Roughly 30% of questions after the second may be follow-ups, but for THIS one produce a new question while adapting difficulty to the quality of previous answers.';
  }

  const lines: Array<string | null> = [
    `Role being interviewed for: ${p.role}`,
    p.experienceYears !== undefined
      ? `Candidate experience: ${p.experienceYears} year(s)`
      : null,
    `Interview type: ${p.interviewType}`,
    `Target difficulty: ${p.difficulty}`,
    p.category ? `Category focus: ${p.category}` : null,
    `This is question ${p.questionNumber} of ${p.totalQuestions}.`,
    p.resumeSummary
      ? `Resume summary: ${truncate(p.resumeSummary, 2000)}`
      : null,
    previousQuestions,
    previousAnswers,
    instruction,
  ];
  return lines.filter((l): l is string => l !== null).join("\n\n");
}

// ---------------------------------------------------------------------------
// Answer analysis
// ---------------------------------------------------------------------------

export function analysisSystemPrompt(): string {
  return `You are an expert interview assessor evaluating one candidate answer. Score each dimension 0-100:
- relevance: does the answer address the question that was actually asked?
- technical_accuracy: factual/technical correctness of the content (for non-technical questions, score the soundness and credibility of the content).
- communication: overall communication effectiveness (vocabulary, flow, coherence).
- clarity: how easy the answer is to follow.
- structure: logical organization (e.g. STAR for behavioral answers).
- confidence_indicator: composite of observable communication signals only.

Scoring anchors: 0-25 empty or off-topic; 26-50 weak or vague; 51-70 adequate; 71-85 good and specific; 86-100 excellent, specific, and well structured.

If audio metrics (speaking pace, filler word count) are provided, you may refine them; otherwise return them as null. Only comment on provided video metrics using neutral, observable language.

${SAFETY_RULES}

Respond ONLY with one JSON object, no prose, exactly this shape:
{"relevance": number, "technical_accuracy": number, "communication": number, "clarity": number, "structure": number, "confidence_indicator": number, "speaking_pace": number | null, "filler_word_count": number | null, "strengths": string[] (max 4), "weaknesses": string[] (max 4), "recommendations": string[] (max 4), "summary": string (2-3 neutral sentences)}`;
}

export function analysisUserPrompt(p: AnalyzeAnswerParams): string {
  const answerText = p.transcript?.trim() || p.answer;
  const lines: Array<string | null> = [
    `Job role: ${p.jobRole}`,
    p.experienceYears !== undefined
      ? `Candidate experience: ${p.experienceYears} year(s)`
      : null,
    p.questionType ? `Question type: ${p.questionType}` : null,
    `Interview question: ${truncate(p.question, 1500)}`,
    p.expectedTopics && p.expectedTopics.length
      ? `Topics a strong answer would cover: ${p.expectedTopics.join(", ")}`
      : null,
    `Candidate's answer${p.transcript ? " (speech transcript)" : ""}:\n${truncate(answerText, 8000)}`,
    p.audioMetadata
      ? `Audio metrics: ${JSON.stringify(p.audioMetadata)}`
      : null,
    p.videoMetadata
      ? `Video metrics (observable signals only): ${JSON.stringify(p.videoMetadata)}`
      : null,
  ];
  return lines.filter((l): l is string => l !== null).join("\n\n");
}

// ---------------------------------------------------------------------------
// Interview result summary
// ---------------------------------------------------------------------------

export function summarySystemPrompt(): string {
  return `You write the final assessment summary of a completed interview based on per-answer analyses and aggregate component scores.

Recommendation bands (anchor to the overall score): >= 85 "strong_hire"; 70-84 "hire"; 55-69 "consider"; below 55 "no_hire".

${SAFETY_RULES}

Respond ONLY with one JSON object, no prose, exactly this shape:
{"summary": string (3-5 professional sentences about demonstrated skills and gaps), "strengths": string[] (max 5), "weaknesses": string[] (max 5), "recommendation": "strong_hire" | "hire" | "consider" | "no_hire"}`;
}

export function summaryUserPrompt(p: SummaryParams): string {
  const analyses = p.analyses.slice(0, 25).map((a, i) => ({
    n: i + 1,
    overall_score: a.overall_score ?? null,
    relevance: a.relevance ?? null,
    technical_accuracy: a.technical_accuracy ?? null,
    communication: a.communication ?? null,
    structure: a.structure ?? null,
    strengths: (a.strengths ?? []).slice(0, 3),
    weaknesses: (a.weaknesses ?? []).slice(0, 3),
    summary: a.summary ? truncate(a.summary, 400) : null,
  }));
  return [
    `Job role: ${p.jobRole}`,
    `Interview type: ${p.interviewType}`,
    `Aggregate component scores (0-100, null = not assessed): ${JSON.stringify(p.scores)}`,
    `Per-answer analyses: ${JSON.stringify(analyses)}`,
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Report narrative
// ---------------------------------------------------------------------------

export function reportSystemPrompt(): string {
  return `You write a professional executive narrative (150-250 words, plain text, 2-3 paragraphs) for an interview assessment report. Base it strictly on the structured report data provided; do not invent facts, and keep the tone neutral and professional.

${SAFETY_RULES}

Respond ONLY with one JSON object, no prose, exactly this shape:
{"narrative": string}`;
}

export function reportUserPrompt(p: { report: unknown }): string {
  return `Structured interview report data:\n${truncate(JSON.stringify(p.report), 12000)}`;
}

// ---------------------------------------------------------------------------
// Robust parsing + normalization
// ---------------------------------------------------------------------------

/** Parse a JSON object out of a model reply (tolerates fences/extra prose). */
export function parseJsonObject(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const candidates = [text];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const value: unknown = JSON.parse(candidate);
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error("AI response did not contain a parseable JSON object");
}

/** Coerce to a number clamped to [0, 100]; fallback (default 50) if invalid. */
export function clampScore(value: unknown, fallback = 50): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) return fallback;
  return Math.min(100, Math.max(0, Math.round(num * 10) / 10));
}

function optionalNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) return null;
  return Math.min(max, Math.max(min, num));
}

function toStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim() !== "")
    .slice(0, maxItems)
    .map((item) => item.trim());
}

const QUESTION_TYPES = [
  "behavioral",
  "hr",
  "technical",
  "situational",
  "coding",
  "mcq",
] as const;
const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

export function normalizeGeneratedQuestion(
  obj: Record<string, unknown>,
  p: GenerateQuestionParams,
): GeneratedQuestion {
  const question = typeof obj.question === "string" ? obj.question.trim() : "";
  if (!question) throw new Error("AI provider did not return a question");

  const fallbackType = p.interviewType === "mixed" ? "technical" : p.interviewType;
  const questionType =
    typeof obj.question_type === "string" &&
      (QUESTION_TYPES as readonly string[]).includes(obj.question_type)
      ? obj.question_type
      : fallbackType;

  const difficulty =
    typeof obj.difficulty === "string" &&
      (DIFFICULTIES as readonly string[]).includes(obj.difficulty)
      ? obj.difficulty
      : p.difficulty;

  const category =
    typeof obj.category === "string" && obj.category.trim() !== ""
      ? obj.category.trim()
      : (p.category ?? p.role);

  const timeLimit = optionalNumber(obj.time_limit_seconds, 30, 900);

  return {
    question,
    category,
    question_type: questionType,
    expected_topics: toStringArray(obj.expected_topics, 8),
    time_limit_seconds: Math.round(timeLimit ?? 180),
    is_follow_up: obj.is_follow_up === true,
    difficulty,
  };
}

export function normalizeAnswerAnalysis(
  obj: Record<string, unknown>,
): AnswerAnalysis {
  const fillers = optionalNumber(obj.filler_word_count, 0, 10_000);
  return {
    relevance: clampScore(obj.relevance),
    technical_accuracy: clampScore(obj.technical_accuracy),
    communication: clampScore(obj.communication),
    clarity: clampScore(obj.clarity),
    structure: clampScore(obj.structure),
    confidence_indicator: clampScore(obj.confidence_indicator),
    speaking_pace: optionalNumber(obj.speaking_pace, 0, 400),
    filler_word_count: fillers === null ? null : Math.round(fillers),
    strengths: toStringArray(obj.strengths, 5),
    weaknesses: toStringArray(obj.weaknesses, 5),
    recommendations: toStringArray(obj.recommendations, 5),
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
  };
}

const RECOMMENDATIONS = ["strong_hire", "hire", "consider", "no_hire"] as const;

export function normalizeResultSummary(
  obj: Record<string, unknown>,
): ResultSummary {
  const recommendation =
    typeof obj.recommendation === "string" &&
      (RECOMMENDATIONS as readonly string[]).includes(obj.recommendation)
      ? (obj.recommendation as Recommendation)
      : "consider";
  return {
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
    strengths: toStringArray(obj.strengths, 6),
    weaknesses: toStringArray(obj.weaknesses, 6),
    recommendation,
  };
}
