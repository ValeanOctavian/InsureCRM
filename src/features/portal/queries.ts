import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/middleware";
import type {
  Policy,
  Vehicle,
  Document,
  RenewalRequest,
  Profile,
  Client,
  PolicyStatus,
} from "@/types";

/**
 * Get the authenticated client's data from the clients table.
 * Matches by email between the auth profile and the clients table.
 */
export async function getPortalClient(): Promise<{
  client: Client;
  profile: Profile;
  broker: Profile | null;
} | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) return null;

  // Get the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "client") return null;

  // Find the client record by email
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!client) return null;

  // Get broker info
  let broker: Profile | null = null;
  if (client.broker_id) {
    const { data: b } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", client.broker_id)
      .single();
    broker = b;
  }

  return { client, profile, broker };
}

/**
 * Get all policies for the authenticated client.
 */
export async function getPortalPolicies(): Promise<Policy[]> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", portal.client.id)
    .order("end_date", { ascending: false });

  return data ?? [];
}

/**
 * Get active policies for the client (active + expiring_soon).
 */
export async function getPortalActivePolicies(): Promise<Policy[]> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", portal.client.id)
    .in("status", ["active", "expiring_soon"])
    .order("end_date", { ascending: true });

  return data ?? [];
}

/**
 * Get expired policies for the client.
 */
export async function getPortalExpiredPolicies(): Promise<Policy[]> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", portal.client.id)
    .eq("status", "expired")
    .order("end_date", { ascending: false });

  return data ?? [];
}

/**
 * Get all vehicles for the authenticated client.
 */
export async function getPortalVehicles(): Promise<Vehicle[]> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("client_id", portal.client.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get all documents for the authenticated client.
 */
export async function getPortalDocuments(): Promise<Document[]> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", portal.client.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get renewal requests for the authenticated client.
 */
export async function getPortalRenewalRequests(): Promise<
  (RenewalRequest & { policies: Pick<Policy, "policy_number" | "type" | "end_date" | "insurer_name"> | null })[]
> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();
  const { data } = (await supabase
    .from("renewal_requests")
    .select("*, policies(policy_number, type, end_date, insurer_name)")
    .eq("client_id", portal.client.id)
    .order("created_at", { ascending: false })) as unknown as {
    data: (RenewalRequest & {
      policies: Pick<Policy, "policy_number" | "type" | "end_date" | "insurer_name"> | null;
    })[] | null;
  };

  return data ?? [];
}

/**
 * Get a summary of counts for the portal dashboard.
 */
export async function getPortalSummary(): Promise<{
  activePolicies: number;
  expiringSoon: number;
  expiredPolicies: number;
  vehicles: number;
  documents: number;
  pendingRenewals: number;
}> {
  const portal = await getPortalClient();
  if (!portal) {
    return {
      activePolicies: 0,
      expiringSoon: 0,
      expiredPolicies: 0,
      vehicles: 0,
      documents: 0,
      pendingRenewals: 0,
    };
  }

  const supabase = await createClient();
  const clientId = portal.client.id;

  const [
    { count: activePolicies },
    { count: expiringSoon },
    { count: expiredPolicies },
    { count: vehicles },
    { count: documents },
    { count: pendingRenewals },
  ] = await Promise.all([
    supabase
      .from("policies")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "active"),
    supabase
      .from("policies")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "expiring_soon"),
    supabase
      .from("policies")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "expired"),
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("renewal_requests")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .in("status", ["requested", "documents_needed", "in_progress"]),
  ]);

  return {
    activePolicies: activePolicies ?? 0,
    expiringSoon: expiringSoon ?? 0,
    expiredPolicies: expiredPolicies ?? 0,
    vehicles: vehicles ?? 0,
    documents: documents ?? 0,
    pendingRenewals: pendingRenewals ?? 0,
  };
}
