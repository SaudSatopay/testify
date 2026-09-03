import { useState } from "react";
import { Ban, CheckCircle2, MoreHorizontal, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TableSkeleton } from "@/components/shared/LoadingState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { initials } from "@/lib/format";
import { errorMessage } from "@/services/api";
import { adminService } from "@/services/adminService";
import type { Profile, Role } from "@/types";

const PAGE_SIZE = 15;

const ROLE_BADGE: Record<string, "info" | "warning" | "accent"> = {
  candidate: "info",
  interviewer: "warning",
  admin: "accent",
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useAsync(
    () => adminService.listUsers({ search: debouncedSearch, role: roleFilter, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, roleFilter, page],
  );

  const [viewing, setViewing] = useState<Profile | null>(null);
  const [roleChange, setRoleChange] = useState<{ user: Profile; role: Role } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    user: Profile;
    action: "suspend" | "activate" | "delete";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const applyRoleChange = async () => {
    if (!roleChange) return;
    setBusy(true);
    try {
      await adminService.changeRole(roleChange.user.id, roleChange.role);
      toast.success(`${roleChange.user.full_name} is now ${roleChange.role}`);
      setRoleChange(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyConfirmAction = async () => {
    if (!confirmAction) return;
    const { user, action } = confirmAction;
    try {
      if (action === "suspend") await adminService.suspendUser(user.id);
      else if (action === "activate") await adminService.activateUser(user.id);
      else await adminService.deleteUser(user.id);
      toast.success(
        action === "suspend" ? "User suspended" : action === "activate" ? "User reactivated" : "User deleted",
      );
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage accounts, roles, and access. Every action here is verified server-side and audit-logged."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Search by name or email…"
          className="sm:max-w-xs"
        />
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="candidate">Candidates</SelectItem>
            <SelectItem value="interviewer">Interviewers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search or role filter." />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((profile) => {
                    const isSelf = profile.id === me?.id;
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                              <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {profile.full_name}
                                {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_BADGE[profile.role] ?? "secondary"} className="capitalize">
                            {profile.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {profile.status === "suspended" ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {formatDate(profile.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${profile.full_name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(profile)}>
                                <Users /> View profile
                              </DropdownMenuItem>
                              {!isSelf && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => setRoleChange({ user: profile, role: profile.role as Role })}
                                  >
                                    <UserCog /> Change role
                                  </DropdownMenuItem>
                                  {profile.status === "suspended" ? (
                                    <DropdownMenuItem
                                      onClick={() => setConfirmAction({ user: profile, action: "activate" })}
                                    >
                                      <CheckCircle2 /> Reactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => setConfirmAction({ user: profile, action: "suspend" })}
                                    >
                                      <Ban /> Suspend
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setConfirmAction({ user: profile, action: "delete" })}
                                  >
                                    <Trash2 /> Delete user
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {data.count} users
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

      {/* View profile */}
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User profile</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={viewing.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(viewing.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{viewing.full_name}</p>
                  <p className="text-sm text-muted-foreground">{viewing.email}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Role</dt>
                  <dd className="mt-0.5 font-medium capitalize">{viewing.role}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="mt-0.5 font-medium capitalize">{viewing.status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="mt-0.5">{viewing.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Experience</dt>
                  <dd className="mt-0.5">
                    {viewing.experience_years != null ? `${viewing.experience_years} years` : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Joined</dt>
                  <dd className="mt-0.5">{formatDate(viewing.created_at)}</dd>
                </div>
                {viewing.bio && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Bio</dt>
                    <dd className="mt-0.5 leading-relaxed">{viewing.bio}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change role */}
      <Dialog open={Boolean(roleChange)} onOpenChange={(open) => !open && setRoleChange(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Change role
            </DialogTitle>
            <DialogDescription>
              Changing {roleChange?.user.full_name}'s role updates their permissions immediately. This is executed by a
              server-side function and audit-logged.
            </DialogDescription>
          </DialogHeader>
          {roleChange && (
            <Select
              value={roleChange.role}
              onValueChange={(v) => setRoleChange({ ...roleChange, role: v as Role })}
            >
              <SelectTrigger aria-label="New role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidate</SelectItem>
                <SelectItem value="interviewer">Interviewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChange(null)}>
              Cancel
            </Button>
            <Button onClick={() => void applyRoleChange()} loading={busy}>
              Apply role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.action === "delete"
            ? "Delete this user?"
            : confirmAction?.action === "suspend"
              ? "Suspend this user?"
              : "Reactivate this user?"
        }
        description={
          confirmAction?.action === "delete"
            ? `${confirmAction.user.full_name}'s account and all their data will be permanently deleted. This cannot be undone.`
            : confirmAction?.action === "suspend"
              ? `${confirmAction?.user.full_name} will be blocked from using Testify until reactivated.`
              : `${confirmAction?.user.full_name} will regain full access.`
        }
        confirmLabel={
          confirmAction?.action === "delete" ? "Delete permanently" : confirmAction?.action === "suspend" ? "Suspend" : "Reactivate"
        }
        destructive={confirmAction?.action !== "activate"}
        onConfirm={applyConfirmAction}
      />
    </div>
  );
}
