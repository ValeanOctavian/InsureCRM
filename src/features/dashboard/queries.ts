import { createClient } from "@/lib/supabase/server";
import { addDays, startOfDay } from "date-fns";
import type {
  PolicyWithClient,
  TaskWithClient,
  DocumentWithClient,
  RenewalRequestWithPolicy,
} from "@/types/dashboard";

export interface DashboardStats {
  totalClients: number;
  activePolicies: number;
  expiring7Days: number;
  expiring30Days: number;
  expiredPolicies: number;
  pendingRenewals: number;
  pendingOcr: number;
  tasksDueToday: number;
  /**
   * Number of reminder emails sent today.
   */
  remindersSentToday: number;
  /**
   * Number of reminders that failed to send.
   */
  remindersFailed: number;
  /**
   * Number of policies needing action (expiring soon without renewal request).
   */
  policiesNeedingReminder: number;
}

export interface DashboardData {
  stats: DashboardStats;
  expiringPolicies: PolicyWithClient[];
  todayTasks: TaskWithClient[];
  recentDocuments: DocumentWithClient[];
  renewalRequests: RenewalRequestWithPolicy[];
}

export interface DashboardResult {
  data: DashboardData | null;
  error: string | null;
}

export async function getDashboardData(profileId: string): Promise<DashboardResult> {
  try {
    const supabase = await createClient();
    const today = startOfDay(new Date());
    const in7Days = addDays(today, 7);
    const in30Days = addDays(today, 30);

    // Run all queries in parallel
    const [
      totalClientsResult,
      activePoliciesResult,
      expiring7Result,
      expiring30Result,
      expiredResult,
      pendingRenewalsResult,
      pendingOcrResult,
      dueTasksResult,
      remindersSentTodayResult,
      remindersFailedResult,
      expiringPoliciesResult,
      todayTasksResult,
      recentDocsResult,
      renewalReqResult,
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId),

      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .eq("status", "active"),

      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .in("status", ["active", "expiring_soon"])
        .lte("end_date", in7Days.toISOString()),

      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .in("status", ["active", "expiring_soon"])
        .lte("end_date", in30Days.toISOString()),

      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .eq("status", "expired"),

      supabase
        .from("renewal_requests")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .in("status", ["requested", "documents_needed", "in_progress"]),

      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .in("ocr_status", ["pending", "processing"]),

      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .in("status", ["todo", "in_progress"])
        .lte("due_date", today.toISOString()),

      // Reminder counts
      supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .eq("status", "sent")
        .gte("created_at", today.toISOString()),

      supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("broker_id", profileId)
        .eq("status", "failed"),

      // Full data for tables
      supabase
        .from("policies")
        .select("*, clients(first_name, last_name)")
        .eq("broker_id", profileId)
        .in("status", ["active", "expiring_soon"])
        .order("end_date", { ascending: true })
        .limit(10) as unknown as { data: PolicyWithClient[] | null; error: any },

      supabase
        .from("tasks")
        .select("*, clients(first_name, last_name)")
        .eq("broker_id", profileId)
        .in("status", ["todo", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(10) as unknown as { data: TaskWithClient[] | null; error: any },

      supabase
        .from("documents")
        .select("*, clients(first_name, last_name)")
        .eq("broker_id", profileId)
        .order("created_at", { ascending: false })
        .limit(10) as unknown as { data: DocumentWithClient[] | null; error: any },

      supabase
        .from("renewal_requests")
        .select("*, policies(policy_number, type), clients(first_name, last_name)")
        .eq("broker_id", profileId)
        .in("status", ["requested", "documents_needed", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(10) as unknown as { data: RenewalRequestWithPolicy[] | null; error: any },
    ]);

    return {
      data: {
        stats: {
          totalClients: totalClientsResult.count ?? 0,
          activePolicies: activePoliciesResult.count ?? 0,
          expiring7Days: expiring7Result.count ?? 0,
          expiring30Days: expiring30Result.count ?? 0,
          expiredPolicies: expiredResult.count ?? 0,
        pendingRenewals: pendingRenewalsResult.count ?? 0,
        pendingOcr: pendingOcrResult.count ?? 0,
        tasksDueToday: dueTasksResult.count ?? 0,
        remindersSentToday: remindersSentTodayResult.count ?? 0,
        remindersFailed: remindersFailedResult.count ?? 0,
        policiesNeedingReminder: expiring30Result.count ?? 0,
        },
        expiringPolicies: expiringPoliciesResult.data ?? [],
        todayTasks: todayTasksResult.data ?? [],
        recentDocuments: recentDocsResult.data ?? [],
        renewalRequests: renewalReqResult.data ?? [],
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { data: null, error: message };
  }
}
