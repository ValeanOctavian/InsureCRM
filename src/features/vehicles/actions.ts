"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vehicleSchema } from "@/lib/validations";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { getVehicleDetail as getVehicleDetailQuery } from "./queries";
import type { ActionResponse } from "@/types";
import type { VehicleInput } from "@/lib/validations";
import type { VehicleDetailData } from "./queries";

export async function createVehicle(
  input: VehicleInput
): Promise<ActionResponse<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      client_id: parsed.data.clientId,
      broker_id: profile.id,
      registration_number: parsed.data.registrationNumber,
      vin: parsed.data.vin ?? null,
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      engine_capacity: parsed.data.engineCapacity ?? null,
      fuel_type: parsed.data.fuelType ?? null,
      document_number: parsed.data.documentNumber ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/vehicles");
  revalidatePath(`/broker/clients/${parsed.data.clientId}`);
  return { success: true, data: { id: data.id } };
}

export async function updateVehicle(
  id: string,
  input: VehicleInput
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({
      client_id: parsed.data.clientId,
      registration_number: parsed.data.registrationNumber,
      vin: parsed.data.vin ?? null,
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year,
      engine_capacity: parsed.data.engineCapacity ?? null,
      fuel_type: parsed.data.fuelType ?? null,
      document_number: parsed.data.documentNumber ?? null,
    })
    .eq("id", id)
    .eq("broker_id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/vehicles");
  revalidatePath(`/broker/clients/${parsed.data.clientId}`);
  return { success: true, data: undefined };
}

export async function deleteVehicle(id: string): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("broker_id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/vehicles");
  return { success: true, data: undefined };
}

/**
 * Server action wrapper for getVehicleDetail so it can be called
 * safely from client components (e.g., the vehicle detail sheet).
 */
export async function fetchVehicleDetail(
  vehicleId: string
): Promise<VehicleDetailData | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return getVehicleDetailQuery(vehicleId, profile.id);
}
