"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  processDocumentOCR,
  saveExtractedData,
  skipOCRReview,
} from "@/features/documents/ocr-actions";
import { getFieldsForDocumentType } from "@/lib/ocr";
import type {
  OcrExtractionResult,
  ExtractedFields,
  FieldDefinition,
} from "@/lib/ocr";
import type { DocumentType } from "@/types";
import {
  Brain,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  SkipForward,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface OCRReviewProps {
  documentId: string;
  documentType: DocumentType;
  clientId: string;
  onComplete: () => void;
}

export function OCRReview({
  documentId,
  documentType,
  clientId,
  onComplete,
}: OCRReviewProps) {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "review" | "saving" | "done" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [extraction, setExtraction] = useState<OcrExtractionResult<ExtractedFields> | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fieldDefinitions = getFieldsForDocumentType(documentType);

  // Document types that can be saved to database tables
  const SAVABLE_DOCUMENT_TYPES: DocumentType[] = [
    "identity_card",
    "car_registration",
    "car_identity_book",
    "policy",
  ];
  const canSave = SAVABLE_DOCUMENT_TYPES.includes(documentType);

  // Load OCR data on mount
  useEffect(() => {
    async function load() {
      try {
        setStep("loading");
        const result = await processDocumentOCR(documentId);

        if (!result.success) {
          setError(result.error);
          setStep("error");
          return;
        }

        if (!result.data) {
          setError("Failed to process document");
          setStep("error");
          return;
        }

        setExtraction(result.data);

        // Initialize editable fields from extraction result
        const initialFields: Record<string, string> = {};
        const extracted = result.data.fields as unknown as Record<string, unknown>;

        for (const def of fieldDefinitions) {
          const value = extracted[def.name];
          initialFields[def.name] = value !== undefined && value !== null ? String(value) : "";
        }

        setFields(initialFields);
        setStep("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process document");
        setStep("error");
      }
    }

    load();
  }, [documentId, fieldDefinitions, retryCount]);

  function updateField(name: string, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  // Get confidence for a specific field
  function getFieldConfidence(name: string): number | null {
    if (!extraction?.fieldConfidence) return null;
    return (extraction.fieldConfidence as Record<string, number>)[name] ?? null;
  }

  function getConfidenceColor(confidence: number | null): string {
    if (confidence === null) return "bg-zinc-200 dark:bg-zinc-700";
    if (confidence >= 0.9) return "bg-green-500";
    if (confidence >= 0.7) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getConfidenceLabel(confidence: number | null): string {
    if (confidence === null) return "N/A";
    if (confidence >= 0.9) return "High";
    if (confidence >= 0.7) return "Medium";
    return "Low";
  }

  async function handleSave() {
    try {
      setStep("saving");
      setError(null);

      // Convert string fields back to proper types
      const typedFields: Record<string, unknown> = { ...fields };

      // Parse numeric fields based on field definitions
      for (const def of fieldDefinitions) {
        if (def.type === "number" && typedFields[def.name]) {
          typedFields[def.name] = Number(typedFields[def.name]);
        }
      }

      const result = await saveExtractedData(
        documentId,
        documentType,
        typedFields as unknown as ExtractedFields
      );

      if (!result.success) {
        setError(result.error);
        setStep("review");
        return;
      }

      setSuccessMessage(
        `Data saved to ${result.data!.table}. A new record was created or updated.`
      );
      setStep("done");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save data");
      setStep("review");
    }
  }

  async function handleSkip() {
    try {
      await skipOCRReview(documentId);
      onComplete();
      router.refresh();
    } catch {
      setError("Failed to skip OCR review");
    }
  }

  // ─── Loading State ───
  if (step === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <Brain className="h-10 w-10 animate-pulse text-violet-500" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Analyzing document with AI...
        </p>
        <p className="text-xs text-zinc-400">
          Extracting fields using OCR
        </p>
        <div className="mt-2 h-1.5 w-48 animate-pulse overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (step === "error") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">OCR processing failed</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {error || "An unexpected error occurred while processing the document."}
            </p>
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onComplete}>
            Continue without OCR
          </Button>
          <Button
            onClick={() => {
              setStep("loading");
              setError(null);
              setRetryCount((c) => c + 1);
            }}
          >
            Retry OCR
          </Button>
        </div>
      </div>
    );
  }

  // ─── Done State ───
  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 px-6 py-12 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
          Data saved successfully
        </h3>
        <p className="mt-1 text-center text-sm text-green-600 dark:text-green-400">
          {successMessage || "The extracted data has been saved to the database."}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={onComplete}
        >
          Continue
        </Button>
      </div>
    );
  }

  // ─── Saving State ───
  if (step === "saving") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Saving extracted data...
        </p>
      </div>
    );
  }

  // ─── Review State ───
  const overallConfidence = extraction?.confidence ?? 0;
  const confidenceColor =
    overallConfidence >= 0.9 ? "green" : overallConfidence >= 0.7 ? "yellow" : "red";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-300" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              AI Extraction Results
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Review and confirm the extracted data before saving
            </p>
          </div>
        </div>
        <Badge
          variant={
            confidenceColor === "green"
              ? "success"
              : confidenceColor === "yellow"
                ? "warning"
                : "destructive"
          }
          className="flex items-center gap-1.5"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              confidenceColor === "green"
                ? "bg-green-500"
                : confidenceColor === "yellow"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          {Math.round(overallConfidence * 100)}% confidence
        </Badge>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Overall accuracy</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {getConfidenceLabel(overallConfidence)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              confidenceColor === "green"
                ? "bg-green-500"
                : confidenceColor === "yellow"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${Math.round(overallConfidence * 100)}%` }}
          />
        </div>
      </div>

      {/* Extracted Fields */}
      <Card>
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-zinc-400" />
            Extracted Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fieldDefinitions.map((def) => {
              const confidence = getFieldConfidence(def.name);
              const value = fields[def.name] ?? "";

              return (
                <div key={def.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`ocr-${def.name}`}
                      className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {def.label}
                      {def.required && (
                        <span className="ml-0.5 text-red-500">*</span>
                      )}
                    </Label>
                    {confidence !== null && (
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${getConfidenceColor(confidence)}`}
                        />
                        <span className="text-[10px] text-zinc-400">
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id={`ocr-${def.name}`}
                      type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                      value={value}
                      onChange={(e) => updateField(def.name, e.target.value)}
                      className={
                        confidence !== null && confidence < 0.7 && value
                          ? "border-yellow-300 focus-visible:ring-yellow-400 dark:border-yellow-700"
                          : ""
                      }
                      placeholder={def.label}
                    />
                    {confidence !== null && confidence < 0.7 && value && (
                      <AlertTriangle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={handleSkip}>
          <SkipForward className="mr-2 h-4 w-4" />
          {canSave ? "Skip &amp; Keep as Document" : "Done — Keep as Document"}
        </Button>
        {canSave && (
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save &amp; Create Record
          </Button>
        )}
      </div>
    </div>
  );
}
