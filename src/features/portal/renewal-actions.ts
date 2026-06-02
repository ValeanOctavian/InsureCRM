"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/middleware";
import { computePolicyStatus } from "@/features/policies/utils";
import type { ActionResponse } from "@/types";
import type { DocumentType } from "@/types";

const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  "identity_card",
  "car_registration",
  "address_certificate",
];

const DOC_LABELS: Record<string, string> = {
  identity_card: "Identity card (Carte de Identitate)",
  car_registration: "Vehicle registration",
  car_identity_book: "Vehicle identity book",
  address_certificate: "Address certificate",
  policy: "Policy document",
  other: "Other supporting document",
};

/**
 * Returns the types of required documents that are missing or whose
 * underlying ID document is expired.
 */
async function getMissingRequiredDocuments(
  clientId: string,
  brokerId: string,
  vehicleId: string | null
): Promise<string[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Pull all of the client's documents; for "identity_card" we also check expiry.
  const { data: docs } = await supabase
    .from("documents")
    .select("type, extracted_data, created_at")
    .eq("client_id", clientId);

  const present = new Set<string>();
  for (const d of docs ?? []) {
    // Treat identity_card as valid for 5 years from creation
    if (d.type === "identity_card") {
      const createdAt = new Date(d.created_at);
      const expires = new Date(createdAt);
      expires.setFullYear(expires.getFullYear() + 5);
      if (expires.toISOString().slice(0, 10) < today) continue;
    }
    present.add(d.type);
  }

  // Only require car_registration if the policy has a vehicle
  const required = REQUIRED_DOCUMENT_TYPES.filter((t) => {
    if (t === "car_registration") return Boolean(vehicleId);
    return true;
  });

  return required.filter((t) => !present.has(t)).map((t) => DOC_LABELS[t] ?? t);
}

async function getClientAndBroker(): Promise<{ clientId: string; brokerId: string } | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, broker_id, auth_user_id")
    .eq("email", user.email)
    .maybeSingle();

  if (!client) {
    // Fall back to auth_user_id match
    const { data: client2 } = await supabase
      .from("clients")
      .select("id, broker_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!client2) return null;
    return { clientId: client2.id, brokerId: client2.broker_id };
  }

  return { clientId: client.id, brokerId: client.broker_id };
}

/**
 * One-click simple renewal.
 *
 * Returns { success: true } when the request is created.
 * Returns { success: false, code: "wizard_required", missing: [...] }
 * when the client is missing required documents; the caller must then
 * run the wizard to upload them.
 */
export async function requestRenewalSimple(
  policyId: string
): Promise<ActionResponse<{ requestId?: string }> & { code?: string; missing?: string[] }> {
  const ids = await getClientAndBroker();
  if (!ids) return { success: false, error: "Client record not found." };

  const supabase = await createClient();

  const { data: policy } = await supabase
    .from("policies")
    .select("id, vehicle_id, status, end_date")
    .eq("id", policyId)
    .eq("client_id", ids.clientId)
    .maybeSingle();

  if (!policy) return { success: false, error: "Policy not found." };

  // Guard: don't allow duplicate open renewals
  const { data: existing } = await supabase
    .from("renewal_requests")
    .select("id")
    .eq("policy_id", policyId)
    .in("status", [
      "renewal_requested",
      "waiting_for_documents",
      "waiting_for_offer",
      "offer_available",
      "waiting_for_payment",
      "requested",
      "documents_needed",
      "in_progress",
    ])
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A renewal for this policy is already in progress." };
  }

  // Eligibility check
  const missing = await getMissingRequiredDocuments(ids.clientId, ids.brokerId, policy.vehicle_id);
  if (missing.length > 0) {
    return {
      success: false,
      code: "wizard_required",
      missing,
      error: "Some required documents are missing or expired.",
    };
  }

  const { data: created, error } = await supabase
    .from("renewal_requests")
    .insert({
      client_id: ids.clientId,
      broker_id: ids.brokerId,
      policy_id: policyId,
      status: "waiting_for_offer",
      payment_status: "not_required",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Side-effects: create a task for the broker, log activity
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("first_name, last_name")
      .eq("id", ids.clientId)
      .single();

    await supabase.from("tasks").insert({
      broker_id: ids.brokerId,
      client_id: ids.clientId,
      policy_id: policyId,
      title: `New renewal request from ${client?.first_name ?? "client"} ${client?.last_name ?? ""}`.trim(),
      description: `Client submitted a renewal request. Policy status: ${policy.status}, expires ${policy.end_date}.`,
      status: "todo",
      priority: computePolicyStatus(policy.end_date) === "expired" ? "high" : "medium",
    });
  } catch {
    // Tasks are best-effort
  }

  revalidatePath("/portal");
  revalidatePath("/broker/renewals");
  revalidatePath("/broker/dashboard");

  return { success: true, data: { requestId: created.id }, message: "Renewal request sent to your broker." };
}

/**
 * Client accepts an offer. The parent renewal_request is set to
 * "waiting_for_payment" and all sibling offers are auto-rejected.
 */
export async function acceptOffer(
  offerId: string,
  renewalRequestId: string
): Promise<ActionResponse> {
  const ids = await getClientAndBroker();
  if (!ids) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  // Verify the offer belongs to a renewal_request owned by this client.
  const { data: offer } = await supabase
    .from("renewal_offers")
    .select("id, status, renewal_request_id")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer || offer.renewal_request_id !== renewalRequestId) {
    return { success: false, error: "Offer not found." };
  }

  if (offer.status !== "pending") {
    return { success: false, error: "This offer is no longer available." };
  }

  // Mark the parent request as waiting_for_payment and select this offer.
  const { error: reqErr } = await supabase
    .from("renewal_requests")
    .update({
      status: "waiting_for_payment",
      selected_offer_id: offerId,
    })
    .eq("id", renewalRequestId)
    .eq("client_id", ids.clientId);

  if (reqErr) return { success: false, error: reqErr.message };

  // Accept this offer, auto-reject siblings.
  const { error: acceptErr } = await supabase
    .from("renewal_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId);

  if (acceptErr) return { success: false, error: acceptErr.message };

  await supabase
    .from("renewal_offers")
    .update({ status: "rejected", responded_at: new Date().toISOString() })
    .eq("renewal_request_id", renewalRequestId)
    .neq("id", offerId)
    .eq("status", "pending");

  revalidatePath("/portal");
  revalidatePath("/broker/renewals");

  return { success: true, data: undefined, message: "Offer accepted." };
}

/**
 * Client rejects a single offer. Other offers are unaffected.
 */
export async function rejectOffer(
  offerId: string,
  renewalRequestId: string
): Promise<ActionResponse> {
  const ids = await getClientAndBroker();
  if (!ids) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { data: offer } = await supabase
    .from("renewal_offers")
    .select("id, status, renewal_request_id")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer || offer.renewal_request_id !== renewalRequestId) {
    return { success: false, error: "Offer not found." };
  }

  if (offer.status !== "pending") {
    return { success: false, error: "This offer is no longer available." };
  }

  const { error } = await supabase
    .from("renewal_offers")
    .update({ status: "rejected", responded_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) return { success: false, error: error.message };

  // If all offers are now rejected, revert the request to "waiting_for_offer"
  const { data: remaining } = await supabase
    .from("renewal_offers")
    .select("id")
    .eq("renewal_request_id", renewalRequestId)
    .eq("status", "pending");

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("renewal_requests")
      .update({ status: "waiting_for_offer" })
      .eq("id", renewalRequestId)
      .eq("client_id", ids.clientId);
  }

  revalidatePath("/portal");
  revalidatePath("/broker/renewals");

  return { success: true, data: undefined, message: "Offer rejected." };
}
