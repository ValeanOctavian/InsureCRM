"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/middleware";
import { signOut as authSignOut } from "@/lib/auth/actions";
import type { ActionResponse } from "@/types";
import type { DocumentType, QualityStatus } from "@/types";

/**
 * Get the authenticated client's ID and broker_id by matching email with the clients table.
 */
async function getClientWithBroker(): Promise<{ id: string; broker_id: string | null } | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, broker_id")
    .eq("email", user.email)
    .single();

  return client;
}

/**
 * Update the client's contact details (phone, address, city, county).
 */
export async function updateContactDetails(
  input: Partial<{
    phone: string;
    address: string;
    city: string;
    county: string;
  }>
): Promise<ActionResponse> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { error } = await supabase
      .from("clients")
      .update({
        phone: input.phone ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        county: input.county ?? null,
      })
      .eq("email", user.email);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/portal");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update contact details",
    };
  }
}

/**
 * Request renewal for a specific policy.
 */
export async function requestRenewal(policyId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const client = await getClientWithBroker();
    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Check if there's already a pending request for this policy
    const { data: existing } = await supabase
      .from("renewal_requests")
      .select("id")
      .eq("policy_id", policyId)
      .in("status", ["requested", "documents_needed", "in_progress"])
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "A renewal request for this policy is already in progress.",
      };
    }

    const { error } = await supabase.from("renewal_requests").insert({
      client_id: client.id,
      broker_id: client.broker_id,
      policy_id: policyId,
      status: "requested",
      payment_status: "not_required",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/portal/renew");
    revalidatePath("/portal");
    return { success: true, data: undefined, message: "Renewal request submitted successfully." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to request renewal",
    };
  }
}

/**
 * Upload a document from the client portal.
 * Links the document to the authenticated client and their broker.
 */
export async function uploadPortalDocument(input: {
  type: DocumentType;
  fileName: string;
  fileBase64: string;
  mimeType: string;
}): Promise<ActionResponse<{ id: string }>> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const client = await getClientWithBroker();
    if (!client) {
      return { success: false, error: "Client record not found. Contact your broker." };
    }

    // Decode base64 to buffer
    const base64Data = input.fileBase64.split(",")[1] || input.fileBase64;
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique file path
    const timestamp = Date.now();
    const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${client.broker_id ?? "unknown"}/${timestamp}_${safeFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(storagePath, buffer, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("client-documents")
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl ?? "";

    // Create document record
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        client_id: client.id,
        broker_id: client.broker_id,
        type: input.type,
        file_url: fileUrl,
        quality_status: "pending",
        ocr_status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      await supabase.storage.from("client-documents").remove([storagePath]);
      return { success: false, error: `Database insert failed: ${dbError.message}` };
    }

    revalidatePath("/portal/documents");
    return { success: true, data: { id: doc.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await authSignOut();
}
