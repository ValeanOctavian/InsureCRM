"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDocumentQualityCheck } from "@/hooks/use-document-quality-check";
import { uploadDocument } from "@/features/documents/actions";
import { DocumentPreview } from "./document-preview";
import { QualityResult } from "./quality-result";
import { OCRReview } from "./ocr-review";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { DOCUMENT_TYPES } from "@/lib/utils";
import {
  Upload,
  Camera,
  CheckCircle2,
  Loader2,
  FileText,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { DocumentType } from "@/types";

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface VehicleOption {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

interface DocumentUploadProps {
  clients: ClientOption[];
  vehicles: VehicleOption[];
}

const documentTypeOptions = Object.values(DOCUMENT_TYPES).map((t) => ({
  label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  value: t,
}));

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function DocumentUpload({ clients, vehicles }: DocumentUploadProps) {
  const router = useRouter();
  const quality = useDocumentQualityCheck();
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("none");
  const [docType, setDocType] = useState<DocumentType>("other");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // OCR review state
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [showOCRReview, setShowOCRReview] = useState(false);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        quality.setError(
          "Unsupported file type. Please upload a JPG, PNG, WebP, or PDF."
        );
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        quality.setError("File is too large. Maximum size is 10MB.");
        return;
      }

      quality.selectFile(file);
    },
    [quality]
  );

  const handleUpload = useCallback(async () => {
    if (!quality.file || !clientId) return;

    quality.setUploading();
    setUploadError(null);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(quality.file!);
      });

      const result = await uploadDocument({
        clientId,
        vehicleId: vehicleId === "none" ? null : vehicleId,
        type: docType,
        fileName: quality.file.name,
        fileBase64: base64,
        mimeType: quality.file.type,
        qualityStatus: quality.quality?.isAcceptable ? "clear" : "pending",
      });

      if (!result.success) {
        quality.setError(result.error);
        return;
      }

      if (result.data) {
        // Store the document ID and show OCR review
        setUploadedDocumentId(result.data.id);
        setShowOCRReview(true);
        quality.setDone();
        router.refresh();
      }
    } catch (err) {
      quality.setError(
        err instanceof Error ? err.message : "Upload failed"
      );
    }
  }, [quality, clientId, vehicleId, docType, router]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
          quality.setError("Unsupported file type.");
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          quality.setError("File is too large. Maximum size is 10MB.");
          return;
        }
        quality.selectFile(file);
      }
    },
    [quality]
  );

  const handleOCRComplete = useCallback(() => {
    setShowOCRReview(false);
    setUploadedDocumentId(null);
    quality.reset();
  }, [quality]);

  // ─── STEP: OCR Review (shown after successful upload) ───
  if (showOCRReview && uploadedDocumentId) {
    return (
      <div className="space-y-6">
        {/* Upload success banner */}
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
          <div className="text-sm text-green-700 dark:text-green-300">
            <span className="font-medium">Document uploaded.</span>{" "}
            AI is ready to extract data from the document.
          </div>
        </div>

        <OCRReview
          documentId={uploadedDocumentId}
          documentType={docType}
          clientId={clientId}
          onComplete={handleOCRComplete}
        />
      </div>
    );
  }

  // ─── STEP: Done (briefly shown before OCR review kicks in) ───
  if (quality.step === "done") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 px-6 py-12 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
          Document uploaded successfully
        </h3>
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">
          {quality.file?.name} has been uploaded and saved.
        </p>
        <Loader2 className="mt-4 h-5 w-5 animate-spin text-green-400" />
        <p className="mt-2 text-xs text-green-500">
          Starting AI analysis...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select client, document type, and file */}
      {quality.step === "select" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="upload-client">Client *</Label>
              <Select
                id="upload-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Select a client"
                options={clients.map((c) => ({
                  label: `${c.first_name} ${c.last_name}`,
                  value: c.id,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-type">Document Type *</Label>
              <Select
                id="upload-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                options={documentTypeOptions}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-vehicle">Vehicle (optional)</Label>
            <Select
              id="upload-vehicle"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="No vehicle (optional)"
              options={[
                { label: "No vehicle", value: "none" },
                ...vehicles.map((v) => ({
                  label: `${v.registration_number} - ${v.brand} ${v.model}`,
                  value: v.id,
                })),
              ]}
            />
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-6 py-12 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
          >
            <Upload className="mb-4 h-10 w-10 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Drop a file here or click to browse
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              JPG, PNG, WebP or PDF — up to 10MB
            </p>
            <input
              type="file"
              accept={ACCEPTED_MIME_TYPES.join(",")}
              onChange={handleFileSelect}
              className="absolute inset-0 cursor-pointer opacity-0"
              style={{ position: "absolute", inset: 0 }}
            />
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {uploadError}
            </div>
          )}
        </>
      )}

      {/* Step 2: Preview + Quality Check */}
      {(quality.step === "preview" ||
        quality.step === "checking" ||
        quality.step === "result") && (
        <>
          {/* Selection Summary */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <StatusBadge status={docType} variant="info" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {clients.find((c) => c.id === clientId)?.first_name}{" "}
              {clients.find((c) => c.id === clientId)?.last_name}
            </span>
            {vehicleId !== "none" && (
              <span className="text-sm text-zinc-500">
                ·{" "}
                {vehicles.find((v) => v.id === vehicleId)
                  ?.registration_number ?? ""}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={quality.reset}
              className="ml-auto text-xs"
            >
              Change selection
            </Button>
          </div>

          {/* Preview */}
          {quality.file && quality.previewUrl && (
            <DocumentPreview
              file={quality.file}
              previewUrl={quality.previewUrl}
            />
          )}

          {/* Quality Check Actions */}
          {quality.step === "preview" && quality.file?.type.startsWith("image/") && (
            <div className="flex justify-center">
              <Button onClick={quality.runQualityCheck} size="lg">
                <Camera className="mr-2 h-4 w-4" />
                Check Image Quality
              </Button>
            </div>
          )}

          {quality.step === "preview" && !quality.file?.type.startsWith("image/") && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  PDF files skip the quality check. The file will be uploaded
                  directly and processed server-side.
                </span>
              </div>
              <Button onClick={handleUpload} size="lg" disabled={!clientId}>
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          )}

          {/* Checking State */}
          {quality.step === "checking" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">
                Analyzing image quality...
              </p>
              <p className="text-xs text-zinc-400">
                Checking blur, brightness, and resolution
              </p>
            </div>
          )}

          {/* Quality Result */}
          {quality.step === "result" && quality.quality && (
            <div className="space-y-4">
              <QualityResult result={quality.quality} />

              {/* Error State */}
              {quality.error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {quality.error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={quality.retake}>
                  <Camera className="mr-2 h-4 w-4" />
                  Retake Photo
                </Button>

                {quality.quality.isAcceptable && (
                  <Button onClick={handleUpload} disabled={!clientId}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Process
                  </Button>
                )}

                {!quality.quality.isAcceptable && (
                  <Button
                    variant="secondary"
                    onClick={handleUpload}
                    disabled={!clientId}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Upload Anyway
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 3: Uploading */}
      {quality.step === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Uploading document...
          </p>
          <p className="text-xs text-zinc-400">
            Saving to secure storage
          </p>
        </div>
      )}

      {/* Error State */}
      {quality.step === "error" && quality.error && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Upload failed</p>
              <p className="mt-1">{quality.error}</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={quality.retake}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
