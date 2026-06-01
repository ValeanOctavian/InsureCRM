import { createClient } from "@/lib/supabase/server";
import type { ActivityLog, ActivityWithClient, ActivityAction, ActivityEntityType } from "@/types/activity";

export async function getRecentActivities(
  brokerId: string,
  limit = 20
): Promise<ActivityLog[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("broker_id", brokerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ActivityLog[];
}

export async function getClientTimeline(
  clientId: string,
  brokerId: string
): Promise<ActivityWithClient[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activity_logs")
    .select("*, clients!inner(id, first_name, last_name)")
    .eq("broker_id", brokerId)
    .eq("entity_id", clientId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []) as ActivityWithClient[];
}

export async function getClientRelatedTimeline(
  clientId: string,
  brokerId: string
): Promise<ActivityWithClient[]> {
  const supabase = await createClient();

  // Get activities for this client across all entity types
  const { data } = await supabase
    .from("activity_logs")
    .select("*, clients!inner(id, first_name, last_name)")
    .eq("broker_id", brokerId)
    .eq("entity_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as ActivityWithClient[];
}

export async function getDashboardActivityFeed(
  brokerId: string,
  limit = 10
): Promise<ActivityWithClient[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activity_logs")
    .select("*, clients(id, first_name, last_name)")
    .eq("broker_id", brokerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ActivityWithClient[];
}
