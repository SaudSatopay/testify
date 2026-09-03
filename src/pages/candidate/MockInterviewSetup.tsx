import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Gauge, Hash, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";

import { ConfigRequiredCard } from "@/components/shared/ConfigRequiredCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  INTERVIEW_MODES,
  JOB_ROLES,
  MOCK_DURATIONS,
  MOCK_QUESTION_COUNTS,
  type Difficulty,
  type InterviewMode,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api, ApiException, errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import { useAuth } from "@/hooks/useAuth";

export default function MockInterviewSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const paramMode = params.get("mode");

  const [jobRole, setJobRole] = useState<string>("Software Engineer");
  const [customRole, setCustomRole] = useState("");
  const [experience, setExperience] = useState<number>(2);
  const [mode, setMode] = useState<InterviewMode>(
    paramMode === "hr" || paramMode === "technical" || paramMode === "behavioral" || paramMode === "mixed"
      ? paramMode
      : "mixed",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [duration, setDuration] = useState<number>(30);
  const [starting, setStarting] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const effectiveRole = jobRole === "Custom Role" ? customRole.trim() : jobRole;

  const start = async (useQuestionBank: boolean) => {
    if (!effectiveRole) {
      toast.error("Enter your custom role name.");
      return;
    }
    if (!user) return;
    setStarting(true);
    try {
      let interviewId: string;
      if (useQuestionBank) {
        // Server picks + attaches curated bank questions.
        const result = await api.generateInterview({
          create_interview: true,
          title: `${effectiveRole} — practice interview`,
          job_role: effectiveRole,
          interview_type: "ai_mock",
          difficulty,
          question_count: questionCount,
          duration_minutes: duration,
          experience_years: experience,
          use_question_bank: true,
          settings: { question_count: questionCount, experience_years: experience, mode },
        });
        interviewId = result.interview.id;
      } else {
        // Fully adaptive: create the session shell only — the AI interviewer
        // generates each question live, reacting to previous answers.
        // (RLS allows candidates to create their own ai_mock practice rows.)
        const interview = await interviewService.create({
          title: `${effectiveRole} — AI mock interview`,
          created_by: user.id,
          candidate_id: user.id,
          type: "ai_mock",
          status: "scheduled",
          difficulty,
          job_role: effectiveRole,
          duration_minutes: duration,
          settings: { question_count: questionCount, experience_years: experience, mode },
        });
        interviewId = interview.id;
      }
      navigate(`/candidate/interview/${interviewId}`);
    } catch (err) {
      if (err instanceof ApiException && err.code === "AI_NOT_CONFIGURED") {
        setAiUnavailable(true);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="AI mock interview"
        description="Configure your practice session. The AI interviewer adapts to your role, level, and answers."
      />

      {aiUnavailable && (
        <ConfigRequiredCard
          title="AI question generation isn't configured"
          message="No AI provider key is set on the server, so adaptive AI questions are unavailable. You can still practice with curated questions from the Testify question bank — without per-answer AI analysis."
          onRetry={() => setAiUnavailable(false)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
            Job role
          </CardTitle>
          <CardDescription>What position are you practicing for?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Job role">
            {JOB_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={jobRole === role}
                onClick={() => setJobRole(role)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  jobRole === role
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {role}
              </button>
            ))}
          </div>
          {jobRole === "Custom Role" && (
            <div className="space-y-2">
              <Label htmlFor="custom-role">Custom role name</Label>
              <Input
                id="custom-role"
                placeholder="e.g. Solutions Architect"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
            Session settings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="experience-select">Experience level</Label>
            <Select value={String(experience)} onValueChange={(v) => setExperience(Number(v))}>
              <SelectTrigger id="experience-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={String(level.value)}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode-select">Interview type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as InterviewMode)}>
              <SelectTrigger id="mode-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    difficulty === d.value ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" aria-hidden="true" /> Questions
            </Label>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Number of questions">
              {MOCK_QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  role="radio"
                  aria-checked={questionCount === count}
                  onClick={() => setQuestionCount(count)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    questionCount === count ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Interview duration
            </Label>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Duration">
              {MOCK_DURATIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  role="radio"
                  aria-checked={duration === mins}
                  onClick={() => setDuration(mins)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    duration === mins ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
        {aiUnavailable && (
          <Button variant="outline" size="lg" loading={starting} onClick={() => void start(true)}>
            Practice with question bank instead
          </Button>
        )}
        <Button size="lg" loading={starting} onClick={() => void start(false)}>
          <Sparkles aria-hidden="true" /> Start interview
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        You'll review consent and run a device check before anything is recorded.
      </p>
    </div>
  );
}
