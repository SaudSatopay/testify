import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Copy, Library, ListChecks, Mail, Settings2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  JOB_ROLES,
  MCQ_CATEGORIES,
  type Difficulty,
  type InterviewType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api, ApiException, errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import { questionService } from "@/services/questionService";
import type { InterviewSettings, Question } from "@/types";

const detailsSchema = z.object({
  title: z.string().trim().min(3, "Give the interview a title"),
  candidateEmail: z
    .string()
    .trim()
    .email("Enter a valid candidate email")
    .optional()
    .or(z.literal("")),
});

type QuestionSource = "ai" | "bank" | "adaptive";

export default function CreateInterview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobRole, setJobRole] = useState<string>("Software Engineer");
  const [type, setType] = useState<InterviewType>("live");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [duration, setDuration] = useState(45);
  const [scheduledAt, setScheduledAt] = useState("");

  // Settings
  const [monitoring, setMonitoring] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState(true);
  const [notesVisible, setNotesVisible] = useState(false);
  const [mcqCategory, setMcqCategory] = useState<string>("JavaScript");
  const [mcqCount, setMcqCount] = useState(20);

  // Questions
  const [questionSource, setQuestionSource] = useState<QuestionSource>("bank");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const debouncedBankSearch = useDebounce(bankSearch);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const isMcq = type === "mcq";
  const showQuestions = !isMcq;

  useEffect(() => {
    if (!showQuestions || questionSource !== "bank") return;
    let cancelled = false;
    setBankLoading(true);
    questionService
      .list({ search: debouncedBankSearch, pageSize: 50 })
      .then(({ rows }) => {
        if (!cancelled) setBankQuestions(rows);
      })
      .catch((err: unknown) => toast.error(errorMessage(err)))
      .finally(() => {
        if (!cancelled) setBankLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showQuestions, questionSource, debouncedBankSearch]);

  const settings = useMemo<InterviewSettings>(
    () => ({
      monitoring_enabled: monitoring,
      video_analysis_enabled: videoAnalysis,
      notes_visible_to_candidate: notesVisible,
      ...(isMcq ? { mcq_category: mcqCategory, mcq_question_count: mcqCount } : {}),
      ...(questionSource === "ai" || questionSource === "adaptive" ? { question_count: aiQuestionCount } : {}),
    }),
    [monitoring, videoAnalysis, notesVisible, isMcq, mcqCategory, mcqCount, questionSource, aiQuestionCount],
  );

  const handleSubmit = async (publish: boolean) => {
    if (!user) return;
    const parsed = detailsSchema.safeParse({ title, candidateEmail });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    if (publish && !isMcq && questionSource === "bank" && selectedIds.length === 0 && type !== "live") {
      toast.error("Select at least one question, or switch the question source.");
      return;
    }
    setSubmitting(publish ? "publish" : "draft");
    try {
      // 1. Create the interview row.
      const interview = await interviewService.create({
        title: parsed.data.title,
        description: description.trim() || null,
        created_by: user.id,
        type,
        difficulty,
        job_role: jobRole,
        duration_minutes: duration,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: publish ? "scheduled" : "draft",
        settings: { ...settings },
      });

      // 2. Attach questions.
      if (showQuestions) {
        if (questionSource === "bank" && selectedIds.length > 0) {
          await interviewService.setQuestions(interview.id, selectedIds);
        } else if (questionSource === "ai") {
          try {
            await api.generateInterview({
              interview_id: interview.id,
              job_role: jobRole,
              interview_type: type,
              difficulty,
              question_count: aiQuestionCount,
              experience_years: 3,
            });
          } catch (err) {
            if (err instanceof ApiException && err.code === "AI_NOT_CONFIGURED") {
              toast.warning(
                "AI generation isn't configured — the interview was saved without questions. Add questions from the bank on the detail page.",
              );
            } else {
              throw err;
            }
          }
        }
        // "adaptive": questions are generated live during the session.
      }

      // 3. Send the invitation.
      if (publish && parsed.data.candidateEmail) {
        try {
          const invite = await api.sendInvitation({
            interview_id: interview.id,
            candidate_email: parsed.data.candidateEmail,
          });
          setInviteUrl(invite.invite_url);
          toast.success(
            invite.email_sent
              ? `Invitation emailed to ${parsed.data.candidateEmail}`
              : "Invitation created — email sending isn't configured, copy the link from the detail page.",
          );
        } catch (err) {
          toast.warning(`Interview saved, but the invitation failed: ${errorMessage(err)}`);
        }
      } else {
        toast.success(publish ? "Interview published" : "Draft saved");
      }

      navigate(`/interviewer/interviews/${interview.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Create interview"
        description="Set up the session, choose questions, and invite your candidate."
      />

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Interview details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Frontend Developer — Technical Round 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Context for the candidate (optional)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="candidate-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Candidate email
            </Label>
            <Input
              id="candidate-email"
              type="email"
              placeholder="candidate@email.com"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              On publish, an invitation is created (and emailed if email is configured).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-role">Job role</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger id="job-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_ROLES.filter((r) => r !== "Custom Role").map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interview-type">Interview type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InterviewType)}>
              <SelectTrigger id="interview-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Math.max(5, Math.min(240, Number(e.target.value) || 30)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Scheduled date &amp; time</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* MCQ settings */}
      {isMcq && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
              MCQ configuration
            </CardTitle>
            <CardDescription>Questions are drawn randomly from the MCQ bank at start time.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mcq-category">Category</Label>
              <Select value={mcqCategory} onValueChange={setMcqCategory}>
                <SelectTrigger id="mcq-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MCQ_CATEGORIES.filter((c) => c !== "Custom").map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcq-count">Number of questions</Label>
              <Input
                id="mcq-count"
                type="number"
                min={5}
                max={100}
                value={mcqCount}
                onChange={(e) => setMcqCount(Math.max(5, Math.min(100, Number(e.target.value) || 10)))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question selection */}
      {showQuestions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-4 w-4 text-primary" aria-hidden="true" />
              Questions
            </CardTitle>
            <CardDescription>Choose how this interview's questions are sourced.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Question source">
              {(
                [
                  {
                    value: "bank",
                    icon: Library,
                    label: "From question bank",
                    caption: "Hand-pick from your saved questions",
                  },
                  {
                    value: "ai",
                    icon: Wand2,
                    label: "AI generated now",
                    caption: "Generate a fixed set with AI",
                  },
                  {
                    value: "adaptive",
                    icon: Sparkles,
                    label: "Adaptive during session",
                    caption: "AI asks and adapts live",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={questionSource === option.value}
                  onClick={() => setQuestionSource(option.value)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    questionSource === option.value
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-muted-foreground/30",
                  )}
                >
                  <option.icon
                    className={cn("h-4 w-4", questionSource === option.value ? "text-primary" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm font-semibold">{option.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{option.caption}</p>
                </button>
              ))}
            </div>

            {questionSource === "ai" || questionSource === "adaptive" ? (
              <div className="space-y-2">
                <Label htmlFor="ai-count">Number of questions</Label>
                <Input
                  id="ai-count"
                  type="number"
                  min={1}
                  max={20}
                  value={aiQuestionCount}
                  onChange={(e) => setAiQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
                  className="max-w-[140px]"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Input
                    placeholder="Search your question bank…"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="max-w-sm"
                    aria-label="Search question bank"
                  />
                  <Badge variant="info">{selectedIds.length} selected</Badge>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">
                  {bankLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Loading questions…</p>
                  ) : bankQuestions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No questions found — create some in the Question Bank first.
                    </p>
                  ) : (
                    bankQuestions.map((q) => {
                      const checked = selectedIds.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                            checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setSelectedIds((prev) => (v === true ? [...prev, q.id] : prev.filter((x) => x !== q.id)))
                            }
                            className="mt-0.5"
                            aria-label={`Select question: ${q.question.slice(0, 60)}`}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium leading-snug">{q.question}</span>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <Badge variant="secondary">{q.category}</Badge>
                              <Badge variant="secondary" className="capitalize">{q.question_type}</Badge>
                              <Badge variant="secondary" className="capitalize">{q.difficulty}</Badge>
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Session settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="monitoring-switch" className="text-sm font-medium">
                Assessment monitoring
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Records tab switches, focus changes, fullscreen exits, and copy/paste events. Candidates always see a
                clear notice while it's active.
              </p>
            </div>
            <Switch id="monitoring-switch" checked={monitoring} onCheckedChange={setMonitoring} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="video-analysis-switch" className="text-sm font-medium">
                Offer optional video-signal analysis
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Candidates get a separate consent toggle for observable video signals (eye-contact indicator, presence).
                Declining never blocks the interview.
              </p>
            </div>
            <Switch id="video-analysis-switch" checked={videoAnalysis} onCheckedChange={setVideoAnalysis} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="notes-switch" className="text-sm font-medium">
                Share notes with candidate
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When off (default), your notes stay private. You can also mark individual notes as shared.
              </p>
            </div>
            <Switch id="notes-switch" checked={notesVisible} onCheckedChange={setNotesVisible} />
          </div>
        </CardContent>
      </Card>

      {inviteUrl && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-3 p-4">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">{inviteUrl}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(inviteUrl);
                toast.success("Invite link copied");
              }}
            >
              <Copy aria-hidden="true" /> Copy link
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col justify-end gap-2 pb-4 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          loading={submitting === "draft"}
          disabled={submitting !== null}
          onClick={() => void handleSubmit(false)}
        >
          Save as draft
        </Button>
        <Button
          size="lg"
          loading={submitting === "publish"}
          disabled={submitting !== null}
          onClick={() => void handleSubmit(true)}
        >
          Publish interview
        </Button>
      </div>
    </div>
  );
}
