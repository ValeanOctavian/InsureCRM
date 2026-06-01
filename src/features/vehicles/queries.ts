import { createClient } from "@/lib/supabase/server";
import type { Vehicle, Document, Policy } from "@/types";
import type { PolicyWithClient } from "@/types/dashboard";

export interface VehicleWithClient extends Vehicle {
  clients: { first_name: string; last_name: string } | null;
}

export interface VehicleDetailData {
  vehicle: VehicleWithClient;
  documents: Document[];
  policies: PolicyWithClient[];
}

export interface VehicleOption {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

export async function getVehicles(
  profileId: string
): Promise<VehicleWithClient[]> {
  const supabase = await createClient();

  const { data } = (await supabase
    .from("vehicles")
    .select("*, clients(first_name, last_name)")
    .eq("broker_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50)) as unknown as { data: VehicleWithClient[] | null };

  return data ?? [];
}

export async function getVehicleOptions(
  profileId: string
): Promise<VehicleOption[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vehicles")
    .select("id, registration_number, brand, model")
    .eq("broker_id", profileId)
    .order("registration_number", { ascending: true });

  return data ?? [];
}

export async function getVehicleDetail(
  vehicleId: string,
  profileId: string
): Promise<VehicleDetailData | null> {
  const supabase = await createClient();

  const [vehicleResult, documentsResult, policiesResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*, clients(first_name, last_name)")
      .eq("id", vehicleId)
      .eq("broker_id", profileId)
      .single() as unknown as Promise<{ data: VehicleWithClient | null; error: any }>,

    supabase
      .from("documents")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .eq("broker_id", profileId)
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: Document[] | null;
      error: any;
    }>,

    supabase
      .from("policies")
      .select("*, clients(first_name, last_name)")
      .eq("vehicle_id", vehicleId)
      .eq("broker_id", profileId)
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: PolicyWithClient[] | null;
      error: any;
    }>,
  ]);

  if (!vehicleResult.data) return null;

  return {
    vehicle: vehicleResult.data,
    documents: documentsResult.data ?? [],
    policies: policiesResult.data ?? [],
  };
}

export async function getClientsForSelect(
  profileId: string
): Promise<ClientOption[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("broker_id", profileId)
    .eq("status", "active")
    .order("first_name", { ascending: true });

  return data ?? [];
}
