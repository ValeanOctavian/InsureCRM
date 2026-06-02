"use client";

import {useState, useCallback, useRef, useTransition, useEffect} from "react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { useDocumentQualityCheck } from "@/hooks/use-document-quality-check";
import { DocumentPreview } from "@/components/documents/document-preview";
import { QualityResult } from "@/components/documents/quality-result";
import type { QualityCheckResult } from "@/lib/opencv";
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
  vehicle: {
    registration_number: string;
    brand: string;
    model: string;
    vin?: string | null;
    year?: number | null;
    engine_capacity?: number | null;
    fuel_type?: string | null;
    type?: string | null;
    max_weight?: number | null;
    power_kw?: number | null;
    seats_number?: number | null;
    civ_series?: string | null;
  } | null;
}

interface PolicyRequestWizardProps {
  policy: PolicySummary | null;
  wizardMode: boolean;
  firstName: string;
}

type WizardStep =
  | "policy_type"
  | "client_details"
  | "object_details"
  | "preview"
  | "submitting"
  | "done";

type SubStepStatus = "pending" | "checking_quality" | "quality_checked" | "uploading" | "ocr_running" | "completed" | "error";

interface RequiredDocState {
  requiredType: DocumentType;
  label: string;
  file: File | null;
  previewUrl: string | null;
  documentId: string | null;
  ocrResult: OcrExtractionResult<ExtractedFields> | null;
  qualityResult: QualityCheckResult | null;
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

function initialDocStates(types: DocumentType[]): RequiredDocState[] {
  return types.map((t) => ({
    requiredType: t,
    label: REQUIRED_DOC_LABELS[t],
    file: null,
    previewUrl: null,
    documentId: null,
    ocrResult: null,
    qualityResult: null,
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
  const [step, setStep] = useState<WizardStep>(isRenewal ? "client_details" : "policy_type");
  const [policyType, setPolicyType] = useState<PolicyType>(policy?.type ?? POLICY_TYPES.RCA);
  const [insurerName, setInsurerName] = useState(policy?.insurer_name ?? "");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── Client Details State ────────────────────────────────────────────────
  const [clientFields, setClientFields] = useState({







     last_name: "  " +
         "" +
         "" +
         "" +
         "" +
         "" +
         "",
    cnp: "",
    address: "",
    is_new_card: false,
    on_behalf: false,
  });
  const [clientDoc, setClientDoc] = useState<RequiredDocState>(() => initialDocStates([DOCUMENT_TYPES.IDENTITY_CARD])[0]);
  const [addressDoc, setAddressDoc] = useState<RequiredDocState>(() => initialDocStates([DOCUMENT_TYPES.ADDRESS_CERTIFICATE])[0]);

  // ─── Object Details State ────────────────────────────────────────────────
  const [objectFields, setObjectFields] = useState({
    registration_number: policy?.vehicle?.registration_number ?? "",
    vin: policy?.vehicle?.vin ?? "",
    brand: policy?.vehicle?.brand ?? "",
    model: policy?.vehicle?.model ?? "",
    year: policy?.vehicle?.year?.toString() ?? "",
    vehicle_type: policy?.vehicle?.type ?? "",
    fuel_type: policy?.vehicle?.fuel_type ?? "",
    max_weight: policy?.vehicle?.max_weight?.toString() ?? "",
    engine_capacity: policy?.vehicle?.engine_capacity?.toString() ?? "",
    power_kw: policy?.vehicle?.power_kw?.toString() ?? "",
    seats: policy?.vehicle?.seats_number?.toString() ?? "",
    civ_series: policy?.vehicle?.civ_series ?? "",
    // Home fields
    home_address: "",
    home_city: "",
    building_year: "",
  });
  const [objectDoc, setObjectDoc] = useState<RequiredDocState>(() => {
    const type = policy?.vehicle ? DOCUMENT_TYPES.CAR_REGISTRATION : DOCUMENT_TYPES.OTHER;
    return initialDocStates([type])[0];
  });
  const [objectConfirmed, setObjectConfirmed] = useState(false);

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitError(null);
    setStep("submitting");

    const confirmedFields = {
      client: clientFields,
      object: objectFields,
      on_behalf: clientFields.on_behalf,
    };

    const uploadedDocuments = [];
    if (clientDoc.documentId) uploadedDocuments.push({ documentId: clientDoc.documentId, requiredType: clientDoc.requiredType });
    if (addressDoc.documentId) uploadedDocuments.push({ documentId: addressDoc.documentId, requiredType: addressDoc.requiredType });
    if (objectDoc.documentId) uploadedDocuments.push({ documentId: objectDoc.documentId, requiredType: objectDoc.requiredType });

    const result = await submitRenewalWizard({
      policyId: policy?.id ?? null,
      isNewPolicy: !isRenewal,
      policyType: !isRenewal ? policyType : undefined,
      insurerName: !isRenewal ? insurerName : policy?.insurer_name,
      confirmedFields,
      uploadedDocuments,
      notes: notes || undefined,
    });

    if (!result.success) {
      setSubmitError(result.error);
      setStep("preview");
      return;
    }

    setStep("done");
    startTransition(() => router.refresh());
  };

  // ─── Renders ─────────────────────────────────────────────────────────────

  const stepOrder: WizardStep[] = ["policy_type", "client_details", "object_details", "preview"];
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
            ? "We'll collect updated details to renew your policy."
            : `Hi ${firstName}, follow the steps below to request a brand new policy.`}
        </p>
      </div>

      {/* Stepper */}
      {step !== "done" && step !== "submitting" && (
        <WizardStepper current={stepIndex >= 0 ? stepIndex : 0} total={totalSteps} />
      )}

      {step === "policy_type" && (
        <PolicyTypeStep
          policyType={policyType}
          setPolicyType={setPolicyType}
          insurerName={insurerName}
          setInsurerName={setInsurerName}
          onContinue={() => setStep("client_details")}
        />
      )}

      {step === "client_details" && (
        <ClientDetailsStep
          fields={clientFields}
          setFields={setClientFields}
          doc={clientDoc}
          setDoc={setClientDoc}
          addressDoc={addressDoc}
          setAddressDoc={setAddressDoc}
          onBack={() => setStep(isRenewal ? "client_details" : "policy_type")}
          onContinue={() => setStep("object_details")}
        />
      )}

      {step === "object_details" && (
        <ObjectDetailsStep
          policyType={policyType}
          fields={objectFields}
          setFields={setObjectFields}
          doc={objectDoc}
          setDoc={setObjectDoc}
          confirmed={objectConfirmed}
          setConfirmed={setObjectConfirmed}
          onBack={() => setStep("client_details")}
          onContinue={() => setStep("preview")}
        />
      )}

      {step === "preview" && (
        <PreviewStep
          policyType={policyType}
          insurerName={insurerName}
          clientFields={clientFields}
          objectFields={objectFields}
          notes={notes}
          setNotes={setNotes}
          onBack={() => setStep("object_details")}
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
  const labels = ["Policy", "Client", "Object", "Preview"];
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

// ─── New Step Components ───────────────────────────────────────────────────

function PolicyTypeStep({
  policyType,
  setPolicyType,
  insurerName,
  setInsurerName,
  onContinue,
}: {
  policyType: PolicyType;
  setPolicyType: (t: PolicyType) => void;
  insurerName: string;
  setInsurerName: (s: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">What kind of policy?</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose the type of coverage you need.</p>
      </div>

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

      <div className="flex justify-end">
        <Button onClick={onContinue}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DocCard({
  doc,
  onUpdate,
  onOcrSuccess,
}: {
  doc: RequiredDocState;
  onUpdate: (patch: Partial<RequiredDocState>) => void;
  onOcrSuccess?: (fields: Record<string, string>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [runningOcr, setRunningOcr] = useState(false);
  const quality = useDocumentQualityCheck();

  // Sync hook state back to parent doc state
  useEffect(() => {
    if (quality.step === "checking" && doc.status !== "checking_quality") {
      onUpdate({ status: "checking_quality" });
    } else if (quality.step === "result" && quality.quality && doc.status !== "quality_checked") {
      onUpdate({
        qualityResult: quality.quality,
        status: "quality_checked",
      });
    } else if (quality.step === "error" && quality.error && doc.status !== "error") {
      onUpdate({ status: "error", error: quality.error });
    }
  }, [quality.step, quality.quality, quality.error, onUpdate, doc.status]);

  const handleFile = (file: File) => {
    quality.selectFile(file);
    // useDocumentQualityCheck creates its own previewUrl, but we also want
    // to update the parent state immediately for UI consistency.
    const previewUrl = URL.createObjectURL(file);
    onUpdate({ file, previewUrl, status: "pending", error: null, qualityResult: null });
  };

  const handleUpload = async () => {
    if (!doc.file) return;
    onUpdate({ status: "uploading", error: null });
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(doc.file!);
      });
      const result = await uploadPortalDocument({
        type: doc.requiredType,
        fileName: doc.file.name,
        fileBase64: base64,
        mimeType: doc.file.type,
        qualityStatus: doc.qualityResult?.isAcceptable ? "clear" : doc.qualityResult ? "blurry" : "pending",
      });
      if (result.success && result.data) {
        onUpdate({ documentId: result.data.id, status: "completed" });
      } else {
        onUpdate({ status: "error", error: result.error ?? "Upload failed" });
      }
    } catch (err: any) {
      onUpdate({ status: "error", error: err.message });
    }
  };

  const handleRunOcr = async () => {
    if (!doc.documentId) return;
    setRunningOcr(true);
    onUpdate({ status: "ocr_running", error: null });
    try {
      const result = await runPortalDocumentOCR(doc.documentId);
      if (result.success && result.data) {
        onUpdate({ ocrResult: result.data, status: "completed" });
        if (onOcrSuccess) {
          onOcrSuccess(flattenOcrFields(result.data));
        }
      } else {
        onUpdate({ status: "error", error: result.error ?? "OCR failed" });
      }
    } catch (err: any) {
      onUpdate({ status: "error", error: err.message });
    } finally {
      setRunningOcr(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-semibold">{doc.label}</Label>
        {doc.status === "completed" && <StatusBadge status="completed" size="sm" />}
      </div>

      {!doc.file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 py-6 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
        >
          <Upload className="mb-2 h-6 w-6 text-zinc-400" />
          <p className="text-xs font-medium">Upload {doc.label}</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <DocumentPreview file={doc.file} previewUrl={doc.previewUrl!} />
            <button
              onClick={() => {
                quality.reset();
                onUpdate({ file: null, previewUrl: null, documentId: null, status: "pending", ocrResult: null, qualityResult: null });
              }}
              className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-zinc-900 shadow-sm hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quality check state */}
          {doc.status === "checking_quality" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              <p className="text-xs text-zinc-500">Analyzing quality...</p>
            </div>
          )}

          {doc.qualityResult && doc.status === "quality_checked" && (
            <QualityResult result={doc.qualityResult} className="py-2" />
          )}

          {!doc.documentId && (doc.status === "quality_checked" || !doc.file.type.startsWith("image/")) && (
            <div className="flex flex-col gap-2">
              <Button className="w-full" size="sm" onClick={handleUpload} disabled={doc.status === "uploading"}>
                {doc.status === "uploading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {doc.qualityResult?.isAcceptable === false ? "Upload Anyway" : "Upload Document"}
              </Button>
              {doc.qualityResult?.isAcceptable === false && (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" />
                  Retake Photo
                </Button>
              )}
            </div>
          )}

          {doc.documentId && !doc.ocrResult && (
            <Button variant="secondary" className="w-full" size="sm" onClick={handleRunOcr} disabled={runningOcr}>
              {runningOcr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              Extract data with AI
            </Button>
          )}

          {doc.error && <p className="text-[10px] text-red-500">{doc.error}</p>}
        </div>
      )}
    </div>
  );
}

function ClientDetailsStep({
  fields,
  setFields,
  doc,
  setDoc,
  addressDoc,
  setAddressDoc,
  onBack,
  onContinue,
}: {
  fields: any;
  setFields: any;
  doc: RequiredDocState;
  setDoc: any;
  addressDoc: RequiredDocState;
  setAddressDoc: any;
  onBack: () => void;
  onContinue: () => void;
}) {
  const updateField = (k: string, v: any) => setFields((prev: any) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold mb-4">Client Information</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <DocCard
            doc={doc}
            onUpdate={(patch) => setDoc((prev: any) => ({ ...prev, ...patch }))}
            onOcrSuccess={(ocr) => {
              setFields((prev: any) => ({
                ...prev,
                first_name: ocr.first_name || prev.first_name,
                last_name: ocr.last_name || prev.last_name,
                cnp: ocr.cnp || prev.cnp,
                address: ocr.address || prev.address,
              }));
            }}
          />

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="on_behalf"
                checked={fields.on_behalf}
                onChange={(e) => updateField("on_behalf", e.target.checked)}
                className="rounded border-zinc-300"
              />
              <Label htmlFor="on_behalf" className="text-sm">Policy is for someone else</Label>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="first_name" className="text-xs">First Name</Label>
                <Input id="first_name" value={fields.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name" className="text-xs">Last Name</Label>
                <Input id="last_name" value={fields.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cnp" className="text-xs">CNP / Tax ID</Label>
                <Input id="cnp" value={fields.cnp} onChange={(e) => updateField("cnp", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs">Full Address</Label>
                <Textarea id="address" value={fields.address} onChange={(e) => updateField("address", e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="is_new_card"
              checked={fields.is_new_card}
              onChange={(e) => updateField("is_new_card", e.target.checked)}
              className="rounded border-zinc-300"
            />
            <Label htmlFor="is_new_card" className="text-sm font-medium">This is a new ID card (requires address certificate)</Label>
          </div>

          {fields.is_new_card && (
            <div className="max-w-md">
              <DocCard
                doc={addressDoc}
                onUpdate={(patch) => setAddressDoc((prev: any) => ({ ...prev, ...patch }))}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!fields.first_name || !fields.last_name || !doc.documentId}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ObjectDetailsStep({
  policyType,
  fields,
  setFields,
  doc,
  setDoc,
  confirmed,
  setConfirmed,
  onBack,
  onContinue,
}: {
  policyType: PolicyType;
  fields: any;
  setFields: any;
  doc: RequiredDocState;
  setDoc: any;
  confirmed: boolean;
  setConfirmed: any;
  onBack: () => void;
  onContinue: () => void;
}) {
  const isAuto = policyType === POLICY_TYPES.RCA || policyType === POLICY_TYPES.CASCO;
  const isHome = policyType === POLICY_TYPES.HOME;

  const updateField = (k: string, v: any) => setFields((prev: any) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold mb-4">
          {isAuto ? "Vehicle Details" : isHome ? "Property Details" : "Policy Details"}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <DocCard
            doc={{ ...doc, label: isAuto ? "Vehicle Registration" : isHome ? "Property Document" : "Relevant Document" }}
            onUpdate={(patch) => setDoc((prev: any) => ({ ...prev, ...patch }))}
            onOcrSuccess={(ocr) => {
              if (isAuto) {
                setFields((prev: any) => ({
                  ...prev,
                  registration_number: ocr.registration_number || prev.registration_number,
                  vin: ocr.vin || prev.vin,
                  brand: ocr.brand || prev.brand,
                  model: ocr.model || prev.model,
                  year: ocr.year || prev.year,
                  vehicle_type: ocr.vehicle_type || prev.vehicle_type,
                  fuel_type: ocr.fuel_type || prev.fuel_type,
                  max_weight: ocr.max_weight || prev.max_weight,
                  engine_capacity: ocr.engine_capacity || prev.engine_capacity,
                  power_kw: ocr.power_kw || prev.power_kw,
                  seats: ocr.seats || prev.seats,
                  civ_series: ocr.civ_series || prev.civ_series,
                }));
              }
            }}
          />

          <div className="space-y-4">
            {isAuto && (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="reg_num" className="text-xs">Registration Number</Label>
                  <Input id="reg_num" value={fields.registration_number} onChange={(e) => updateField("registration_number", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vin" className="text-xs">VIN (Chassis Number)</Label>
                  <Input id="vin" value={fields.vin} onChange={(e) => updateField("vin", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="brand" className="text-xs">Brand</Label>
                    <Input id="brand" value={fields.brand} onChange={(e) => updateField("brand", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="model" className="text-xs">Model</Label>
                    <Input id="model" value={fields.model} onChange={(e) => updateField("model", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="year" className="text-xs">Year</Label>
                    <Input id="year" type="number" value={fields.year} onChange={(e) => updateField("year", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vehicle_type" className="text-xs">Vehicle Type</Label>
                    <Input id="vehicle_type" value={fields.vehicle_type} onChange={(e) => updateField("vehicle_type", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="fuel_type" className="text-xs">Fuel Type</Label>
                    <Input id="fuel_type" value={fields.fuel_type} onChange={(e) => updateField("fuel_type", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="max_weight" className="text-xs">Max Weight (kg)</Label>
                    <Input id="max_weight" type="number" value={fields.max_weight} onChange={(e) => updateField("max_weight", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="engine_capacity" className="text-xs">Engine Capacity (cc)</Label>
                    <Input id="engine_capacity" type="number" value={fields.engine_capacity} onChange={(e) => updateField("engine_capacity", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="power_kw" className="text-xs">Power (KW)</Label>
                    <Input id="power_kw" type="number" value={fields.power_kw} onChange={(e) => updateField("power_kw", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="seats" className="text-xs">Seats</Label>
                    <Input id="seats" type="number" value={fields.seats} onChange={(e) => updateField("seats", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="civ_series" className="text-xs">CIV Series</Label>
                    <Input id="civ_series" value={fields.civ_series} onChange={(e) => updateField("civ_series", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {isHome && (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="h_address" className="text-xs">Property Address</Label>
                  <Textarea id="h_address" value={fields.home_address} onChange={(e) => updateField("home_address", e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="h_city" className="text-xs">City</Label>
                    <Input id="h_city" value={fields.home_city} onChange={(e) => updateField("home_city", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="h_year" className="text-xs">Building Year</Label>
                    <Input id="h_year" type="number" value={fields.building_year} onChange={(e) => updateField("building_year", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {!isAuto && !isHome && (
              <div className="py-10 text-center text-zinc-500 text-sm">
                No specific fields required for this policy type. <br />
                Please ensure the document is uploaded.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span className="text-sm font-medium">Please confirm the pre-filled details are correct.</span>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!confirmed}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PreviewStep({
  policyType,
  insurerName,
  clientFields,
  objectFields,
  notes,
  setNotes,
  onBack,
  onSubmit,
  submitError,
}: {
  policyType: PolicyType;
  insurerName: string;
  clientFields: any;
  objectFields: any;
  notes: string;
  setNotes: (s: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitError: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold mb-4">Preview & Confirm</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Policy</h3>
              <p className="text-sm font-medium">{policyType} {insurerName && `— ${insurerName}`}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Client</h3>
              <p className="text-sm">{clientFields.first_name} {clientFields.last_name}</p>
              <p className="text-xs text-zinc-500">{clientFields.cnp}</p>
              <p className="text-xs text-zinc-500">{clientFields.address}</p>
              {clientFields.on_behalf && (
                <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  On behalf of someone else
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Details</h3>
              {policyType.includes("RCA") || policyType.includes("CASCO") ? (
                <div className="text-sm space-y-1">
                  <p className="font-semibold">{objectFields.registration_number}</p>
                  <p>{objectFields.brand} {objectFields.model} ({objectFields.year})</p>
                  <div className="grid grid-cols-2 gap-x-4 text-xs text-zinc-500">
                    <p>VIN: {objectFields.vin}</p>
                    <p>Type: {objectFields.vehicle_type}</p>
                    <p>Fuel: {objectFields.fuel_type}</p>
                    <p>Max Weight: {objectFields.max_weight}kg</p>
                    <p>Capacity: {objectFields.engine_capacity}cc</p>
                    <p>Power: {objectFields.power_kw}KW</p>
                    <p>Seats: {objectFields.seats}</p>
                    <p>CIV: {objectFields.civ_series}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Additional information provided via documents.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs">Notes for Broker (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional comments here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {submitError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {submitError}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onSubmit} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
          <Sparkles className="mr-2 h-4 w-4" />
          Submit Request
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
