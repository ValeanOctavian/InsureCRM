import { createClient } from "@/lib/supabase/server";
import type { PolicyWithClient } from "@/types/dashboard";
import type { PolicyType, PolicyStatus } from "@/types";

export interface PolicyFilters {
  type?: PolicyType | "all";
  status?: PolicyStatus | "all";
  search?: string;
}

export async function getPolicies(
  profileId: string,
  filters?: PolicyFilters
): Promise<PolicyWithClient[]> {
  const supabase = await createClient();

  let query = supabase
    .from("policies")
    .select("*, clients(first_name, last_name)")
    .eq("broker_id", profileId);

  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `policy_number.ilike.%${filters.search}%,insurer_name.ilike.%${filters.search}%`
    );
  }

  const { data } = (await query
    .order("end_date", { ascending: true })
    .limit(100)) as unknown as { data: PolicyWithClient[] | null };

  return data ?? [];
}

export async function getPoliciesForVehicle(
  vehicleId: string,
  profileId: string
): Promise<PolicyWithClient[]> {
  const supabase = await createClient();

  const { data } = (await supabase
    .from("policies")
    .select("*, clients(first_name, last_name)")
    .eq("vehicle_id", vehicleId)
    .eq("broker_id", profileId)
    .order("end_date", { ascending: false })) as unknown as {
    data: PolicyWithClient[] | null;
  };

  return data ?? [];
}
