import { FileText, ListChecks, MessageSquareText, ScanFace, StickyNote } from "lucide-react";

import { AIAnalysisPanel } from "@/components/interview/AIAnalysisPanel";
import { ScoreCard, ScoreRing } from "@/components/shared/ScoreCard";
import { CompetencyRadar } from "@/components/shared/ScoreChart";
import { VerdictStamp } from "@/components/shared/Stamp";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CONFIDENCE_DISCLAIMER } from "@/lib/constants";
import { formatDateTime, formatDuration, formatScore } from "@/lib/format";
import type { AIAnalysis, AnswerAnalysis, ReportPayload } from "@/types";
import { readStringArray } from "@/types";

function analysisToPanel(analysis: AIAnalysis): AnswerAnalysis {
  return {
    relevance: analysis.answer_relevance ?? 0,
    technical_accuracy: analysis.technical_accuracy ?? 0,
    communication: analysis.communication_score ?? 0,
    clarity: analysis.clarity_score ?? 0,
    structure: analysis.structure_score ?? 0,
    confidence_indicator: analysis.confidence_indicator ?? 0,
    speaking_pace: analysis.speaking_pace,
    filler_word_count: analysis.filler_word_count,
    strengths: readStringArray(analysis.strengths),
    weaknesses: readStringArray(analysis.weaknesses),
    recommendations: readStringArray(analysis.recommendations),
    summary: analysis.summary ?? "",
    overall_score: analysis.overall_score ?? undefined,
  };
}

export function ReportViewer({ report }: { report: ReportPayload }) {
  const { interview, candidate, result, responses, analyses, mcq, notes, ai_narrative } = report;
  const analysisByResponse = new Map(analyses.filter((a) => a.response_id).map((a) => [a.response_id as string, a]));

  const dimensions = [
    { label: "Technical", value: result?.technical_score ?? null },
    { label: "Communication", value: result?.communication_score ?? null },
    { label: "Problem solving", value: result?.problem_solving_score ?? null },
    { label: "Behavioral", value: result?.behavioral_score ?? null },
    { label: "MCQ", value: result?.mcq_score ?? null },
    { label: "Confidence indicator", value: result?.confidence_score ?? null },
  ];
  const radarData = dimensions.filter((d) => d.value != null).map((d) => ({ label: d.label, value: d.value }));
  const strengths = readStringArray(result?.strengths ?? []);
  const weaknesses = readStringArray(result?.weaknesses ?? []);

  return (
    <div className="print-page space-y-6">
      {/* Summary header */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <div className="flex justify-center">
            <ScoreRing score={result?.overall_score ?? null} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="font-display text-2xl font-bold tracking-tight">{interview.title}</h2>
              <VerdictStamp verdict={result?.recommendation ?? null} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {candidate ? `${candidate.full_name} · ` : ""}
              {interview.job_role ? `${interview.job_role} · ` : ""}
              {formatDateTime(interview.ended_at ?? interview.created_at)}
            </p>
            {result?.summary && <p className="mt-3 text-sm leading-relaxed">{result.summary}</p>}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {strengths.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                </Badge>
              ))}
              {weaknesses.map((w) => (
                <Badge key={w} variant="warning">
                  {w}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scores */}
      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {dimensions.map((d) => (
            <ScoreCard
              key={d.label}
              label={d.label}
              score={d.value}
              hint={d.label === "Confidence indicator" ? "AI communication indicator" : undefined}
            />
          ))}
          <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">{CONFIDENCE_DISCLAIMER}</p>
        </div>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Competency profile</CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length >= 3 ? (
              <CompetencyRadar data={radarData} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Not enough scored dimensions for a profile chart.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI narrative */}
      {ai_narrative && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              AI report narrative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{ai_narrative}</p>
          </CardContent>
        </Card>
      )}

      {/* MCQ summary */}
      {mcq && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
              MCQ assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <p>
              Best score: <span className="score-mono font-bold">{formatScore(mcq.best_score)}</span>
            </p>
            <p>
              Average: <span className="score-mono font-semibold">{formatScore(mcq.average_score)}</span>
            </p>
            <p>
              Attempts: <span className="score-mono font-semibold">{mcq.attempts}</span>
            </p>
            {mcq.last_completed_at && (
              <p className="text-muted-foreground">Last completed {formatDateTime(mcq.last_completed_at)}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question-by-question */}
      {responses.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" />
            Question-by-question analysis
          </h3>
          {responses.map((response, index) => {
            const analysis = response.id ? analysisByResponse.get(response.id) : undefined;
            return (
              <Card key={response.id}>
                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
                      Question {index + 1}
                      {response.duration_seconds ? ` · ${formatDuration(response.duration_seconds)}` : ""}
                    </p>
                    <p className="mt-1.5 font-medium leading-snug">{response.question_text ?? "Question"}</p>
                  </div>
                  {(response.transcript || response.text_answer) && (
                    <div className="rounded-lg bg-muted/50 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {response.transcript ? "Transcript" : "Written answer"}
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
                        {response.transcript ?? response.text_answer}
                      </p>
                    </div>
                  )}
                  {analysis && <AIAnalysisPanel analysis={analysisToPanel(analysis)} className="border-dashed" />}
                  {analysis?.facial_expression_summary && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/5 p-3.5 text-sm">
                      <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                          Observable video signals
                          {analysis.eye_contact_indicator != null &&
                            ` · eye-contact indicator ${formatScore(analysis.eye_contact_indicator)}`}
                        </p>
                        <p className="mt-1 leading-relaxed text-foreground/90">{analysis.facial_expression_summary}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interviewer notes */}
      {notes && notes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" aria-hidden="true" />
              Interviewer notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border p-3.5">
                  <p className="text-sm leading-relaxed">{note.note}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {formatDateTime(note.created_at)}
                    {note.is_private && <Badge variant="secondary">Private</Badge>}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="pb-2 text-center text-xs text-muted-foreground">
        Generated by Testify on {formatDateTime(report.generated_at)} · AI signals are decision support, not decisions.
      </p>
    </div>
  );
}
