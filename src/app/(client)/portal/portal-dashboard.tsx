"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyCard } from "@/components/portal/policy-card";
import { PolicyDetailSheet } from "@/components/portal/policy-detail-sheet";
import { requestRenewalSimple } from "@/features/portal/renewal-actions";
import type { PortalPolicyCard } from "@/features/portal/queries";
import type { Policy, Vehicle, Document, RenewalRequest, RenewalOffer } from "@/types";
import { ROUTES } from "@/lib/utils";

interface PortalDashboardClientProps {
  policies: PortalPolicyCard[];
  detailById: Record<
    string,
    {
      policy: Policy;
      vehicle: Vehicle | null;
      documents: Document[];
      renewalHistory: (RenewalRequest & { offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[] })[];
      openRenewal: (RenewalRequest & { offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type" | "notes">[] }) | null;
    } | null
  >;
  firstName: string;
}

export function PortalDashboardClient({ policies, detailById, firstName }: PortalDashboardClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<PortalPolicyCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const handleSelect = (policy: PortalPolicyCard) => {
    setSelected(policy);
    setSheetOpen(true);
  };

  const handleMutated = () => {
    startTransition(() => router.refresh());
  };

  const handleRenewFromSheet = async () => {
    if (!selected) return;
    setWizardError(null);
    const result = await requestRenewalSimple(selected.id);
    if (result.success) {
      setSheetOpen(false);
      handleMutated();
      return;
    }
    if (result.code === "wizard_required") {
      // Close sheet and direct user to /portal/policy-request which runs the wizard
      // for the current policy. We pass policy id via query.
      router.push(`/portal/policy-request?policy=${selected.id}&wizard=1`);
      return;
    }
    setWizardError(result.error);
  };

  // Group policies
  const expired = policies.filter((p) => p.status === "expired" && !p.open_renewal);
  const expiring = policies.filter((p) => p.status === "expiring_soon" && !p.open_renewal);
  const active = policies.filter((p) => p.status === "active" && !p.open_renewal);
  const inProgress = policies.filter((p) => Boolean(p.open_renewal));
  const renewed = policies.filter((p) => p.status === "renewed");

  const selectedDetail = selected ? detailById[selected.id] ?? null : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Hi, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your insurance policies and renewals.
          </p>
        </div>
        <Button
          onClick={() => router.push(ROUTES.CLIENT.POLICY_REQUEST)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New policy request
        </Button>
      </div>

      {wizardError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {wizardError}
        </div>
      )}

      {/* In-progress renewals */}
      {inProgress.length > 0 && (
        <PolicyGroup
          title="In progress"
          subtitle="Renewal requests currently being processed"
          accent="violet"
          policies={inProgress}
          onSelect={handleSelect}
          onMutated={handleMutated}
        />
      )}

      {/* Expiring soon */}
      {expiring.length > 0 && (
        <PolicyGroup
          title="Expiring soon"
          subtitle="These policies expire within 30 days"
          accent="yellow"
          policies={expiring}
          onSelect={handleSelect}
          onMutated={handleMutated}
        />
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <PolicyGroup
          title="Expired"
          subtitle="These policies have expired — request a renewal to keep your coverage"
          accent="red"
          policies={expired}
          onSelect={handleSelect}
          onMutated={handleMutated}
        />
      )}

      {/* Active */}
      {active.length > 0 && (
        <PolicyGroup
          title="Active"
          subtitle="Your current coverage"
          accent="green"
          policies={active}
          onSelect={handleSelect}
          onMutated={handleMutated}
        />
      )}

      {/* Recently renewed */}
      {renewed.length > 0 && (
        <PolicyGroup
          title="Renewed"
          subtitle="Policies renewed in the last cycle"
          accent="blue"
          policies={renewed}
          onSelect={handleSelect}
          onMutated={handleMutated}
        />
      )}

      {/* Empty state */}
      {policies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-500" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            No policies yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            When you have policies with us, they will appear here. You can also request a new
            policy from this portal.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push(ROUTES.CLIENT.POLICY_REQUEST)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Request a new policy
          </Button>
        </div>
      )}

      {/* Detail sheet */}
      {selected && selectedDetail && (
        <PolicyDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          policy={selectedDetail.policy}
          vehicle={selectedDetail.vehicle}
          documents={selectedDetail.documents}
          renewalHistory={selectedDetail.renewalHistory}
          openRenewal={selectedDetail.openRenewal}
          onRenewClick={handleRenewFromSheet}
        />
      )}
    </div>
  );
}

const ACCENT_MAP: Record<string, { dot: string; text: string }> = {
  violet: { dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-400" },
  yellow: { dot: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-400" },
  red: { dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
  green: { dot: "bg-green-500", text: "text-green-700 dark:text-green-400" },
  blue: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
};

function PolicyGroup({
  title,
  subtitle,
  accent,
  policies,
  onSelect,
  onMutated,
}: {
  title: string;
  subtitle: string;
  accent: keyof typeof ACCENT_MAP;
  policies: PortalPolicyCard[];
  onSelect: (p: PortalPolicyCard) => void;
  onMutated: () => void;
}) {
  const a = ACCENT_MAP[accent];
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${a.dot}`} />
            <h2 className={`text-sm font-semibold ${a.text}`}>{title}</h2>
            <span className="text-xs text-zinc-400">({policies.length})</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {policies.map((p) => (
          <PolicyCard
            key={p.id}
            policy={p}
            onSelect={onSelect}
            onMutated={onMutated}
          />
        ))}
      </div>
    </section>
  );
}
