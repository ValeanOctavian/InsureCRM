"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { logActivity } from "@/features/activities/actions";
import type { ActionResponse } from "@/types";
import type { DocumentType, QualityStatus } from "@/types";

interface UploadDocumentInput {
  clientId: string;
  vehicleId?: string | null;
  type: DocumentType;
  fileName: string;
  fileBase64: string; // base64-encoded file data
  mimeType: string;
  qualityStatus: QualityStatus;
}

/**
 * Uploads a document file to Supabase Storage and creates a database record.
 *
 * Flow:
 * 1. Authenticate the broker
 * 2. Decode the base64 file
 * 3. Upload to Supabase Storage under broker's folder
 * 4. Create a document record in the documents table
 */
export async function uploadDocument(
  input: UploadDocumentInput
): Promise<ActionResponse<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    // Decode base64 to buffer
    const base64Data = input.fileBase64.split(",")[1] || input.fileBase64;
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique file path: broker_id/timestamp_filename
    const timestamp = Date.now();
    const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${profile.id}/${timestamp}_${safeFileName}`;

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
        client_id: input.clientId,
        vehicle_id: input.vehicleId ?? null,
        broker_id: profile.id,
        type: input.type,
        file_url: fileUrl,
        quality_status: input.qualityStatus,
        ocr_status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      // Cleanup storage if DB insert fails
      await supabase.storage.from("client-documents").remove([storagePath]);
      return { success: false, error: `Database insert failed: ${dbError.message}` };
    }

    revalidatePath("/broker/documents");
    revalidatePath("/broker/dashboard");

    // Log activity
    logActivity({
      entityType: "document",
      entityId: doc.id,
      action: "uploaded",
      description: `${input.type.replace(/_/g, " ")} document uploaded`,
      metadata: { fileName: input.fileName, mimeType: input.mimeType },
    });

    return { success: true, data: { id: doc.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}
