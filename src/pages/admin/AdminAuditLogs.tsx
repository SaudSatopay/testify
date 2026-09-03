import { useState } from "react";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime } from "@/lib/format";
import { adminService } from "@/services/adminService";

const PAGE_SIZE = 25;

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useAsync(
    () => adminService.auditLogs(page, PAGE_SIZE, debouncedSearch),
    [page, debouncedSearch],
  );

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="A chronological record of security-relevant activity. Logs are append-only."
      />

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        placeholder="Filter by action (e.g. user_login)…"
        className="max-w-sm"
      />

      {loading ? (
        <TableSkeleton rows={10} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries" description="Actions like sign-ins, interview changes, and admin operations will appear here." />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden sm:table-cell">Resource</TableHead>
                    <TableHead className="hidden lg:table-cell">User</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {log.resource_type ?? "—"}
                        {log.resource_id && (
                          <span className="ml-1 font-mono text-xs">{log.resource_id.slice(0, 8)}…</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                        {log.user_id ? `${log.user_id.slice(0, 8)}…` : "system"}
                      </TableCell>
                      <TableCell className="hidden max-w-[280px] md:table-cell">
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {log.metadata && Object.keys(log.metadata as object).length > 0
                            ? JSON.stringify(log.metadata)
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {data.count} entries
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
    </div>
  );
}
