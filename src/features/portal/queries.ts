import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/middleware";
import type {
  Policy,
  Vehicle,
  Document,
  RenewalRequest,
  RenewalOffer,
  Profile,
  Client,
  RenewalRequestStatus,
} from "@/types";

const OPEN_RENEWAL_STATUSES: RenewalRequestStatus[] = [
  "renewal_requested",
  "waiting_for_documents",
  "waiting_for_offer",
  "offer_available",
  "waiting_for_payment",
  "requested",
  "documents_needed",
  "in_progress",
];

/**
 * Get the authenticated client's data from the clients table.
 * Matches by `auth_user_id` (FK to auth.users) — robust against email
 * changes and avoids the email-collision pitfall the old version had.
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

  // Find the client record by auth_user_id (the canonical link).
  // Fall back to email match for legacy rows where auth_user_id is null
  // (e.g. broker-created clients from before the column was added).
  let { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) {
    const { data: byEmail } = await supabase
      .from("clients")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    client = byEmail ?? null;
  }

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
 * Policy enriched with its vehicle and any open renewal request.
 */
export type PortalPolicyCard = Policy & {
  vehicle: Pick<Vehicle, "id" | "registration_number" | "brand" | "model"> | null;
  open_renewal: (RenewalRequest & { offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type">[] }) | null;
};

/**
 * Fetch all policies for the client with their vehicle + open renewal request.
 * Used by the portal dashboard to render policy cards.
 */
export async function getPortalPoliciesForCards(): Promise<PortalPolicyCard[]> {
  const portal = await getPortalClient();
  if (!portal) return [];

  const supabase = await createClient();

  // 1. Policies with vehicle
  const { data: policies } = (await supabase
    .from("policies")
    .select("*, vehicle:vehicles(id, registration_number, brand, model)")
    .eq("client_id", portal.client.id)
    .order("end_date", { ascending: true })) as unknown as {
    data: (Policy & {
      vehicle: Pick<Vehicle, "id" | "registration_number" | "brand" | "model"> | null;
    })[] | null;
  };

  if (!policies || policies.length === 0) return [];

  // 2. Open renewal requests for these policies (with offers)
  const policyIds = policies.map((p) => p.id);
  const { data: renewals } = (await supabase
    .from("renewal_requests")
    .select("*, offers:renewal_offers(id, status, price, currency, insurer_name, coverage_type)")
    .eq("client_id", portal.client.id)
    .in("policy_id", policyIds)
    .in("status", OPEN_RENEWAL_STATUSES)
    .order("created_at", { ascending: false })) as unknown as {
    data: (RenewalRequest & {
      offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type">[];
    })[] | null;
  };

  const renewalByPolicy = new Map<string, RenewalRequest & { offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type">[] }>();
  for (const r of renewals ?? []) {
    // Take the most recent per policy
    if (r.policy_id && !renewalByPolicy.has(r.policy_id)) {
      renewalByPolicy.set(r.policy_id, r);
    }
  }

  return policies.map((p) => ({
    ...p,
    open_renewal: renewalByPolicy.get(p.id) ?? null,
  }));
}

/**
 * Get a single policy with everything needed for the detail sheet:
 * vehicle, documents, renewal history (all renewal_requests), open renewal + offers.
 */
export async function getPortalPolicyDetail(policyId: string): Promise<{
  policy: Policy;
  vehicle: Vehicle | null;
  documents: Document[];
  renewalHistory: (RenewalRequest & {
    offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[];
  })[];
  openRenewal: (RenewalRequest & {
    offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[];
  }) | null;
} | null> {
  const portal = await getPortalClient();
  if (!portal) return null;

  const supabase = await createClient();

  const { data: policy } = await supabase
    .from("policies")
    .select("*")
    .eq("id", policyId)
    .eq("client_id", portal.client.id)
    .maybeSingle();

  if (!policy) return null;

  const [vehicleRes, documentsRes, renewalsRes] = await Promise.all([
    policy.vehicle_id
      ? supabase
          .from("vehicles")
          .select("*")
          .eq("id", policy.vehicle_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("documents")
      .select("*")
      .eq("client_id", portal.client.id)
      .order("created_at", { ascending: false }),
    (supabase
      .from("renewal_requests")
      .select("*, offers:renewal_offers(id, status, price, currency, insurer_name, coverage_type, notes)")
      .eq("policy_id", policyId)
      .order("created_at", { ascending: false })) as unknown as Promise<{
      data: (RenewalRequest & {
        offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[];
      })[] | null;
    }>,
  ]);

  const allRenewals = renewalsRes.data ?? [];
  const openRenewal = allRenewals.find((r) => OPEN_RENEWAL_STATUSES.includes(r.status)) ?? null;

  return {
    policy,
    vehicle: vehicleRes.data,
    documents: documentsRes.data ?? [],
    renewalHistory: allRenewals,
    openRenewal,
  };
}
