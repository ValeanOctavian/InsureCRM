"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { logActivity } from "@/features/activities/actions";
import { processDocument } from "@/lib/ocr";
import { computePolicyStatus } from "@/features/policies/utils";
import type { ActionResponse } from "@/types";
import type { DocumentType, PolicyType } from "@/types";
import type {
  IdentityCardFields,
  CarRegistrationFields,
  PolicyDocumentFields,
  OcrExtractionResult,
  ExtractedFields,
} from "@/lib/ocr";

/**
 * Process a document through the OCR pipeline.
 *
 * Flow:
 * 1. Load the document from the database
 * 2. Fetch the file from Supabase Storage
 * 3. Run OCR extraction (mock or real provider)
 * 4. Store extracted_data in the document record
 * 5. Return the extraction result for client-side review
 */
export async function processDocumentOCR(
  documentId: string
): Promise<ActionResponse<OcrExtractionResult<ExtractedFields>>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    // Load document from DB
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("broker_id", profile.id)
      .single();

    if (docError || !doc) {
      return { success: false, error: "Document not found" };
    }

    // Mark as processing
    await supabase
      .from("documents")
      .update({ ocr_status: "processing" })
      .eq("id", documentId);

    // Fetch the file from storage
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

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${fileData.type};base64,${buffer.toString("base64")}`;

    // Run OCR pipeline
    const result = await processDocument(base64, doc.type as DocumentType);

    // Store extracted data in the document record
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        extracted_data: result as unknown as Record<string, unknown>,
        ocr_status: "completed",
      })
      .eq("id", documentId);

    if (updateError) {
      return { success: false, error: `Failed to save OCR result: ${updateError.message}` };
    }

    // Log activity
    logActivity({
      entityType: "document",
      entityId: documentId,
      action: "checked",
      description: `OCR completed for ${doc.type.replace(/_/g, " ")} document`,
      metadata: { documentType: doc.type },
    });

    revalidatePath("/broker/documents");

    return { success: true, data: result };
  } catch (err) {
    // Mark as failed
    try {
      const supabase = await createClient();
      await supabase
        .from("documents")
        .update({ ocr_status: "failed" })
        .eq("id", documentId);
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : "OCR processing failed",
    };
  }
}

/**
 * Save confirmed OCR-extracted data to the appropriate database tables.
 *
 * Based on document type:
 * - identity_card   → creates/updates a client
 * - car_registration → creates/updates a vehicle
 * - policy           → creates a policy
 *
 * Also updates the document's ocr_status to "completed".
 */
export async function saveExtractedData(
  documentId: string,
  documentType: DocumentType,
  fields: ExtractedFields
): Promise<ActionResponse<{ recordId: string; table: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    // Load the document to get client_id and vehicle_id
    const { data: doc } = await supabase
      .from("documents")
      .select("client_id, vehicle_id")
      .eq("id", documentId)
      .eq("broker_id", profile.id)
      .single();

    if (!doc) {
      return { success: false, error: "Document not found" };
    }

    switch (documentType) {
      case "identity_card": {
        const idFields = fields as IdentityCardFields;

        // Update the existing client with identity card data
        const { data: updated, error: updateErr } = await supabase
          .from("clients")
          .update({
            first_name: idFields.first_name,
            last_name: idFields.last_name,
            cnp: idFields.cnp || null,
            address: idFields.address || null,
          })
          .eq("id", doc.client_id)
          .eq("broker_id", profile.id)
          .select("id")
          .single();

        if (updateErr) {
          return { success: false, error: `Failed to update client: ${updateErr.message}` };
        }

        revalidatePath("/broker/clients");
        revalidatePath(`/broker/clients/${doc.client_id}`);
        revalidatePath("/broker/dashboard");

        return { success: true, data: { recordId: updated.id, table: "clients" } };
      }

      case "car_registration":
      case "car_identity_book": {
        const carFields = fields as CarRegistrationFields;

        const { data: vehicle, error: vehicleErr } = await supabase
          .from("vehicles")
          .insert({
            client_id: doc.client_id,
            broker_id: profile.id,
            registration_number: carFields.registration_number,
            vin: carFields.vin || null,
            brand: carFields.brand,
            model: carFields.model,
            year: carFields.year,
            engine_capacity: carFields.engine_capacity || null,
            fuel_type: carFields.fuel_type || null,
          })
          .select("id")
          .single();

        if (vehicleErr) {
          return { success: false, error: `Failed to create vehicle: ${vehicleErr.message}` };
        }

        // Update the document to link it to the new vehicle
        await supabase
          .from("documents")
          .update({ vehicle_id: vehicle.id })
          .eq("id", documentId);

        revalidatePath("/broker/vehicles");
        revalidatePath(`/broker/clients/${doc.client_id}`);
        revalidatePath("/broker/dashboard");

        return { success: true, data: { recordId: vehicle.id, table: "vehicles" } };
      }

      case "policy": {
        const policyFields = fields as PolicyDocumentFields;

        // Validate policy type
        const validTypes: PolicyType[] = ["RCA", "CASCO", "HOME", "TRAVEL", "HEALTH", "OTHER"];
        const policyType: PolicyType = validTypes.includes(policyFields.policy_type as PolicyType)
          ? (policyFields.policy_type as PolicyType)
          : "OTHER";

        const endDate = policyFields.end_date;
        const status = computePolicyStatus(endDate);

        const { data: policy, error: policyErr } = await supabase
          .from("policies")
          .insert({
            client_id: doc.client_id,
            vehicle_id: doc.vehicle_id,
            broker_id: profile.id,
            type: policyType,
            insurer_name: policyFields.insurer_name,
            policy_number: policyFields.policy_number,
            start_date: policyFields.start_date,
            end_date: endDate,
            premium_amount: policyFields.premium_amount,
            status,
          })
          .select("id")
          .single();

        if (policyErr) {
          return { success: false, error: `Failed to create policy: ${policyErr.message}` };
        }

        revalidatePath("/broker/policies");
        revalidatePath(`/broker/clients/${doc.client_id}`);

        return { success: true, data: { recordId: policy.id, table: "policies" } };
      }

      default:
        return { success: false, error: `Unsupported document type: ${documentType}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save extracted data",
    };
  }
}

/**
 * Mark a document's OCR as skipped (user chose not to save).
 */
export async function skipOCRReview(documentId: string): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();
    await supabase
      .from("documents")
      .update({ ocr_status: "completed" })
      .eq("id", documentId)
      .eq("broker_id", profile.id);

    revalidatePath("/broker/documents");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to skip OCR review",
    };
  }
}
