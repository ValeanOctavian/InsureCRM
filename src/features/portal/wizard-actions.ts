"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/middleware";
import { processDocument } from "@/lib/ocr";
import type { ActionResponse } from "@/types";
import type { DocumentType, PolicyType } from "@/types";
import type { OcrExtractionResult, ExtractedFields } from "@/lib/ocr";

interface UploadedDoc {
  documentId: string;
  requiredType: DocumentType;
}

export interface SubmitWizardInput {
  /** Existing policy id (renewal mode) or null (new policy mode). */
  policyId: string | null;
  isNewPolicy: boolean;
  /** New-policy details (only used when isNewPolicy=true). */
  policyType?: PolicyType;
  insurerName?: string;
  /** Final merged data from OCR + user edits + final confirmation. */
  confirmedFields: Record<string, unknown>;
  /** Documents that were uploaded during the wizard (to be linked). */
  uploadedDocuments: UploadedDoc[];
  /** Free-form user notes. */
  notes?: string;
}

async function getClientAndBroker(): Promise<{ clientId: string; brokerId: string; firstName: string; lastName: string } | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, broker_id, first_name, last_name, auth_user_id")
    .eq("email", user.email)
    .maybeSingle();

  if (!client) {
    const { data: client2 } = await supabase
      .from("clients")
      .select("id, broker_id, first_name, last_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!client2) return null;
    return {
      clientId: client2.id,
      brokerId: client2.broker_id,
      firstName: client2.first_name,
      lastName: client2.last_name,
    };
  }

  return {
    clientId: client.id,
    brokerId: client.broker_id,
    firstName: client.first_name,
    lastName: client.last_name,
  };
}

/**
 * Submit the renewal wizard. Creates a renewal_requests row in
 * "waiting_for_offer" status, links uploaded documents via
 * renewal_request_documents, and creates a broker task.
 *
 * Works for both:
 *   - Renewal mode: policyId is set, isNewPolicy=false
 *   - New policy mode: policyId is null, isNewPolicy=true (and policy_type + insurer_name provided)
 */
export async function submitRenewalWizard(
  input: SubmitWizardInput
): Promise<ActionResponse<{ requestId: string }>> {
  const ids = await getClientAndBroker();
  if (!ids) {
    return { success: false, error: "Client record not found." };
  }

  if (!ids.brokerId) {
    return { success: false, error: "You don't have an assigned broker yet. Please contact support." };
  }

  if (input.isNewPolicy && !input.policyType) {
    return { success: false, error: "Please choose a policy type." };
  }

  const supabase = await createClient();

  // Guard: duplicate open renewal for an existing policy
  if (input.policyId) {
    const { data: existing } = await supabase
      .from("renewal_requests")
      .select("id")
      .eq("policy_id", input.policyId)
      .in("status", [
        "renewal_requested",
        "waiting_for_documents",
        "waiting_for_offer",
        "offer_available",
        "waiting_for_payment",
      ])
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "A renewal for this policy is already in progress.",
      };
    }
  }

  // Create the renewal_request row
  const { data: created, error: insertError } = await supabase
    .from("renewal_requests")
    .insert({
      client_id: ids.clientId,
      broker_id: ids.brokerId,
      policy_id: input.policyId,
      status: "waiting_for_offer",
      payment_status: "not_required",
      notes: input.notes ?? null,
      confirmed_fields: input.confirmedFields,
      policy_type: input.policyType ?? null,
      insurer_name: input.insurerName ?? null,
      is_new_policy: input.isNewPolicy,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to create renewal request.",
    };
  }

  // Link uploaded documents to the renewal request
  if (input.uploadedDocuments.length > 0) {
    const links = input.uploadedDocuments.map((d) => ({
      renewal_request_id: created.id,
      document_id: d.documentId,
      required_type: d.requiredType,
    }));
    await supabase.from("renewal_request_documents").insert(links);
  }

  // Best-effort: create a task for the broker
  try {
    const titlePrefix = input.isNewPolicy
      ? `New policy request: ${input.policyType ?? ""}`
      : `Renewal request from ${ids.firstName} ${ids.lastName}`.trim();
    const descPrefix = input.isNewPolicy
      ? `Client submitted a new policy request${input.insurerName ? ` with ${input.insurerName}` : ""}.`
      : `Client submitted a renewal request via the wizard.`;

    await supabase.from("tasks").insert({
      broker_id: ids.brokerId,
      client_id: ids.clientId,
      policy_id: input.policyId,
      title: titlePrefix,
      description: descPrefix,
      status: "todo",
      priority: "high",
    });
  } catch {
    // tasks are best-effort
  }

  revalidatePath("/portal");
  revalidatePath("/broker/renewals");
  revalidatePath("/broker/dashboard");

  return {
    success: true,
    data: { requestId: created.id },
    message: input.isNewPolicy
      ? "New policy request sent to your broker."
      : "Renewal request sent to your broker.",
  };
}

/**
 * Run OCR on a document owned by the authenticated client (wizard context).
 * Stores the extracted_data on the document record and returns the result
 * for inline review in the wizard.
 */
export async function runPortalDocumentOCR(
  documentId: string
): Promise<ActionResponse<OcrExtractionResult<ExtractedFields>>> {
  const ids = await getClientAndBroker();
  if (!ids) return { success: false, error: "Not authenticated" };

  try {
    const supabase = await createClient();

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("client_id", ids.clientId)
      .maybeSingle();

    if (docError || !doc) {
      return { success: false, error: "Document not found" };
    }

    await supabase
      .from("documents")
      .update({ ocr_status: "processing" })
      .eq("id", documentId);

    const storagePath = doc.file_url.split("/storage/v1/object/public/client-documents/")[1];
    if (!storagePath) {
      return { success: false, error: "Could not resolve storage path" };
    }

    const { data: fileData, error: fileError } = await supabase.storage
      .from("client-documents")
      .download(storagePath);

    if (fileError || !fileData) {
      await supabase
        .from("documents")
        .update({ ocr_status: "failed" })
        .eq("id", documentId);
      return { success: false, error: `File download failed: ${fileError?.message}` };
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${fileData.type};base64,${buffer.toString("base64")}`;

    const result = await processDocument(base64, doc.type as DocumentType);

    await supabase
      .from("documents")
      .update({
        extracted_data: result as unknown as Record<string, unknown>,
        ocr_status: "completed",
      })
      .eq("id", documentId);

    return { success: true, data: result };
  } catch (err) {
    try {
      const supabase = await createClient();
      await supabase.from("documents").update({ ocr_status: "failed" }).eq("id", documentId);
    } catch {
      // ignore
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "OCR processing failed",
    };
  }
}
