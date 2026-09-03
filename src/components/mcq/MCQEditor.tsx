import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTIES, MCQ_CATEGORIES } from "@/lib/constants";
import { errorMessage } from "@/services/api";
import { mcqService } from "@/services/mcqService";
import type { MCQQuestion } from "@/types";

const schema = z.object({
  question: z.string().trim().min(10, "Question must be at least 10 characters"),
  option_a: z.string().trim().min(1, "Option A is required"),
  option_b: z.string().trim().min(1, "Option B is required"),
  option_c: z.string().trim().min(1, "Option C is required"),
  option_d: z.string().trim().min(1, "Option D is required"),
  correct_option: z.enum(["a", "b", "c", "d"]),
  category: z.string().trim().min(2),
  difficulty: z.string().min(1),
  explanation: z.string().trim().optional(),
});

interface MCQEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcq: MCQQuestion | null;
  createdBy: string;
  onSaved: (mcq: MCQQuestion) => void;
}

export function MCQEditor({ open, onOpenChange, mcq, createdBy, onSaved }: MCQEditorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [correct, setCorrect] = useState<"a" | "b" | "c" | "d">("a");
  const [category, setCategory] = useState("JavaScript");
  const [customCategory, setCustomCategory] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [explanation, setExplanation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuestion(mcq?.question ?? "");
    setOptions({
      a: mcq?.option_a ?? "",
      b: mcq?.option_b ?? "",
      c: mcq?.option_c ?? "",
      d: mcq?.option_d ?? "",
    });
    setCorrect((mcq?.correct_option as "a" | "b" | "c" | "d") ?? "a");
    const knownCategory = MCQ_CATEGORIES.includes((mcq?.category ?? "JavaScript") as (typeof MCQ_CATEGORIES)[number]);
    setCategory(mcq ? (knownCategory ? mcq.category : "Custom") : "JavaScript");
    setCustomCategory(mcq && !knownCategory ? mcq.category : "");
    setDifficulty(mcq?.difficulty ?? "medium");
    setExplanation(mcq?.explanation ?? "");
  }, [open, mcq]);

  const handleSave = async () => {
    const effectiveCategory = category === "Custom" ? customCategory : category;
    const parsed = schema.safeParse({
      question,
      option_a: options.a,
      option_b: options.b,
      option_c: options.c,
      option_d: options.d,
      correct_option: correct,
      category: effectiveCategory,
      difficulty,
      explanation: explanation || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: parsed.data.question,
        option_a: parsed.data.option_a,
        option_b: parsed.data.option_b,
        option_c: parsed.data.option_c,
        option_d: parsed.data.option_d,
        correct_option: parsed.data.correct_option,
        category: parsed.data.category,
        difficulty: parsed.data.difficulty,
        explanation: parsed.data.explanation ?? null,
      };
      const saved = mcq
        ? await mcqService.update(mcq.id, payload)
        : await mcqService.create({ ...payload, created_by: createdBy });
      toast.success(mcq ? "MCQ updated" : "MCQ created");
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
          <DialogTitle>{mcq ? "Edit MCQ" : "New MCQ"}</DialogTitle>
          <DialogDescription>Mark the correct option — candidates see explanations after submitting.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcq-question">Question</Label>
            <Textarea id="mcq-question" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>

          <RadioGroup
            value={correct}
            onValueChange={(v) => setCorrect(v as "a" | "b" | "c" | "d")}
            className="space-y-2.5"
            aria-label="Options (select the correct one)"
          >
            {(["a", "b", "c", "d"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <RadioGroupItem value={key} id={`correct-${key}`} aria-label={`Option ${key.toUpperCase()} is correct`} />
                <Label htmlFor={`option-${key}`} className="w-6 font-mono text-xs font-bold uppercase text-muted-foreground">
                  {key}
                </Label>
                <Input
                  id={`option-${key}`}
                  placeholder={`Option ${key.toUpperCase()}`}
                  value={options[key]}
                  onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Correct answer: <span className="font-mono font-bold uppercase text-success">{correct}</span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mcq-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="mcq-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MCQ_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {category === "Custom" && (
                <Input
                  placeholder="Custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  aria-label="Custom category name"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcq-difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="mcq-difficulty">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="mcq-explanation">Explanation (shown after submission)</Label>
            <Textarea
              id="mcq-explanation"
              rows={2}
              placeholder="Why the correct option is right…"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            {mcq ? "Save changes" : "Create MCQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
