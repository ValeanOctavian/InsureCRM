"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Car, Calendar, ArrowUpRight, FileText, RefreshCcw, Loader2, XCircle, Info } from "lucide-react";
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
import { requestRenewalSimple } from "@/features/portal/renewal-actions";
import { ROUTES } from "@/lib/utils";
import type { PortalPolicyCard } from "@/features/portal/queries";

interface PolicyCardProps {
  policy: PortalPolicyCard;
  onSelect: (policy: PortalPolicyCard) => void;
  onMutated: () => void;
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  RCA: "RCA",
  CASCO: "CASCO",
  HOME: "Home",
  TRAVEL: "Travel",
  HEALTH: "Health",
  OTHER: "Other",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PolicyCard({ policy, onSelect, onMutated }: PolicyCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardRequired, setWizardRequired] = useState<{ missing: string[] } | null>(null);

  // Use the open renewal status if it exists, otherwise the policy's own status.
  const displayStatus = policy.open_renewal?.status ?? policy.status;

  const isExpired = policy.status === "expired";
  const isExpiring = policy.status === "expiring_soon";
  const hasOpenRenewal = Boolean(policy.open_renewal);

  const handleRenewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    if (hasOpenRenewal) {
      // Already in progress — open detail to see status
      onSelect(policy);
      return;
    }
    setConfirmOpen(true);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(policy);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    const result = await requestRenewalSimple(policy.id);

    setLoading(false);

    if (result.success) {
      setConfirmOpen(false);
      onMutated();
      return;
    }

    if (result.code === "wizard_required" && result.missing) {
      setConfirmOpen(false);
      setWizardRequired({ missing: result.missing });
      return;
    }

    setError(result.error);
  };

  return (
    <>
      <article
        onClick={() => onSelect(policy)}
        className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(policy);
          }
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {POLICY_TYPE_LABELS[policy.type] ?? policy.type}
              </p>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {policy.insurer_name}
              </h3>
            </div>
          </div>
          <StatusBadge status={displayStatus} />
        </div>

        {/* Policy number */}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Policy <span className="font-mono text-zinc-700 dark:text-zinc-300">{policy.policy_number}</span>
        </p>

        {/* Vehicle */}
        {policy.vehicle && (
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <Car className="h-4 w-4 text-zinc-400" />
            <span className="font-medium">{policy.vehicle.registration_number}</span>
            <span className="text-zinc-500">· {policy.vehicle.brand} {policy.vehicle.model}</span>
          </div>
        )}

        {/* Dates */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <p className="text-zinc-500">Start</p>
            <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">{formatDate(policy.start_date)}</p>
          </div>
          <div className={`rounded-lg px-3 py-2 ${
            isExpired
              ? "bg-red-50 dark:bg-red-950"
              : isExpiring
                ? "bg-yellow-50 dark:bg-yellow-950"
                : "bg-zinc-50 dark:bg-zinc-900"
          }`}>
            <p className="text-zinc-500">Expires</p>
            <p className={`mt-0.5 font-medium ${
              isExpired
                ? "text-red-700 dark:text-red-300"
                : isExpiring
                  ? "text-yellow-700 dark:text-yellow-300"
                  : "text-zinc-900 dark:text-zinc-50"
            }`}>
              {formatDate(policy.end_date)}
            </p>
          </div>
        </div>

        {/* Renewal in progress hint */}
        {hasOpenRenewal && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              A renewal is in progress — open the policy for details.
            </span>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(policy);
            }}
          >
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
            View Details
          </Button>
          {!hasOpenRenewal && (isExpired || isExpiring || policy.status === "active") && (
            <Button
              size="sm"
              onClick={handleRenewClick}
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Renew
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUploadClick}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Documents
          </Button>
        </div>
      </article>

      {/* Confirm renewal dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request renewal</DialogTitle>
            <DialogDescription>
              Send a renewal request for{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {policy.insurer_name} — {policy.policy_number}
              </span>
              ?
              <br />
              Your broker will be notified and prepare an offer for you.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wizard required (missing/expired docs) */}
      <Dialog open={Boolean(wizardRequired)} onOpenChange={(o) => !o && setWizardRequired(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Additional documents needed</DialogTitle>
            <DialogDescription>
              Some of your documents are missing or expired. We&apos;ll need updated copies before
              we can submit the renewal.
            </DialogDescription>
          </DialogHeader>

          {wizardRequired && (
            <ul className="space-y-1 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              {wizardRequired.missing.map((m) => (
                <li key={m} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  {m}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardRequired(null)}>
              Later
            </Button>
            <Button
              onClick={() => {
                setWizardRequired(null);
                router.push(`${ROUTES.CLIENT.POLICY_REQUEST}?policy=${policy.id}&wizard=1`);
              }}
            >
              Start wizard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
