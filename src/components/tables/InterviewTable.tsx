import { CalendarClock, Eye, MoreHorizontal, Trash2, Video, XCircle } from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { InterviewWithPeople } from "@/types";

interface InterviewTableProps {
  interviews: InterviewWithPeople[];
  showCreator?: boolean;
  onView: (interview: InterviewWithPeople) => void;
  onJoin?: (interview: InterviewWithPeople) => void;
  onReschedule?: (interview: InterviewWithPeople) => void;
  onCancel?: (interview: InterviewWithPeople) => void;
  onDelete?: (interview: InterviewWithPeople) => void;
}

export function InterviewTable({
  interviews,
  showCreator = false,
  onView,
  onJoin,
  onReschedule,
  onCancel,
  onDelete,
}: InterviewTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Interview</TableHead>
          <TableHead className="hidden md:table-cell">Candidate</TableHead>
          {showCreator && <TableHead className="hidden lg:table-cell">Created by</TableHead>}
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interviews.map((interview) => {
          const typeLabel = INTERVIEW_TYPES.find((t) => t.value === interview.type)?.label ?? interview.type;
          const joinable =
            interview.type === "live" && (interview.status === "scheduled" || interview.status === "active");
          const cancellable = interview.status === "scheduled" || interview.status === "draft";
          return (
            <TableRow key={interview.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onView(interview)}
                  className="text-left font-medium hover:text-primary hover:underline"
                >
                  {interview.title}
                </button>
                <p className="text-xs text-muted-foreground">{interview.job_role ?? "—"}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {interview.candidate?.full_name ?? <span className="text-muted-foreground">Unassigned</span>}
              </TableCell>
              {showCreator && (
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {interview.creator?.full_name ?? "—"}
                </TableCell>
              )}
              <TableCell className="hidden sm:table-cell">
                <Badge variant="secondary">{typeLabel}</Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={interview.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {joinable && onJoin && (
                    <Button size="sm" onClick={() => onJoin(interview)}>
                      <Video aria-hidden="true" /> Join
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${interview.title}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(interview)}>
                        <Eye /> View details
                      </DropdownMenuItem>
                      {onReschedule && cancellable && (
                        <DropdownMenuItem onClick={() => onReschedule(interview)}>
                          <CalendarClock /> Reschedule
                        </DropdownMenuItem>
                      )}
                      {onCancel && cancellable && (
                        <DropdownMenuItem onClick={() => onCancel(interview)}>
                          <XCircle /> Cancel interview
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(interview)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
