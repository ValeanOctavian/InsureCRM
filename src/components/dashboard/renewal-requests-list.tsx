"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import type { RenewalRequestWithPolicy } from "@/types/dashboard";

interface RenewalRequestsListProps {
  requests: RenewalRequestWithPolicy[];
}

export function RenewalRequestsList({ requests }: RenewalRequestsListProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="No renewal requests"
        description="When clients request policy renewals, they will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Client
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Policy
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Payment
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Requested
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {requests.map((req) => (
            <tr
              key={req.id}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {req.clients
                  ? `${req.clients.first_name} ${req.clients.last_name}`
                  : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {req.policies?.policy_number ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={req.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={req.payment_status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                {formatDate(req.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/broker/renewals"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          View all renewals →
        </Link>
      </div>
    </div>
  );
}
