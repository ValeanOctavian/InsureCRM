"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { policySchema } from "@/lib/validations";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { logActivity } from "@/features/activities/actions";
import { resolvePolicyStatus } from "./utils";
import type { ActionResponse } from "@/types";
import type { PolicyInput } from "@/lib/validations";

export async function createPolicy(
  input: PolicyInput
): Promise<ActionResponse<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = policySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const status = resolvePolicyStatus(parsed.data.status, parsed.data.endDate);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("policies")
    .insert({
      client_id: parsed.data.clientId,
      vehicle_id: parsed.data.vehicleId ?? null,
      broker_id: profile.id,
      type: parsed.data.type,
      insurer_name: parsed.data.insurerName,
      policy_number: parsed.data.policyNumber,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      premium_amount: parsed.data.premiumAmount,
      status,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/policies");
  revalidatePath("/broker/dashboard");
  return { success: true, data: { id: data.id } };
}

export async function updatePolicy(
  id: string,
  input: PolicyInput
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = policySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const status = resolvePolicyStatus(parsed.data.status, parsed.data.endDate);

  const supabase = await createClient();
  const { error } = await supabase
    .from("policies")
    .update({
      client_id: parsed.data.clientId,
      vehicle_id: parsed.data.vehicleId ?? null,
      type: parsed.data.type,
      insurer_name: parsed.data.insurerName,
      policy_number: parsed.data.policyNumber,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      premium_amount: parsed.data.premiumAmount,
      status,
    })
    .eq("id", id)
    .eq("broker_id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/policies");
  revalidatePath("/broker/dashboard");
  return { success: true, data: undefined };
}

export async function deletePolicy(id: string): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("policies")
    .delete()
    .eq("id", id)
    .eq("broker_id", profile.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/policies");
  revalidatePath("/broker/dashboard");
  return { success: true, data: undefined };
}

/**
 * Mark a policy as renewed (creates a renewed status, doesn't actually issue a new policy)
 */
export async function renewPolicy(id: string): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get the current policy to copy data
  const { data: policy } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .eq("broker_id", profile.id)
    .single();

  if (!policy) {
    return { success: false, error: "Policy not found" };
  }

  // Mark old policy as renewed
  const { error: updateError } = await supabase
    .from("policies")
    .update({ status: "renewed" })
    .eq("id", id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create a new policy with extended dates (copy from old, extend by 1 year)
  const oldEnd = new Date(policy.end_date);
  const newStart = new Date(oldEnd);
  newStart.setDate(newStart.getDate() + 1);
  const newEnd = new Date(newStart);
  newEnd.setFullYear(newEnd.getFullYear() + 1);

  const { error: insertError } = await supabase.from("policies").insert({
    client_id: policy.client_id,
    vehicle_id: policy.vehicle_id,
    broker_id: profile.id,
    type: policy.type,
    insurer_name: policy.insurer_name,
    policy_number: `${policy.policy_number}-R${new Date().getFullYear()}`,
    start_date: newStart.toISOString().split("T")[0],
    end_date: newEnd.toISOString().split("T")[0],
    premium_amount: policy.premium_amount,
    status: "active",
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Log activity
  logActivity({
    entityType: "policy",
    entityId: id,
    action: "renewed",
    description: `${policy.type} policy ${policy.policy_number} renewed`,
    metadata: { newPolicyNumber: `${policy.policy_number}-R${new Date().getFullYear()}` },
  });

  revalidatePath("/broker/policies");
  revalidatePath("/broker/dashboard");
  return { success: true, data: undefined, message: "Policy renewed successfully" };
}

/**
 * Create a task associated with a policy
 */
export async function createTaskFromPolicy(
  policyId: string,
  title: string,
  dueDate?: string
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get policy to find client
  const { data: policy } = await supabase
    .from("policies")
    .select("client_id")
    .eq("id", policyId)
    .eq("broker_id", profile.id)
    .single();

  if (!policy) {
    return { success: false, error: "Policy not found" };
  }

  const { error } = await supabase.from("tasks").insert({
    broker_id: profile.id,
    client_id: policy.client_id,
    policy_id: policyId,
    title,
    status: "todo",
    priority: "medium",
    due_date: dueDate ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/tasks");
  revalidatePath("/broker/policies");
  return { success: true, data: undefined };
}

/**
 * Create a renewal request from a policy
 */
export async function createRenewalRequestFromPolicy(
  policyId: string
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: policy } = await supabase
    .from("policies")
    .select("client_id, policy_number")
    .eq("id", policyId)
    .eq("broker_id", profile.id)
    .single();

  if (!policy) {
    return { success: false, error: "Policy not found" };
  }

  // Check if there's already a pending request
  const { data: existing } = await supabase
    .from("renewal_requests")
    .select("id")
    .eq("policy_id", policyId)
    .in("status", ["requested", "documents_needed", "in_progress"])
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A renewal request for this policy is already in progress" };
  }

  const { error } = await supabase.from("renewal_requests").insert({
    client_id: policy.client_id,
    broker_id: profile.id,
    policy_id: policyId,
    status: "requested",
    payment_status: "not_required",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  logActivity({
    entityType: "renewal_request",
    entityId: policyId,
    action: "requested",
    description: `Renewal request created for ${policy.policy_number}`,
    metadata: { policyId },
  });

  revalidatePath("/broker/renewals");
  revalidatePath("/broker/policies");
  return { success: true, data: undefined, message: "Renewal request created" };
}
