import { getPortalRenewalRequests, getPortalExpiredPolicies, getPortalActivePolicies } from "@/features/portal/queries";
import { PortalRenewClient } from "./portal-renew-client";
import { RefreshCcw, CheckCircle2, Clock, XCircle, FileText, Upload } from "lucide-react";

const statusIcons: Record<string, typeof Clock> = {
  requested: Clock,
  documents_needed: FileText,
  in_progress: Clock,
  issued: CheckCircle2,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  requested: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  documents_needed: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  issued: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export default async function PortalRenewPage() {
  const [renewalRequests, expiredPolicies, activePolicies] = await Promise.all([
    getPortalRenewalRequests(),
    getPortalExpiredPolicies(),
    getPortalActivePolicies(),
  ]);

  // Policies eligible for renewal: expired + expiring_soon active
  const renewEligiblePolicies = [
    ...expiredPolicies,
    ...activePolicies.filter((p) => p.status === "expiring_soon"),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Renewals
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Request policy renewals and track their status
        </p>
      </div>

      {/* Request Renewal Form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center gap-2">
          <RefreshCcw className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Request a Renewal
          </h2>
        </div>

        {renewEligiblePolicies.length === 0 ? (
          <div className="rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-zinc-900">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-green-400" />
            All your policies are up to date! No renewals needed at this time.
          </div>
        ) : (
          <PortalRenewClient policies={renewEligiblePolicies} />
        )}
      </div>

      {/* Upload Document CTA */}
      <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 dark:border-zinc-700 dark:bg-zinc-950">
        <Upload className="h-5 w-5 text-zinc-400" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Have a document to share?{" "}
          <a
            href="/portal/documents"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
          >
            Upload here
          </a>
        </p>
      </div>

      {/* Renewal Request History */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Renewal Request History
        </h2>

        {renewalRequests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            No renewal requests yet.
          </div>
        ) : (
          <div className="space-y-3">
            {renewalRequests.map((req) => {
              const Icon = statusIcons[req.status] || Clock;
              const colorClass = statusColors[req.status] || "bg-zinc-50 text-zinc-700";
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {req.policies
                            ? `${req.policies.insurer_name} — ${req.policies.policy_number}`
                            : "Policy renewal"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                          <span>
                            Requested: {new Date(req.created_at).toLocaleDateString()}
                          </span>
                          {req.policies?.type && (
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {req.policies.type}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${colorClass}`}
                          >
                            {req.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
