export const APP_NAME = "Testify";
export const TAGLINE = "Smarter Interviews. Better Decisions.";

export const ROLES = ["candidate", "interviewer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const JOB_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "QA Engineer",
  "Product Manager",
  "UI/UX Designer",
  "HR",
  "Sales",
  "Marketing",
  "Custom Role",
] as const;

export const INTERVIEW_MODES = [
  { value: "hr", label: "HR" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "mixed", label: "Mixed" },
] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number]["value"];

export const INTERVIEW_TYPES = [
  { value: "ai_mock", label: "AI Mock" },
  { value: "live", label: "Live" },
  { value: "mcq", label: "MCQ" },
  { value: "technical", label: "Technical" },
  { value: "mixed", label: "Mixed" },
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number]["value"];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number]["value"];

export const QUESTION_TYPES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "hr", label: "HR" },
  { value: "technical", label: "Technical" },
  { value: "situational", label: "Situational" },
  { value: "coding", label: "Coding" },
  { value: "mcq", label: "MCQ" },
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

export const MCQ_CATEGORIES = [
  "JavaScript",
  "TypeScript",
  "React",
  "Python",
  "Java",
  "SQL",
  "Data Structures",
  "Algorithms",
  "Aptitude",
  "Logical Reasoning",
  "Networking",
  "Operating Systems",
  "DBMS",
  "Cybersecurity",
  "HR",
  "Custom",
] as const;

export const MCQ_COUNTS = [10, 20, 30, 50, 100] as const;
export const MOCK_QUESTION_COUNTS = [3, 5, 8, 10] as const;
export const MOCK_DURATIONS = [15, 30, 45, 60] as const;

export const EXPERIENCE_LEVELS = [
  { value: 0, label: "Fresher (0–1 years)" },
  { value: 2, label: "Junior (1–3 years)" },
  { value: 4, label: "Mid-level (3–5 years)" },
  { value: 7, label: "Senior (5–8 years)" },
  { value: 10, label: "Lead / Principal (8+ years)" },
] as const;

export const INTERVIEW_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-transparent" },
  scheduled: { label: "Scheduled", className: "bg-primary/10 text-primary border-primary/20" },
  active: { label: "In progress", className: "bg-accent/10 text-accent border-accent/20" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const RECOMMENDATION_META: Record<string, { label: string; className: string }> = {
  strong_hire: { label: "Strong hire", className: "bg-success/10 text-success border-success/25" },
  hire: { label: "Hire", className: "bg-primary/10 text-primary border-primary/25" },
  consider: { label: "Consider", className: "bg-warning/10 text-warning border-warning/25" },
  no_hire: { label: "Not recommended", className: "bg-destructive/10 text-destructive border-destructive/25" },
};

export const FILLER_WORDS = [
  "um", "uh", "like", "you know", "basically", "actually", "literally",
  "sort of", "kind of", "i mean", "right", "so yeah", "hmm",
];

export const CONFIDENCE_DISCLAIMER =
  "This is an AI-generated communication indicator based on observable signals (pace, structure, clarity, filler words). It should not be treated as a psychological assessment.";

export const VIDEO_ANALYSIS_DISCLAIMER =
  "Video analysis describes observable signals only — such as camera presence and approximate eye-contact — and never infers personality, emotions, honesty, or any protected characteristic.";

export const MONITORING_NOTICE =
  "Assessment monitoring is enabled. Tab switches, window focus changes, fullscreen exits, and copy/paste events are recorded during this assessment. These signals are informational and do not by themselves prove misconduct.";

/** localStorage keys */
export const STORAGE_KEYS = {
  theme: "testify-theme",
} as const;
