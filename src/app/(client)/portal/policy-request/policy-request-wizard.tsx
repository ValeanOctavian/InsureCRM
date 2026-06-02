"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Upload,
  FileText,
  Camera,
  Brain,
  AlertTriangle,
  XCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentQualityCheck } from "@/hooks/use-document-quality-check";
import { DocumentPreview } from "@/components/documents/document-preview";
import { QualityResult } from "@/components/documents/quality-result";
import {
  uploadPortalDocument,
} from "@/features/portal/actions";
import {
  runPortalDocumentOCR,
  submitRenewalWizard,
} from "@/features/portal/wizard-actions";
import { POLICY_TYPES, DOCUMENT_TYPES, ROUTES } from "@/lib/utils";
import type { PolicyType, DocumentType } from "@/types";
import type { OcrExtractionResult, ExtractedFields } from "@/lib/ocr";

interface PolicySummary {
  id: string;
  insurer_name: string;
  policy_number: string;
  type: PolicyType;
  end_date: string;
  vehicle: { registration_number: string; brand: string; model: string } | null;
}

interface PolicyRequestWizardProps {
  policy: PolicySummary | null;
  wizardMode: boolean;
  firstName: string;
}

type WizardStep = "confirm" | "upload" | "quality" | "ocr" | "review" | "submitting" | "done";

type SubStepStatus = "pending" | "uploading" | "ocr_running" | "completed" | "error";

interface RequiredDocState {
  requiredType: DocumentType;
  label: string;
  file: File | null;
  previewUrl: string | null;
  documentId: string | null;
  ocrResult: OcrExtractionResult<ExtractedFields> | null;
  status: SubStepStatus;
  error: string | null;
}

const REQUIRED_DOC_LABELS: Record<DocumentType, string> = {
  identity_card: "Identity card (Carte de Identitate)",
  car_registration: "Vehicle registration",
  car_identity_book: "Vehicle identity book",
  address_certificate: "Address certificate",
  policy: "Existing policy",
  other: "Other supporting document",
};

function buildRequiredDocs(includeCarRegistration: boolean): DocumentType[] {
  const docs: DocumentType[] = [DOCUMENT_TYPES.IDENTITY_CARD, DOCUMENT_TYPES.ADDRESS_CERTIFICATE];
  if (includeCarRegistration) docs.push(DOCUMENT_TYPES.CAR_REGISTRATION);
  return docs;
}

function initialDocStates(types: DocumentType[]): RequiredDocState[] {
  return types.map((t) => ({
    requiredType: t,
    label: REQUIRED_DOC_LABELS[t],
    file: null,
    previewUrl: null,
    documentId: null,
    ocrResult: null,
    status: "pending" as SubStepStatus,
    error: null,
  }));
}

function flattenOcrFields(ocr: OcrExtractionResult<ExtractedFields> | null): Record<string, string> {
  if (!ocr) return {};
  const out: Record<string, string> = {};
  const fields = ocr.fields as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined) out[k] = String(v);
  }
  return out;
}

export function PolicyRequestWizard({ policy, wizardMode, firstName }: PolicyRequestWizardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isRenewal = Boolean(policy);
  const includeCarRegistration = isRenewal ? Boolean(policy?.vehicle) : true;
  const requiredTypes = buildRequiredDocs(includeCarRegistration);

  const [step, setStep] = useState<WizardStep>("confirm");
  const [docStates, setDocStates] = useState<RequiredDocState[]>(() => initialDocStates(requiredTypes));
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [policyType, setPolicyType] = useState<PolicyType>(policy?.type ?? POLICY_TYPES.RCA);
  const [insurerName, setInsurerName] = useState(policy?.insurer_name ?? "");
  const [confirmedFields, setConfirmedFields] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeDoc = docStates[activeDocIndex];

  // ─── Step navigation helpers ──────────────────────────────────────────────

  const goToUpload = () => {
    setDocStates((prev) => prev.map((d) => ({ ...d, status: d.documentId ? "completed" : "pending" })));
    setActiveDocIndex(0);
    setStep("upload");
  };

  const goToOcr = () => {
    setActiveDocIndex(0);
    setStep("ocr");
  };

  const goToReview = useCallback(() => {
    // Merge all OCR fields into confirmedFields
    const merged: Record<string, string> = {};
    for (const d of docStates) {
      Object.assign(merged, flattenOcrFields(d.ocrResult));
    }
    setConfirmedFields(merged);
    setStep("review");
  }, [docStates]);

  // ─── Per-doc state setters ────────────────────────────────────────────────

  const updateActiveDoc = (patch: Partial<RequiredDocState>) => {
    setDocStates((prev) => prev.map((d, i) => (i === activeDocIndex ? { ...d, ...patch } : d)));
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!confirmationChecked) return;
    setSubmitError(null);
    setStep("submitting");

    const result = await submitRenewalWizard({
      policyId: policy?.id ?? null,
      isNewPolicy: !isRenewal,
      policyType: !isRenewal ? policyType : undefined,
      insurerName: !isRenewal ? insurerName : policy?.insurer_name,
      confirmedFields,
      uploadedDocuments: docStates
        .filter((d) => d.documentId)
        .map((d) => ({ documentId: d.documentId!, requiredType: d.requiredType })),
      notes: notes || undefined,
    });

    if (!result.success) {
      setSubmitError(result.error);
      setStep("review");
      return;
    }

    setStep("done");
    startTransition(() => router.refresh());
  };

  // ─── Renders ─────────────────────────────────────────────────────────────

  const stepOrder: WizardStep[] = ["confirm", "upload", "quality", "ocr", "review"];
  const stepIndex = stepOrder.indexOf(step);
  const totalSteps = stepOrder.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.CLIENT.PORTAL)}
          className="mb-2 gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {isRenewal ? "Renew your policy" : "Request a new policy"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isRenewal
            ? wizardMode
              ? "We need a few updated documents to complete your renewal."
              : "Walk through the renewal steps below."
            : `Hi ${firstName}, follow the steps below to request a brand new policy.`}
        </p>
      </div>

      {/* Stepper */}
      {step !== "done" && step !== "submitting" && (
        <WizardStepper current={stepIndex >= 0 ? stepIndex : 0} total={totalSteps} />
      )}

      {step === "confirm" && (
        <ConfirmStep
          isRenewal={isRenewal}
          policy={policy}
          policyType={policyType}
          setPolicyType={setPolicyType}
          insurerName={insurerName}
          setInsurerName={setInsurerName}
          onContinue={goToUpload}
        />
      )}

      {step === "upload" && activeDoc && (
        <UploadStep
          doc={activeDoc}
          index={activeDocIndex}
          total={docStates.length}
          onFileSelected={(file) => {
            const previewUrl = URL.createObjectURL(file);
            updateActiveDoc({ file, previewUrl, status: "pending", error: null });
            setStep("quality");
          }}
          onSkip={() => {
            // mark as "pending" but go to next
            const nextIndex = activeDocIndex + 1;
            if (nextIndex < docStates.length) {
              setActiveDocIndex(nextIndex);
            } else {
              goToOcr();
            }
          }}
          onBack={() => {
            if (activeDocIndex === 0) setStep("confirm");
            else setActiveDocIndex(activeDocIndex - 1);
          }}
        />
      )}

      {step === "quality" && activeDoc && activeDoc.file && (
        <QualityStep
          doc={activeDoc}
          index={activeDocIndex}
          total={docStates.length}
          onAccept={async () => {
            const file = activeDoc.file;
            if (!file) {
              updateActiveDoc({ status: "error", error: "Missing file" });
              return;
            }
            // Upload the document
            updateActiveDoc({ status: "uploading", error: null });
            try {
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("Failed to read file"));
                reader.readAsDataURL(file);
              });
              const result = await uploadPortalDocument({
                type: activeDoc.requiredType,
                fileName: file.name,
                fileBase64: base64,
                mimeType: file.type,
              });
              if (!result.success) {
                updateActiveDoc({ status: "error", error: result.error });
                return;
              }
              if (!result.data) {
                updateActiveDoc({ status: "error", error: "Upload returned no document id" });
                return;
              }
              updateActiveDoc({ documentId: result.data.id, status: "completed" });
              // Move to next doc or to OCR step
              const nextIndex = activeDocIndex + 1;
              if (nextIndex < docStates.length) {
                setActiveDocIndex(nextIndex);
                setStep("upload");
              } else {
                goToOcr();
              }
            } catch (err) {
              updateActiveDoc({
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              });
            }
          }}
          onRetake={() => {
            if (activeDoc.previewUrl) URL.revokeObjectURL(activeDoc.previewUrl);
            updateActiveDoc({ file: null, previewUrl: null, status: "pending" });
            setStep("upload");
          }}
          onBack={() => {
            if (activeDoc.previewUrl) URL.revokeObjectURL(activeDoc.previewUrl);
            updateActiveDoc({ file: null, previewUrl: null, status: "pending" });
            setActiveDocIndex(Math.max(0, activeDocIndex - 1));
            setStep("upload");
          }}
        />
      )}

      {step === "ocr" && activeDoc && (
        <OcrStep
          doc={activeDoc}
          index={activeDocIndex}
          total={docStates.length}
          onRun={async () => {
            if (!activeDoc.documentId) return;
            updateActiveDoc({ status: "ocr_running", error: null });
            const result = await runPortalDocumentOCR(activeDoc.documentId);
            if (!result.success) {
              updateActiveDoc({ status: "error", error: result.error });
              return;
            }
            if (!result.data) {
              updateActiveDoc({ status: "error", error: "OCR returned no data" });
              return;
            }
            updateActiveDoc({ ocrResult: result.data, status: "completed" });
          }}
          onSkip={() => {
            // Mark completed without OCR
            updateActiveDoc({ status: "completed" });
            const nextIndex = activeDocIndex + 1;
            if (nextIndex < docStates.length) {
              setActiveDocIndex(nextIndex);
            } else {
              goToReview();
            }
          }}
          onNext={() => {
            const nextIndex = activeDocIndex + 1;
            if (nextIndex < docStates.length) {
              setActiveDocIndex(nextIndex);
            } else {
              goToReview();
            }
          }}
          onBack={() => {
            const prevIndex = Math.max(0, activeDocIndex - 1);
            setActiveDocIndex(prevIndex);
            // If the previous doc is not yet uploaded, jump to its quality step
            const prevDoc = docStates[prevIndex];
            if (!prevDoc.documentId) {
              setStep("upload");
            } else {
              setStep("ocr");
            }
          }}
        />
      )}

      {step === "review" && (
        <ReviewStep
          isRenewal={isRenewal}
          policy={policy}
          confirmedFields={confirmedFields}
          setConfirmedFields={setConfirmedFields}
          notes={notes}
          setNotes={setNotes}
          confirmationChecked={confirmationChecked}
          setConfirmationChecked={setConfirmationChecked}
          onBack={() => {
            setActiveDocIndex(docStates.length - 1);
            setStep("ocr");
          }}
          onSubmit={handleSubmit}
          submitError={submitError}
        />
      )}

      {step === "submitting" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-12 dark:border-zinc-800 dark:bg-zinc-950">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Submitting your request...
          </p>
        </div>
      )}

      {step === "done" && (
        <DoneStep
          isRenewal={isRenewal}
          onDone={() => {
            startTransition(() => router.push(ROUTES.CLIENT.PORTAL));
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function WizardStepper({ current }: { current: number; total: number }) {
  const labels = ["Confirm", "Upload", "Quality", "OCR", "Review"];
  return (
    <ol className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {labels.map((label, i) => {
        const isCurrent = i === current;
        const isDone = i < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                isCurrent
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : isDone
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                isCurrent
                  ? "text-zinc-900 dark:text-zinc-50"
                  : isDone
                    ? "text-green-700 dark:text-green-300"
                    : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <ArrowRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ConfirmStep({
  isRenewal,
  policy,
  policyType,
  setPolicyType,
  insurerName,
  setInsurerName,
  onContinue,
}: {
  isRenewal: boolean;
  policy: PolicySummary | null;
  policyType: PolicyType;
  setPolicyType: (t: PolicyType) => void;
  insurerName: string;
  setInsurerName: (s: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {isRenewal ? "Policy to renew" : "What kind of policy?"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isRenewal
            ? "We'll collect updated documents to renew this policy."
            : "Choose the type of coverage you need."}
        </p>
      </div>

      {isRenewal && policy && (
        <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Insurer</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {policy.insurer_name}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Policy #</p>
            <p className="mt-0.5 font-mono text-sm text-zinc-900 dark:text-zinc-50">
              {policy.policy_number}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Type</p>
            <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-50">{policy.type}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Expires</p>
            <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-50">
              {new Date(policy.end_date).toLocaleDateString()}
            </p>
          </div>
          {policy.vehicle && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Vehicle</p>
              <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-50">
                {policy.vehicle.registration_number} · {policy.vehicle.brand} {policy.vehicle.model}
              </p>
            </div>
          )}
        </div>
      )}

      {!isRenewal && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="wizard-policy-type">Policy type</Label>
            <Select
              id="wizard-policy-type"
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value as PolicyType)}
              options={[
                { label: "RCA (mandatory auto)", value: POLICY_TYPES.RCA },
                { label: "CASCO (comprehensive auto)", value: POLICY_TYPES.CASCO },
                { label: "Home", value: POLICY_TYPES.HOME },
                { label: "Travel", value: POLICY_TYPES.TRAVEL },
                { label: "Health", value: POLICY_TYPES.HEALTH },
                { label: "Other", value: POLICY_TYPES.OTHER },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-insurer">Preferred insurer (optional)</Label>
            <Input
              id="wizard-insurer"
              value={insurerName}
              onChange={(e) => setInsurerName(e.target.value)}
              placeholder="e.g. Allianz, Groupama"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onContinue}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UploadStep({
  doc,
  index,
  total,
  onFileSelected,
  onSkip,
  onBack,
}: {
  doc: RequiredDocState;
  index: number;
  total: number;
  onFileSelected: (file: File) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Document {index + 1} of {total}
          </p>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Upload: {doc.label}
          </h2>
        </div>
        {doc.status === "completed" && (
          <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" /> Uploaded
          </span>
        )}
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onFileSelected(f);
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-6 py-10 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        <Upload className="mb-3 h-8 w-8 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Drop file here or click to browse
        </p>
        <p className="mt-1 text-xs text-zinc-500">JPG, PNG, WebP or PDF — up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
          }}
          className="hidden"
        />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {doc.requiredType !== DOCUMENT_TYPES.IDENTITY_CARD && (
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QualityStep({
  doc,
  index,
  total,
  onAccept,
  onRetake,
  onBack,
}: {
  doc: RequiredDocState;
  index: number;
  total: number;
  onAccept: (qualityStatus: "clear" | "pending") => void;
  onRetake: () => void;
  onBack: () => void;
}) {
  const quality = useDocumentQualityCheck();

  // Initialize the hook with our file on mount
  useState(() => {
    if (doc.file) quality.selectFile(doc.file);
    return null;
  });

  const isPdf = doc.file?.type === "application/pdf";

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Document {index + 1} of {total}
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Quality check: {doc.label}
        </h2>
      </div>

      {doc.file && doc.previewUrl && (
        <DocumentPreview file={doc.file} previewUrl={doc.previewUrl} />
      )}

      {isPdf ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>PDF files skip the quality check and go directly to upload.</span>
          </div>
          <Button
            onClick={() => onAccept("pending")}
            disabled={doc.status === "uploading"}
          >
            {doc.status === "uploading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Upload PDF
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          {quality.step === "preview" && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing quality check…
              </div>
            </div>
          )}
 
          {quality.step === "checking" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">Analyzing image quality...</p>
            </div>
          )}

          {quality.step === "result" && quality.quality && (
            <div className="space-y-4">
              <QualityResult result={quality.quality} />
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={onRetake}>
                  <Camera className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                {quality.quality.isAcceptable ? (
                  <Button
                    onClick={() => {
                      onAccept("clear");
                    }}
                    disabled={doc.status === "uploading"}
                  >
                    {doc.status === "uploading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" /> Upload &amp; continue
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onAccept("pending");
                    }}
                    disabled={doc.status === "uploading"}
                  >
                    {doc.status === "uploading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" /> Upload anyway
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {quality.error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {quality.error}
            </div>
          )}
        </>
      )}

      {doc.status === "error" && doc.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {doc.error}
        </div>
      )}

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} disabled={doc.status === "uploading"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

function OcrStep({
  doc,
  index,
  total,
  onRun,
  onSkip,
  onNext,
  onBack,
}: {
  doc: RequiredDocState;
  index: number;
  total: number;
  onRun: () => Promise<void>;
  onSkip: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [running, setRunning] = useState(false);
  const handleRun = async () => {
    setRunning(true);
    await onRun();
    setRunning(false);
  };

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Document {index + 1} of {total}
        </p>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          AI extraction: {doc.label}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Run AI to extract structured data from this document. You can review and edit the
          results in the next step.
        </p>
      </div>

      {doc.status === "ocr_running" || running ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-zinc-50 px-6 py-10 dark:bg-zinc-900">
          <Brain className="h-8 w-8 animate-pulse text-violet-500" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Extracting fields with AI...
          </p>
          <p className="text-xs text-zinc-400">This usually takes a few seconds.</p>
        </div>
      ) : doc.ocrResult ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Extracted {Object.keys(flattenOcrFields(doc.ocrResult)).length} fields at
            {" "}
            {Math.round((doc.ocrResult.confidence ?? 0) * 100)}% confidence.
          </div>
          <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {JSON.stringify(flattenOcrFields(doc.ocrResult), null, 2)}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-zinc-50 px-6 py-10 dark:bg-zinc-900">
          <Brain className="h-8 w-8 text-violet-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Ready to extract data</p>
        </div>
      )}

      {doc.status === "error" && doc.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {doc.error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {!doc.ocrResult && (
            <Button variant="outline" onClick={onSkip}>
              Skip OCR
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {!doc.ocrResult ? (
            <Button onClick={handleRun} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" /> Run AI extraction
                </>
              )}
            </Button>
          ) : (
            <Button onClick={onNext}>
              {index < total - 1 ? "Next document" : "Review & confirm"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  isRenewal,
  policy,
  confirmedFields,
  setConfirmedFields,
  notes,
  setNotes,
  confirmationChecked,
  setConfirmationChecked,
  onBack,
  onSubmit,
  submitError,
}: {
  isRenewal: boolean;
  policy: PolicySummary | null;
  confirmedFields: Record<string, string>;
  setConfirmedFields: (f: Record<string, string>) => void;
  notes: string;
  setNotes: (s: string) => void;
  confirmationChecked: boolean;
  setConfirmationChecked: (b: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitError: string | null;
}) {
  const fieldEntries = Object.entries(confirmedFields);
  const updateField = (name: string, value: string) => {
    setConfirmedFields({ ...confirmedFields, [name]: value });
  };
  const removeField = (name: string) => {
    const next = { ...confirmedFields };
    delete next[name];
    setConfirmedFields(next);
  };

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Review &amp; confirm
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Edit any field below, then confirm to send the request to your broker.
        </p>
      </div>

      {isRenewal && policy && (
        <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500">For: </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {policy.insurer_name} — {policy.policy_number}
          </span>
        </div>
      )}

      {fieldEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          No fields were extracted. You can still submit and your broker will follow up.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fieldEntries.map(([name, value]) => (
            <div key={name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`f-${name}`} className="text-xs capitalize">
                  {name.replace(/_/g, " ")}
                </Label>
                <button
                  type="button"
                  onClick={() => removeField(name)}
                  className="text-zinc-400 hover:text-red-500"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Input
                id={`f-${name}`}
                value={value}
                onChange={(e) => updateField(name, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="wizard-notes">Notes for your broker (optional)</Label>
        <Textarea
          id="wizard-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra information..."
          rows={3}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <input
          type="checkbox"
          checked={confirmationChecked}
          onChange={(e) => setConfirmationChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">I confirm that all information is correct.</span>{" "}
          I understand this request will be sent to my broker for review and an offer.
        </span>
      </label>

      {submitError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onSubmit} disabled={!confirmationChecked}>
          <Sparkles className="mr-2 h-4 w-4" />
          {isRenewal ? "Send renewal request" : "Send new policy request"}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  isRenewal,
  onDone,
}: {
  isRenewal: boolean;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-200 bg-green-50 px-6 py-12 text-center dark:border-green-900 dark:bg-green-950">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
        Request sent!
      </h2>
      <p className="max-w-sm text-sm text-green-700 dark:text-green-300">
        {isRenewal
          ? "Your renewal request has been delivered to your broker. They will prepare an offer and notify you."
          : "Your new policy request has been delivered to your broker. They will prepare a quote and get back to you."}
      </p>
      <Button onClick={onDone} className="mt-2">
        Back to home
      </Button>
    </div>
  );
}
