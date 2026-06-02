"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Phone,
  IdCard,
  FileText,
  Calendar,
  Sparkles,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Hash,
} from "lucide-react";
import {
  createOffer,
  withdrawOffer,
  markOfferPaid,
  cancelRenewalRequest,
  type CreateOfferInput,
} from "@/features/renewals/actions";
import type { BrokerRenewalDetail } from "@/features/renewals/queries";
import type { RenewalOffer, DocumentType, RenewalOfferStatus } from "@/types";

const DOC_LABELS: Record<DocumentType, string> = {
  identity_card: "Identity card",
  car_registration: "Vehicle registration",
  car_identity_book: "Vehicle identity book",
  address_certificate: "Address certificate",
  policy: "Policy document",
  other: "Other supporting document",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(price: number, currency: string): string {
  return `${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export function RenewalDetail({ detail }: { detail: BrokerRenewalDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmed, setShowConfirmed] = useState(false);

  const isClosed =
    detail.renewal.status === "renewed" || detail.renewal.status === "cancelled";

  async function handleCancel() {
    setError(null);
    const result = await cancelRenewalRequest(detail.renewal.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCancelDialogOpen(false);
    setSuccessMessage("Request cancelled.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Top status strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={detail.renewal.status} />
          <span className="text-xs text-zinc-500">
            Created {formatDate(detail.renewal.created_at)} · Updated {formatDate(detail.renewal.updated_at)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isClosed && (
            <>
              <Button
                size="sm"
                onClick={() => setOfferDialogOpen(true)}
                disabled={detail.renewal.status === "waiting_for_payment" && detail.renewal.selected_offer_id !== null && false}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {detail.offers.length > 0 ? "Add another offer" : "Create offer"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCancelDialogOpen(true)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Cancel request
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: client + policy + confirmed fields + documents */}
        <div className="space-y-6 lg:col-span-2">
          <ClientAndPolicySection detail={detail} />

          {detail.confirmed_fields && Object.keys(detail.confirmed_fields).length > 0 && (
            <ConfirmedFieldsSection
              fields={detail.confirmed_fields}
              expanded={showConfirmed}
              setExpanded={setShowConfirmed}
            />
          )}

          {detail.documents.length > 0 && <DocumentsSection documents={detail.documents} />}

          {detail.renewal.notes && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Client notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {detail.renewal.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right: offers */}
        <div className="space-y-4">
          <OffersSection
            detail={detail}
            onError={setError}
            onSuccess={(msg) => {
              setSuccessMessage(msg);
              setError(null);
              startTransition(() => router.refresh());
            }}
          />
        </div>
      </div>

      {/* Offer dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-xl">
          <OfferForm
            renewalRequestId={detail.renewal.id}
            suggestedInsurer={detail.policy?.insurer_name ?? detail.renewal.insurer_name ?? ""}
            onCancel={() => setOfferDialogOpen(false)}
            onCreated={() => {
              setOfferDialogOpen(false);
              setSuccessMessage("Offer created. Client has been notified.");
              startTransition(() => router.refresh());
            }}
            onError={(msg) => setError(msg)}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription>
              This will withdraw all pending offers. The client will see the request as
              cancelled and can no longer accept an offer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep request
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientAndPolicySection({ detail }: { detail: BrokerRenewalDetail }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Client */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Client
          </h3>
          <div className="mt-2 space-y-1.5">
            {detail.client ? (
              <>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {detail.client.first_name} {detail.client.last_name}
                </p>
                {detail.client.email && (
                  <a
                    href={`mailto:${detail.client.email}`}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <Mail className="h-3 w-3" /> {detail.client.email}
                  </a>
                )}
                {detail.client.phone && (
                  <a
                    href={`tel:${detail.client.phone}`}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <Phone className="h-3 w-3" /> {detail.client.phone}
                  </a>
                )}
                {detail.client.cnp && (
                  <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <IdCard className="h-3 w-3" /> CNP {detail.client.cnp}
                  </p>
                )}
                {detail.client.id && (
                  <Link
                    href={`/broker/clients/${detail.client.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600 hover:underline"
                  >
                    Open client profile <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Unknown client</p>
            )}
          </div>
        </div>

        {/* Policy */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {detail.renewal.is_new_policy ? "New policy" : "Policy"}
          </h3>
          <div className="mt-2 space-y-1.5">
            {detail.policy ? (
              <>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {detail.policy.insurer_name}
                </p>
                <p className="flex items-center gap-1.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  <Hash className="h-3 w-3" /> {detail.policy.policy_number}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(detail.policy.start_date)} → {formatDate(detail.policy.end_date)}
                </p>
                <StatusBadge status={detail.policy.status} />
              </>
            ) : detail.renewal.is_new_policy ? (
              <>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {detail.renewal.policy_type ?? "New policy"}
                </p>
                {detail.renewal.insurer_name && (
                  <p className="text-xs text-zinc-500">Preferred: {detail.renewal.insurer_name}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmedFieldsSection({
  fields,
  expanded,
  setExpanded,
}: {
  fields: Record<string, unknown>;
  expanded: boolean;
  setExpanded: (b: boolean) => void;
}) {
  const entries = Object.entries(fields);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Confirmed fields
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {entries.length} field{entries.length !== 1 ? "s" : ""} from the client
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>
      {expanded && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {k.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 break-words text-sm text-zinc-900 dark:text-zinc-50">
                {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "—")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsSection({
  documents,
}: {
  documents: BrokerRenewalDetail["documents"];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Documents
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded by the client
      </p>
      <ul className="mt-3 space-y-2">
        {documents.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0 text-zinc-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {DOC_LABELS[d.required_type] ?? d.required_type}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {d.document?.quality_status ?? "pending"} · OCR {d.document?.ocr_status ?? "pending"} · {formatDate(d.created_at)}
                </p>
              </div>
            </div>
            {d.document?.file_url && (
              <a
                href={d.document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-600 hover:underline"
              >
                Open
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OffersSection({
  detail,
  onError,
  onSuccess,
}: {
  detail: BrokerRenewalDetail;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);

  const selectedOfferId = detail.renewal.selected_offer_id;

  async function handleWithdraw(offerId: string) {
    setBusyOfferId(offerId);
    onError("");
    const r = await withdrawOffer(offerId);
    setBusyOfferId(null);
    if (!r.success) {
      onError(r.error);
      return;
    }
    onSuccess("Offer withdrawn.");
    startTransition(() => router.refresh());
  }

  async function handleMarkPaid(offerId: string) {
    if (!confirm("Mark this offer as paid and renew the policy?")) return;
    setBusyOfferId(offerId);
    onError("");
    const r = await markOfferPaid(offerId);
    setBusyOfferId(null);
    if (!r.success) {
      onError(r.error);
      return;
    }
    onSuccess("Payment recorded and policy renewed.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Offers</h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          {detail.offers.length} total
        </span>
      </div>

      {detail.offers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-violet-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No offers yet.</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Create one above to send the client a quote.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {detail.offers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              isSelected={selectedOfferId === o.id}
              busy={busyOfferId === o.id}
              onWithdraw={() => handleWithdraw(o.id)}
              onMarkPaid={() => handleMarkPaid(o.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  isSelected,
  busy,
  onWithdraw,
  onMarkPaid,
}: {
  offer: RenewalOffer;
  isSelected: boolean;
  busy: boolean;
  onWithdraw: () => void;
  onMarkPaid: () => void;
}) {
  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        isSelected
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {offer.insurer_name}
          </p>
          <p className="text-xs text-zinc-500">{offer.coverage_type}</p>
          <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(offer.price, offer.currency)}
          </p>
          {offer.notes && (
            <p className="mt-1 text-xs text-zinc-500">📝 {offer.notes}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={offer.status as RenewalOfferStatus} />
          {isSelected && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Selected
            </span>
          )}
        </div>
      </div>
      {offer.status === "accepted" && !isSelected && (
        <p className="mt-2 text-[11px] text-zinc-500">
          (Accepted but another offer is selected.)
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {offer.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={onWithdraw}
            disabled={busy}
            className="text-red-600 hover:bg-red-50 dark:text-red-400"
          >
            <X className="mr-1 h-3 w-3" />
            Withdraw
          </Button>
        )}
        {offer.status === "accepted" && (
          <Button
            size="sm"
            onClick={onMarkPaid}
            disabled={busy}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {busy ? (
              <>Working...</>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Mark paid &amp; renew
              </>
            )}
          </Button>
        )}
      </div>
    </li>
  );
}

function OfferForm({
  renewalRequestId,
  suggestedInsurer,
  onCancel,
  onCreated,
  onError,
}: {
  renewalRequestId: string;
  suggestedInsurer: string;
  onCancel: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [insurer, setInsurer] = useState(suggestedInsurer);
  const [coverage, setCoverage] = useState("Comprehensive");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("RON");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const input: CreateOfferInput = {
      renewal_request_id: renewalRequestId,
      insurer_name: insurer.trim(),
      coverage_type: coverage.trim(),
      price: Number(price),
      currency,
      notes: notes.trim() || undefined,
    };

    const r = await createOffer(input);
    setSubmitting(false);

    if (!r.success) {
      setError(r.error);
      onError(r.error);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create offer</DialogTitle>
        <DialogDescription>
          Send a quote to the client. You can add multiple offers — the client picks one.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Insurer</label>
          <input
            type="text"
            value={insurer}
            onChange={(e) => setInsurer(e.target.value)}
            placeholder="e.g. Allianz"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Coverage type</label>
          <input
            type="text"
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
            placeholder="e.g. Comprehensive, Third-party"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any extra details for the client"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Create offer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
