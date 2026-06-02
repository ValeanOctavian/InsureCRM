import { requireAuth } from "@/lib/auth/middleware";
import { PageHeader } from "@/components/shared/page-header";
import { getBrokerRenewals, RENEWAL_STATUS_FILTERS } from "@/features/renewals";
import { RenewalsList } from "./renewals-list";
import type { RenewalRequestStatus } from "@/types";

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function BrokerRenewalsPage({ searchParams }: PageProps) {
  await requireAuth();
  const params = await searchParams;

  const status =
    params.status && params.status !== "all"
      ? (params.status as RenewalRequestStatus)
      : undefined;
  const search = params.q || undefined;

  const renewals = await getBrokerRenewals({ status, search });

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Renewals"
        description="Manage client renewal requests and send offers"
      />

      <div className="mt-6">
        <RenewalsList
          renewals={renewals}
          filters={RENEWAL_STATUS_FILTERS}
          currentStatus={params.status ?? "all"}
          currentSearch={params.q ?? ""}
        />
      </div>
    </div>
  );
}
