"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Shield, Car, FileText, RefreshCcw, Clock, CheckCircle2, XCircle, Sparkles, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { Policy, Vehicle, Document, RenewalRequest, RenewalOffer } from "@/types";
import { formatDate } from "@/lib/utils";

interface PolicyDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy;
  vehicle: Vehicle | null;
  documents: Document[];
  renewalHistory: (RenewalRequest & { offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[] })[];
  openRenewal: (RenewalRequest & { offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[] }) | null;
  onRenewClick: () => void;
}

const RENEWAL_STEPS: { key: string; label: string }[] = [
  { key: "renewal_requested", label: "Requested" },
  { key: "waiting_for_documents", label: "Documents" },
  { key: "waiting_for_offer", label: "Offer" },
  { key: "offer_available", label: "Available" },
  { key: "waiting_for_payment", label: "Payment" },
  { key: "renewed", label: "Renewed" },
];

function getStepIndex(status: string | undefined): number {
  if (!status) return -1;
  const i = RENEWAL_STEPS.findIndex((s) => s.key === status);
  if (i >= 0) return i;
  // legacy statuses
  if (status === "requested") return 0;
  if (status === "documents_needed") return 1;
  if (status === "in_progress") return 2;
  if (status === "issued") return 5;
  return -1;
}

export function PolicyDetailSheet({
  open,
  onOpenChange,
  policy,
  vehicle,
  documents,
  renewalHistory,
  openRenewal,
  onRenewClick,
}: PolicyDetailSheetProps) {
  const [tab, setTab] = useState<"overview" | "documents" | "renewals">("overview");

  const stepIndex = getStepIndex(openRenewal?.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">{policy.insurer_name}</SheetTitle>
              <SheetDescription className="text-xs">
                {policy.type} · {policy.policy_number}
              </SheetDescription>
              <div className="mt-1.5">
                <StatusBadge status={openRenewal?.status ?? policy.status} />
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {(["overview", "documents", "renewals"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {tab === "overview" && (
            <div className="space-y-4">
              {/* Quick action */}
              {!openRenewal && (policy.status === "active" || policy.status === "expiring_soon" || policy.status === "expired") && (
                <Button onClick={onRenewClick} className="w-full" size="lg">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Request renewal
                </Button>
              )}

              {/* Renewal status timeline */}
              {openRenewal && (
                <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Current renewal
                  </h3>
                  <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {openRenewal.status.replace(/_/g, " ")}
                  </p>

                  {/* Stepper */}
                  <ol className="mt-3 space-y-2">
                    {RENEWAL_STEPS.map((s, i) => {
                      const done = i < stepIndex;
                      const current = i === stepIndex;
                      return (
                        <li key={s.key} className="flex items-center gap-2 text-sm">
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : current ? (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600" />
                          )}
                          <span
                            className={
                              done
                                ? "text-zinc-500 line-through"
                                : current
                                  ? "font-medium text-zinc-900 dark:text-zinc-50"
                                  : "text-zinc-500"
                            }
                          >
                            {s.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {/* Offers */}
              {openRenewal && openRenewal.offers.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Offers
                  </h3>
                  <div className="space-y-2">
                    {openRenewal.offers.map((o) => (
                      <OfferCard key={o.id} offer={o} requestId={openRenewal.id} />
                    ))}
                  </div>
                </section>
              )}

              {/* Dates */}
              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Coverage
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-zinc-500">Start</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatDate(policy.start_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Expires</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatDate(policy.end_date)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-zinc-500">Premium</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                      {policy.premium_amount.toLocaleString()} RON
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Vehicle */}
              {vehicle && (
                <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Vehicle
                  </h3>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <Car className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {vehicle.registration_number}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {vehicle.brand} {vehicle.model} · {vehicle.year}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-2">
              {documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents yet"
                  description="Upload identity, address, or vehicle documents from the Documents page."
                />
              ) : (
                documents.map((d) => (
                  <a
                    key={d.id}
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <FileText className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">
                        {d.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-zinc-500">{formatDate(d.created_at)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </a>
                ))
              )}
            </div>
          )}

          {tab === "renewals" && (
            <div className="space-y-2">
              {renewalHistory.length === 0 ? (
                <EmptyState
                  icon={RefreshCcw}
                  title="No renewals yet"
                  description="Renewal requests for this policy will appear here once submitted."
                />
              ) : (
                renewalHistory.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {formatDate(r.created_at)}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.offers.length > 0 && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {r.offers.length} offer{r.offers.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OfferCard({
  offer,
  requestId,
}: {
  offer: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">;
  requestId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setBusy(true);
    setError(null);
    const { acceptOffer } = await import("@/features/portal/renewal-actions");
    const result = await acceptOffer(offer.id, requestId);
    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setBusy(false);
    startTransition(() => router.refresh());
  };

  const handleReject = async () => {
    setBusy(true);
    setError(null);
    const { rejectOffer } = await import("@/features/portal/renewal-actions");
    const result = await rejectOffer(offer.id, requestId);
    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setBusy(false);
    startTransition(() => router.refresh());
  };

  if (offer.status === "accepted") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-200">
          <CheckCircle2 className="h-4 w-4" />
          Offer accepted
        </div>
        <p className="mt-1 text-xs text-green-700 dark:text-green-400">
          {offer.insurer_name} · {Number(offer.price).toLocaleString()} {offer.currency}
        </p>
      </div>
    );
  }

  if (offer.status === "rejected" || offer.status === "withdrawn") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 opacity-70 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          <XCircle className="h-4 w-4" />
          Offer {offer.status}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {offer.insurer_name} · {Number(offer.price).toLocaleString()} {offer.currency}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900 dark:bg-violet-950/30">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600 dark:text-violet-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {offer.insurer_name}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{offer.coverage_type}</p>
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {Number(offer.price).toLocaleString()} {offer.currency}
          </p>
          {offer.notes && (
            <p className="mt-1 text-xs text-zinc-500">{offer.notes}</p>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={busy}
          className="flex-1"
        >
          {busy ? "..." : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={busy}
          className="flex-1"
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
