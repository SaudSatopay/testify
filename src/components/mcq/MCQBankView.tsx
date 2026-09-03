import { useState } from "react";
import { CheckCircle2, Copy, ListChecks, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MCQEditor } from "@/components/mcq/MCQEditor";
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
import { DIFFICULTIES, MCQ_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/services/api";
import { mcqService } from "@/services/mcqService";
import type { MCQQuestion } from "@/types";

const PAGE_SIZE = 10;
const OPTION_KEYS = ["a", "b", "c", "d"] as const;

export function MCQBankView({ description }: { description: string }) {
  const { user, role } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useAsync(
    () =>
      mcqService.list({
        search: debouncedSearch,
        category: categoryFilter,
        difficulty: difficultyFilter,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, categoryFilter, difficultyFilter, page],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MCQQuestion | null>(null);
  const [deleting, setDeleting] = useState<MCQQuestion | null>(null);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const canEdit = (q: MCQQuestion) => q.created_by === user?.id || role === "admin";

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await mcqService.remove(deleting.id);
      toast.success("MCQ deleted");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (mcq: MCQQuestion) => {
    if (!user) return;
    try {
      await mcqService.duplicate(mcq, user.id);
      toast.success("MCQ duplicated");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCQ Bank"
        description={description}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus aria-hidden="true" /> New MCQ
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
          placeholder="Search MCQs…"
          className="lg:max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="lg:w-48" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {MCQ_CATEGORIES.filter((c) => c !== "Custom").map((c) => (
              <SelectItem key={c} value={c}>
                {c}
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
          icon={ListChecks}
          title="No MCQs found"
          description="Create MCQs here — candidates draw from this bank when taking assessments."
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              Create MCQ
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3">
            {data.rows.map((mcq) => (
              <Card key={mcq.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{mcq.question}</p>
                      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                        {OPTION_KEYS.map((key) => (
                          <p
                            key={key}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                              mcq.correct_option === key
                                ? "bg-success/10 font-medium text-success"
                                : "bg-muted/50 text-muted-foreground",
                            )}
                          >
                            <span className="font-mono text-xs font-bold uppercase">{key}</span>
                            <span className="truncate">{mcq[`option_${key}` as const]}</span>
                            {mcq.correct_option === key && (
                              <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0" aria-label="Correct answer" />
                            )}
                          </p>
                        ))}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{mcq.category}</Badge>
                        <Badge variant="secondary" className="capitalize">{mcq.difficulty}</Badge>
                        {mcq.created_by === null && <Badge variant="info">Testify library</Badge>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="MCQ actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit(mcq) && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(mcq);
                              setEditorOpen(true);
                            }}
                          >
                            <Pencil /> Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => void handleDuplicate(mcq)}>
                          <Copy /> Duplicate
                        </DropdownMenuItem>
                        {canEdit(mcq) && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleting(mcq)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {data.count} MCQs
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
        <MCQEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          mcq={editing}
          createdBy={user.id}
          onSaved={() => reload()}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this MCQ?"
        description="It will be removed from the bank and from future assessments. Past attempts keep their scores."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
