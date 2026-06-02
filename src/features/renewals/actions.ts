"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { logActivity } from "@/features/activities/actions";
import type { ActionResponse } from "@/types";

export interface CreateOfferInput {
  renewal_request_id: string;
  insurer_name: string;
  coverage_type: string;
  price: number;
  currency?: string;
  notes?: string;
}

/**
 * Broker creates a new offer attached to a renewal request.
 * The request status is moved to "offer_available" if it was "waiting_for_offer".
 * Multiple offers are allowed per request.
 */
export async function createOffer(
  input: CreateOfferInput
): Promise<ActionResponse<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  if (!input.insurer_name || !input.coverage_type) {
    return { success: false, error: "Insurer and coverage type are required." };
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { success: false, error: "Price must be a positive number." };
  }

  try {
    const supabase = await createClient();

    // Verify the request belongs to this broker
    const { data: req, error: reqErr } = await supabase
      .from("renewal_requests")
      .select("id, status, client_id, policy_id")
      .eq("id", input.renewal_request_id)
      .eq("broker_id", profile.id)
      .maybeSingle();

    if (reqErr || !req) {
      return { success: false, error: "Renewal request not found." };
    }

    if (req.status === "renewed" || req.status === "cancelled") {
      return {
        success: false,
        error: `Cannot add an offer to a request that is ${req.status}.`,
      };
    }

    const { data: created, error: insertErr } = await supabase
      .from("renewal_offers")
      .insert({
        renewal_request_id: input.renewal_request_id,
        broker_id: profile.id,
        insurer_name: input.insurer_name,
        coverage_type: input.coverage_type,
        price: input.price,
        currency: input.currency ?? "RON",
        notes: input.notes ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !created) {
      return { success: false, error: insertErr?.message ?? "Failed to create offer." };
    }

    // Move the parent request to "offer_available" so the client sees it.
    if (req.status === "waiting_for_offer" || req.status === "renewal_requested") {
      await supabase
        .from("renewal_requests")
        .update({ status: "offer_available" })
        .eq("id", input.renewal_request_id);
    }

    logActivity({
      entityType: "renewal_request",
      entityId: input.renewal_request_id,
      action: "created",
      description: `Offer from ${input.insurer_name} for ${input.price} ${input.currency ?? "RON"}`,
      metadata: { offerId: created.id, insurer: input.insurer_name, price: input.price },
    });

    revalidatePath(`/broker/renewals/${input.renewal_request_id}`);
    revalidatePath("/broker/renewals");
    revalidatePath("/portal");

    return { success: true, data: { id: created.id }, message: "Offer created." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create offer",
    };
  }
}

/**
 * Broker withdraws a pending offer. The parent request status rolls back
 * to "waiting_for_offer" if no other pending offers remain.
 */
export async function withdrawOffer(
  offerId: string
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();

    const { data: offer, error: offerErr } = await supabase
      .from("renewal_offers")
      .select("id, status, renewal_request_id")
      .eq("id", offerId)
      .eq("broker_id", profile.id)
      .maybeSingle();

    if (offerErr || !offer) {
      return { success: false, error: "Offer not found." };
    }
    if (offer.status !== "pending") {
      return { success: false, error: `Cannot withdraw an offer that is ${offer.status}.` };
    }

    await supabase
      .from("renewal_offers")
      .update({ status: "withdrawn", responded_at: new Date().toISOString() })
      .eq("id", offerId);

    // If all other offers are also non-pending, roll the request back.
    const { data: remaining } = await supabase
      .from("renewal_offers")
      .select("id")
      .eq("renewal_request_id", offer.renewal_request_id)
      .eq("status", "pending");

    if (!remaining || remaining.length === 0) {
      await supabase
        .from("renewal_requests")
        .update({ status: "waiting_for_offer" })
        .eq("id", offer.renewal_request_id);
    }

    revalidatePath(`/broker/renewals/${offer.renewal_request_id}`);
    revalidatePath("/broker/renewals");
    revalidatePath("/portal");

    return { success: true, data: undefined, message: "Offer withdrawn." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to withdraw offer",
    };
  }
}

/**
 * Mark the selected offer as paid. The renewal request becomes "renewed",
 * and:
 *  - For renewals (existing policy): policy.end_date is extended and status
 *    is set to "active" or "renewed" based on the new end date.
 *  - For new policies: a new policy record is created from the offer.
 *
 * If the offer has its own renewal dates stored in notes (or default = +1 year),
 * they're used to set start/end dates.
 */
export async function markOfferPaid(
  offerId: string
): Promise<ActionResponse<{ policyId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();

    const { data: offer, error: offerErr } = await supabase
      .from("renewal_offers")
      .select("id, status, renewal_request_id, price, currency, insurer_name, coverage_type")
      .eq("id", offerId)
      .eq("broker_id", profile.id)
      .maybeSingle();

    if (offerErr || !offer) {
      return { success: false, error: "Offer not found." };
    }
    if (offer.status !== "accepted") {
      return {
        success: false,
        error: `Offer must be accepted before marking as paid. Currently: ${offer.status}.`,
      };
    }

    const { data: req, error: reqErr } = await supabase
      .from("renewal_requests")
      .select("id, status, client_id, policy_id, is_new_policy, policy_type")
      .eq("id", offer.renewal_request_id)
      .eq("broker_id", profile.id)
      .maybeSingle();

    if (reqErr || !req) {
      return { success: false, error: "Renewal request not found." };
    }

    if (req.status !== "waiting_for_payment" && req.status !== "offer_available") {
      return {
        success: false,
        error: `Cannot mark as paid: request status is ${req.status}.`,
      };
    }

    const today = new Date();
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const todayIso = today.toISOString().slice(0, 10);
    const oneYearIso = oneYearLater.toISOString().slice(0, 10);

    let policyId: string | null = null;

    if (req.is_new_policy) {
      // Create a new policy record from the offer
      const { data: created, error: policyErr } = await supabase
        .from("policies")
        .insert({
          client_id: req.client_id,
          broker_id: profile.id,
          vehicle_id: null,
          type: (req.policy_type as
            | "RCA"
            | "CASCO"
            | "HOME"
            | "TRAVEL"
            | "HEALTH"
            | "OTHER") ?? "OTHER",
          insurer_name: offer.insurer_name,
          policy_number: `NEW-${Date.now()}`,
          start_date: todayIso,
          end_date: oneYearIso,
          premium_amount: offer.price,
          status: "active",
        })
        .select("id")
        .single();

      if (policyErr || !created) {
        return { success: false, error: policyErr?.message ?? "Failed to create policy." };
      }
      policyId = created.id;
    } else {
      // Renew the existing policy: extend end date, mark as active/renewed.
      if (!req.policy_id) {
        return { success: false, error: "Existing policy id missing for renewal." };
      }
      const { data: existing, error: exErr } = await supabase
        .from("policies")
        .select("id, end_date")
        .eq("id", req.policy_id)
        .maybeSingle();

      if (exErr || !existing) {
        return { success: false, error: "Existing policy not found." };
      }

      // New end date = max(today + 1y, existing end + 1y)
      const baseDate = new Date(existing.end_date);
      const candidate = new Date(baseDate);
      candidate.setFullYear(candidate.getFullYear() + 1);
      const todayPlusOne = new Date();
      todayPlusOne.setFullYear(todayPlusOne.getFullYear() + 1);
      const newEnd = candidate > todayPlusOne ? candidate : todayPlusOne;
      const newStart = new Date(newEnd);
      newStart.setFullYear(newEnd.getFullYear() - 1);

      const { error: updErr } = await supabase
        .from("policies")
        .update({
          end_date: newEnd.toISOString().slice(0, 10),
          start_date: newStart.toISOString().slice(0, 10),
          premium_amount: offer.price,
          insurer_name: offer.insurer_name,
          status: "active",
        })
        .eq("id", req.policy_id);

      if (updErr) {
        return { success: false, error: `Failed to renew policy: ${updErr.message}` };
      }
      policyId = req.policy_id;
    }

    // Mark request as renewed and link the policy
    await supabase
      .from("renewal_requests")
      .update({
        status: "renewed",
        policy_id: policyId,
        payment_status: "paid",
      })
      .eq("id", req.id);

    logActivity({
      entityType: "renewal_request",
      entityId: req.id,
      action: "renewed",
      description: `Policy renewed via offer ${offer.id}`,
      metadata: { offerId: offer.id, policyId, price: offer.price },
    });

    revalidatePath(`/broker/renewals/${req.id}`);
    revalidatePath("/broker/renewals");
    revalidatePath(`/broker/clients/${req.client_id}`);
    revalidatePath("/broker/dashboard");
    revalidatePath("/broker/policies");
    revalidatePath("/portal");

    return {
      success: true,
      data: { policyId: policyId ?? "" },
      message: "Payment recorded and policy renewed.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark as paid",
    };
  }
}

/**
 * Broker cancels a renewal request. Reverts to "cancelled".
 */
export async function cancelRenewalRequest(
  renewalRequestId: string,
  reason?: string
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("renewal_requests")
      .update({
        status: "cancelled",
        notes: reason ? `${reason}\n--- cancelled: ${new Date().toISOString()}` : undefined,
      })
      .eq("id", renewalRequestId)
      .eq("broker_id", profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Withdraw all pending offers
    await supabase
      .from("renewal_offers")
      .update({ status: "withdrawn", responded_at: new Date().toISOString() })
      .eq("renewal_request_id", renewalRequestId)
      .eq("status", "pending");

    revalidatePath(`/broker/renewals/${renewalRequestId}`);
    revalidatePath("/broker/renewals");
    revalidatePath("/portal");

    return { success: true, data: undefined, message: "Request cancelled." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel",
    };
  }
}
