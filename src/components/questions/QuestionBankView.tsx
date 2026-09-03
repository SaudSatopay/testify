import { useState } from "react";
import { Copy, MessageSquareText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { QuestionEditor } from "@/components/questions/QuestionEditor";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { DIFFICULTIES, QUESTION_TYPES } from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import { errorMessage } from "@/services/api";
import { questionService } from "@/services/questionService";
import type { Question } from "@/types";

const PAGE_SIZE = 12;

export function QuestionBankView({ description }: { description: string }) {
  const { user, role } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useAsync(
    () =>
      questionService.list({
        search: debouncedSearch,
        questionType: typeFilter,
        difficulty: difficultyFilter,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, typeFilter, difficultyFilter, page],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await questionService.remove(deleting.id);
      toast.success("Question deleted");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (question: Question) => {
    if (!user) return;
    try {
      await questionService.duplicate(question, user.id);
      toast.success("Question duplicated");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const canEdit = (q: Question) => q.created_by === user?.id || role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description={description}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus aria-hidden="true" /> New question
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Search questions…"
          className="lg:max-w-xs"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="lg:w-44" aria-label="Filter by question type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {QUESTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={difficultyFilter}
          onValueChange={(v) => {
            setDifficultyFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="lg:w-44" aria-label="Filter by difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No questions found"
          description={
            search || typeFilter !== "all" || difficultyFilter !== "all"
              ? "Try different filters."
              : "Create your first question — seed questions from Testify appear here too."
          }
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              Create question
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3">
            {data.rows.map((question) => (
              <Card key={question.id} className="card-hover">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{question.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{question.category}</Badge>
                      <Badge variant="secondary" className="capitalize">{question.question_type}</Badge>
                      <Badge variant="secondary" className="capitalize">{question.difficulty}</Badge>
                      <Badge variant="secondary">{formatDuration(question.time_limit_seconds)}</Badge>
                      {question.is_ai_generated && <Badge variant="accent">AI generated</Badge>}
                      {question.created_by === null && <Badge variant="info">Testify library</Badge>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Question actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit(question) && (
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(question);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil /> Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => void handleDuplicate(question)}>
                        <Copy /> Duplicate
                      </DropdownMenuItem>
                      {canEdit(question) && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleting(question)}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {data.count} questions
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {user && (
        <QuestionEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          question={editing}
          createdBy={user.id}
          onSaved={() => reload()}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this question?"
        description="It will be removed from the bank. Interviews that already used it keep their response history."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
