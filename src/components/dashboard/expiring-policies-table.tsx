"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, daysUntil } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";
import { SendReminderButton } from "./send-reminder-button";
import type { PolicyWithClient } from "@/types/dashboard";

interface ExpiringPoliciesTableProps {
  policies: PolicyWithClient[];
}

export function ExpiringPoliciesTable({ policies }: ExpiringPoliciesTableProps) {
  const router = useRouter();

  if (policies.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No policies expiring soon"
        description="All policies are up to date. You'll see policies here when they're close to expiration."
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
              Insurer
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Expires
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Days Left
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Remind
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {policies.map((policy) => {
            const days = daysUntil(policy.end_date);
            const isUrgent = days <= 7;

            return (
              <tr
                key={policy.id}
                onClick={() => router.push(`/broker/policies`)}
                className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {policy.clients
                    ? `${policy.clients.first_name} ${policy.clients.last_name}`
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {policy.policy_number}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {policy.insurer_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {formatDate(policy.end_date)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={policy.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isUrgent && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        isUrgent
                          ? "text-red-600 dark:text-red-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {days} days
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <SendReminderButton
                    policyId={policy.id}
                    clientName={policy.clients ? `${policy.clients.first_name} ${policy.clients.last_name}` : "Client"}
                    variant="icon"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/broker/policies"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          View all policies →
        </Link>
      </div>
    </div>
  );
}
