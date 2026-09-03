import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTIES, QUESTION_TYPES } from "@/lib/constants";
import { errorMessage } from "@/services/api";
import { questionService } from "@/services/questionService";
import type { Question } from "@/types";
import { readStringArray } from "@/types";

const schema = z.object({
  question: z.string().trim().min(10, "Question must be at least 10 characters"),
  category: z.string().trim().min(2, "Enter a category"),
  question_type: z.string().min(1),
  difficulty: z.string().min(1),
  ideal_answer: z.string().trim().optional(),
  time_limit_seconds: z.coerce.number().min(30, "Minimum 30 seconds").max(3600, "Maximum 1 hour"),
});

interface QuestionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing question to edit, or null to create. */
  question: Question | null;
  createdBy: string;
  onSaved: (question: Question) => void;
}

export function QuestionEditor({ open, onOpenChange, question, createdBy, onSaved }: QuestionEditorProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [questionType, setQuestionType] = useState("technical");
  const [difficulty, setDifficulty] = useState("medium");
  const [idealAnswer, setIdealAnswer] = useState("");
  const [timeLimit, setTimeLimit] = useState("180");
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(question?.question ?? "");
    setCategory(question?.category ?? "");
    setQuestionType(question?.question_type ?? "technical");
    setDifficulty(question?.difficulty ?? "medium");
    setIdealAnswer(question?.ideal_answer ?? "");
    setTimeLimit(String(question?.time_limit_seconds ?? 180));
    setTopics(readStringArray(question?.expected_topics ?? []));
    setTopicInput("");
  }, [open, question]);

  const addTopic = () => {
    const value = topicInput.trim();
    if (!value || topics.includes(value) || topics.length >= 10) return;
    setTopics((prev) => [...prev, value]);
    setTopicInput("");
  };

  const handleSave = async () => {
    const parsed = schema.safeParse({
      question: text,
      category,
      question_type: questionType,
      difficulty,
      ideal_answer: idealAnswer || undefined,
      time_limit_seconds: timeLimit,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: parsed.data.question,
        category: parsed.data.category,
        question_type: parsed.data.question_type,
        difficulty: parsed.data.difficulty,
        ideal_answer: parsed.data.ideal_answer ?? null,
        time_limit_seconds: parsed.data.time_limit_seconds,
        expected_topics: topics,
      };
      const saved = question
        ? await questionService.update(question.id, payload)
        : await questionService.create({ ...payload, created_by: createdBy });
      toast.success(question ? "Question updated" : "Question created");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>
            Expected topics and the ideal answer guide the AI when scoring candidate responses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q-text">Question</Label>
            <Textarea
              id="q-text"
              rows={3}
              placeholder="e.g. Explain the difference between optimistic and pessimistic locking…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="q-category">Category</Label>
              <Input
                id="q-category"
                placeholder="e.g. Backend Developer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-type">Question type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger id="q-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="q-difficulty">
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
              <Label htmlFor="q-time">Time limit (seconds)</Label>
              <Input
                id="q-time"
                type="number"
                min={30}
                max={3600}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-topic-input">Expected topics</Label>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <Badge key={topic} variant="info" className="gap-1 pr-1">
                  {topic}
                  <button
                    type="button"
                    aria-label={`Remove ${topic}`}
                    onClick={() => setTopics((prev) => prev.filter((t) => t !== topic))}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="q-topic-input"
                placeholder="e.g. race conditions"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTopic} aria-label="Add topic">
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-ideal">Ideal answer (optional)</Label>
            <Textarea
              id="q-ideal"
              rows={3}
              placeholder="What a strong answer covers…"
              value={idealAnswer}
              onChange={(e) => setIdealAnswer(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            {question ? "Save changes" : "Create question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
