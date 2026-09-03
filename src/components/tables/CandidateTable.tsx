import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatScore, initials, scoreTextClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

export interface CandidateSummary {
  profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;
  interviewCount: number;
  completedCount: number;
  averageScore: number | null;
  lastInterviewAt: string | null;
  lastInterviewId: string | null;
}

interface CandidateTableProps {
  candidates: CandidateSummary[];
  onView: (candidate: CandidateSummary) => void;
}

export function CandidateTable({ candidates, onView }: CandidateTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead className="hidden sm:table-cell">Interviews</TableHead>
          <TableHead>Avg score</TableHead>
          <TableHead className="hidden md:table-cell">Last activity</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((candidate) => (
          <TableRow key={candidate.profile.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={candidate.profile.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(candidate.profile.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{candidate.profile.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{candidate.profile.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="secondary">
                {candidate.completedCount}/{candidate.interviewCount} completed
              </Badge>
            </TableCell>
            <TableCell>
              <span className={cn("score-mono font-bold", scoreTextClass(candidate.averageScore))}>
                {candidate.averageScore != null ? formatScore(candidate.averageScore) : "—"}
              </span>
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {candidate.lastInterviewAt ? formatDate(candidate.lastInterviewAt) : "—"}
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline" onClick={() => onView(candidate)}>
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
