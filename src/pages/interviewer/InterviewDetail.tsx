import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  FileBarChart,
  Mail,
  Printer,
  Send,
  StickyNote,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { ReportViewer } from "@/components/reports/ReportViewer";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { formatDateTime, formatRelative, initials } from "@/lib/format";
import { api, errorMessage } from "@/services/api";
import { interviewService } from "@/services/interviewService";
import { invitationService } from "@/services/invitationService";
import { notesService } from "@/services/notesService";
import { profileService } from "@/services/profileService";
import type { ReportPayload } from "@/types";

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const interviewId = id ?? "";
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useAsync(
    async () => {
      const interview = await interviewService.getWithPeople(interviewId);
      if (!interview) throw new Error("Interview not found or you don't have access to it.");
      const [questions, invitations, notes] = await Promise.all([
        interviewService.getQuestions(interviewId),
        invitationService.listByInterview(interviewId),
        notesService.listByInterview(interviewId),
      ]);
      return { interview, questions, invitations, notes };
    },
    [interviewId],
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notePrivate, setNotePrivate] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const { interview, questions, invitations, notes } = data;
  const typeLabel = INTERVIEW_TYPES.find((t) => t.value === interview.type)?.label ?? interview.type;

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const result = await api.sendInvitation({ interview_id: interview.id, candidate_email: inviteEmail.trim() });
      toast.success(result.email_sent ? "Invitation emailed" : "Invitation created — copy the link below");
      setInviteEmail("");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSendingInvite(false);
    }
  };

  const addNote = async () => {
    if (!user || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await notesService.add(interview.id, user.id, noteText.trim(), notePrivate);
      setNoteText("");
      toast.success("Note added");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingNote(false);
    }
  };

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const { report: payload } = await api.generateReport(interview.id, true);
      setReport(payload);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReportLoading(false);
    }
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      await api.calculateInterviewResult(interview.id);
      toast.success("Result recalculated from AI analysis and MCQ scores");
      setReport(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRecalculating(false);
    }
  };

  const openResume = async (path: string) => {
    try {
      const url = await profileService.resumeSignedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title={interview.title}
          description={interview.description ?? undefined}
          actions={
            <>
              {interview.type === "live" && ["scheduled", "active"].includes(interview.status) && (
                <Button onClick={() => navigate(`/interviewer/live/${interview.id}`)}>
                  <Video aria-hidden="true" /> Join live session
                </Button>
              )}
              {interview.status === "draft" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void interviewService
                      .update(interview.id, { status: "scheduled" })
                      .then(() => {
                        toast.success("Interview published");
                        reload();
                      })
                      .catch((err: unknown) => toast.error(errorMessage(err)))
                  }
                >
                  Publish
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link to="/interviewer/interviews">
                  <ArrowLeft aria-hidden="true" /> All interviews
                </Link>
              </Button>
            </>
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={interview.status} />
          <Badge variant="secondary">{typeLabel}</Badge>
          <Badge variant="secondary" className="capitalize">{interview.difficulty}</Badge>
          {interview.job_role && <Badge variant="secondary">{interview.job_role}</Badge>}
          <span className="text-sm text-muted-foreground">
            {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : "Not scheduled"} ·{" "}
            {interview.duration_minutes} min
          </span>
        </div>
      </div>

      {/* Candidate */}
      <Card className="no-print">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Avatar className="h-12 w-12">
            <AvatarImage src={interview.candidate?.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{initials(interview.candidate?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{interview.candidate?.full_name ?? "No candidate assigned yet"}</p>
            <p className="text-sm text-muted-foreground">{interview.candidate?.email ?? "Send an invitation below"}</p>
          </div>
          {interview.candidate && (
            <CandidateResumeButton candidateId={interview.candidate.id} onOpen={openResume} />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={interview.status === "completed" ? "report" : "questions"} className="no-print">
        <TabsList>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card>
            <CardContent className="p-5">
              {questions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {interview.type === "mcq"
                    ? "MCQ questions are drawn from the MCQ bank when the candidate starts."
                    : "No prepared questions — for AI interviews, questions can be generated adaptively during the session."}
                </p>
              ) : (
                <ol className="space-y-3">
                  {questions.map((q, i) => (
                    <li key={q.id} className="flex gap-3 rounded-lg border p-3.5">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{q.question}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{q.category}</Badge>
                          <Badge variant="secondary" className="capitalize">{q.question_type}</Badge>
                          <Badge variant="secondary" className="capitalize">{q.difficulty}</Badge>
                          <Badge variant="secondary">{q.time_limit_seconds}s</Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                Invite a candidate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="candidate@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  aria-label="Candidate email for invitation"
                />
                <Button onClick={() => void sendInvite()} loading={sendingInvite}>
                  <Send aria-hidden="true" /> Send
                </Button>
              </div>
              {invitations.length > 0 && (
                <ul className="space-y-2">
                  {invitations.map((invite) => {
                    const url = `${window.location.origin}/invite/${invite.token}`;
                    return (
                      <li key={invite.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{invite.candidate_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {invite.status} · expires {formatRelative(invite.expires_at)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            invite.status === "accepted" ? "success" : invite.status === "pending" ? "info" : "secondary"
                          }
                          className="capitalize"
                        >
                          {invite.status}
                        </Badge>
                        {invite.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                void navigator.clipboard.writeText(url);
                                toast.success("Invite link copied");
                              }}
                            >
                              <Copy aria-hidden="true" /> Copy link
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Cancel invitation"
                              onClick={() =>
                                void invitationService
                                  .cancel(invite.id)
                                  .then(() => {
                                    toast.success("Invitation cancelled");
                                    reload();
                                  })
                                  .catch((err: unknown) => toast.error(errorMessage(err)))
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Add an interview note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  aria-label="New note"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={notePrivate} onCheckedChange={setNotePrivate} aria-label="Keep note private" />
                    {notePrivate ? "Private (only you)" : "Shared with candidate"}
                  </label>
                  <Button size="sm" onClick={() => void addNote()} loading={savingNote} disabled={!noteText.trim()}>
                    <StickyNote aria-hidden="true" /> Add note
                  </Button>
                </div>
              </div>
              {notes.length > 0 && (
                <ul className="space-y-2">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-lg border p-3.5">
                      <p className="text-sm leading-relaxed">{note.note}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {formatDateTime(note.created_at)}
                        <Badge variant="secondary">{note.is_private ? "Private" : "Shared"}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={() => void loadReport()} loading={reportLoading}>
              <FileBarChart aria-hidden="true" /> {report ? "Refresh report" : "Generate report"}
            </Button>
            <Button variant="outline" onClick={() => void recalculate()} loading={recalculating}>
              <Wand2 aria-hidden="true" /> Recalculate result from AI analysis
            </Button>
            {report && (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden="true" /> Download PDF
              </Button>
            )}
          </div>
          {report ? (
            <ReportViewer report={report} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Generate the report to see scores, transcripts, per-question AI analysis, and your notes in one place.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Printable region when a report is loaded */}
      {report && (
        <div className="hidden print:block">
          <ReportViewer report={report} />
        </div>
      )}
    </div>
  );
}

function CandidateResumeButton({
  candidateId,
  onOpen,
}: {
  candidateId: string;
  onOpen: (path: string) => Promise<void>;
}) {
  const { data } = useAsync(() => profileService.get(candidateId), [candidateId]);
  if (!data?.resume_url) return null;
  const resumePath = data.resume_url;
  return (
    <Button variant="outline" size="sm" onClick={() => void onOpen(resumePath)}>
      View resume
    </Button>
  );
}
