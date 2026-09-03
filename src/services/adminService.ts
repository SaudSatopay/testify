import { supabase } from "@/integrations/supabase/client";
import { api } from "@/services/api";
import type { AuditLog, PlatformStats, Profile, Role } from "@/types";

export interface UserFilters {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export const adminService = {
  async platformStats(): Promise<PlatformStats> {
    const { data, error } = await supabase.rpc("get_platform_stats");
    if (error) throw new Error(error.message);
    return data as unknown as PlatformStats;
  },

  async listUsers(filters: UserFilters = {}): Promise<{ rows: Profile[]; count: number }> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? 15;
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.role && filters.role !== "all") query = query.eq("role", filters.role);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: data ?? [], count: count ?? 0 };
  },

  /** All admin mutations go through the server-verified edge function. */
  changeRole: (userId: string, role: Role) => api.adminUsers({ action: "change_role", user_id: userId, role }),
  suspendUser: (userId: string) => api.adminUsers({ action: "suspend", user_id: userId }),
  activateUser: (userId: string) => api.adminUsers({ action: "activate", user_id: userId }),
  deleteUser: (userId: string) => api.adminUsers({ action: "delete", user_id: userId }),

  async auditLogs(page: number, pageSize: number, search?: string): Promise<{ rows: AuditLog[]; count: number }> {
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (search) query = query.ilike("action", `%${search}%`);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: data ?? [], count: count ?? 0 };
  },

  async settings(): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from("platform_settings").select("*");
    if (error) throw new Error(error.message);
    const map: Record<string, unknown> = {};
    for (const row of data ?? []) {
      const value = row.value;
      map[row.key] =
        value && typeof value === "object" && !Array.isArray(value) && "value" in value
          ? (value as { value: unknown }).value
          : value;
    }
    return map;
  },

  async updateSetting(key: string, value: string | number | boolean, updatedBy: string): Promise<void> {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value: { value }, updated_by: updatedBy, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  },
};
