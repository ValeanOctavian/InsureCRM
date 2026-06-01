"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/utils";
import type { DocumentType } from "@/types";

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

export function PortalDocumentUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocumentType>("other");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_MIME_TYPES.includes(selected.type)) {
      setError("Please upload a JPG, PNG, WebP, or PDF file.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    setError(null);
    setFile(selected);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Upload via server action
      const { uploadPortalDocument } = await import("@/features/portal/actions");
      const result = await uploadPortalDocument({
        type: docType,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      });

      if (result.success) {
        setSuccess(true);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }

    setLoading(false);
  }, [file, docType, router]);

  return (
    <div className="space-y-4">
      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Document uploaded successfully. Your broker will review it.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="portal-doc-type">Document Type</Label>
        <Select
          id="portal-doc-type"
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocumentType)}
          options={documentTypeOptions}
        />
      </div>

      {/* File dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files?.[0];
          if (droppedFile) {
            if (!ACCEPTED_MIME_TYPES.includes(droppedFile.type)) {
              setError("Please upload a JPG, PNG, WebP, or PDF file.");
              return;
            }
            if (droppedFile.size > 10 * 1024 * 1024) {
              setError("File is too large. Maximum size is 10MB.");
              return;
            }
            setError(null);
            setFile(droppedFile);
          }
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        {file ? (
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <FileText className="h-5 w-5 text-zinc-400" />
            {file.name}
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Drop a file here or click to browse
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              JPG, PNG, WebP or PDF — up to 10MB
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {file ? "Upload Document" : "Select a file first"}
          </>
        )}
      </Button>
    </div>
  );
}
