"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Search,
  RefreshCcw,
  ChevronRight,
  Mail,
  Phone,
  Sparkles,
  FileText,
} from "lucide-react";
import type { BrokerRenewalRow } from "@/features/renewals";
import type { RenewalRequestStatus } from "@/types";

interface RenewalsListProps {
  renewals: BrokerRenewalRow[];
  filters: { label: string; value: RenewalRequestStatus | "all" }[];
  currentStatus: string;
  currentSearch: string;
}

export function RenewalsList({ renewals, filters, currentStatus, currentSearch }: RenewalsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: renewals.length };
    for (const r of renewals) {
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [renewals]);

  function updateParams(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams("q", search.trim() || null);
  }

  if (renewals.length === 0 && !currentSearch && currentStatus === "all") {
    return (
      <EmptyState
        icon={RefreshCcw}
        title="No renewal requests yet"
        description="When clients request renewals or new policies, they will appear here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = currentStatus === f.value;
          const count = counts[f.value as string] ?? 0;
          return (
            <button
              key={f.value}
              onClick={() => updateParams("status", f.value === "all" ? null : f.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/20 dark:bg-zinc-900/20"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by name, insurer, or policy #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      </form>

      {renewals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          No renewals match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {renewals.map((r) => (
              <RenewalRow key={r.id} renewal={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RenewalRow({ renewal }: { renewal: BrokerRenewalRow }) {
  const clientName = renewal.client
    ? `${renewal.client.first_name} ${renewal.client.last_name}`
    : "Unknown client";

  const isNew = renewal.is_new_policy;
  const subject = isNew
    ? `${renewal.policy_type ?? "New policy"}${renewal.insurer_name ? ` with ${renewal.insurer_name}` : ""}`
    : renewal.policy
      ? `${renewal.policy.insurer_name} — ${renewal.policy.policy_number}`
      : "Renewal";

  const offersText =
    renewal.offers.length === 0
      ? "No offers"
      : renewal.offers.length === 1
        ? "1 offer"
        : `${renewal.offers.length} offers`;

  const acceptedOffer = renewal.offers.find((o) => o.status === "accepted");

  return (
    <Link
      href={`/broker/renewals/${renewal.id}`}
      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 sm:px-6"
    >
      {/* Icon */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          isNew
            ? "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
            : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
        }`}
      >
        {isNew ? <Sparkles className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {clientName}
          </p>
          <StatusBadge status={renewal.status} />
          {acceptedOffer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300">
              Accepted
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{subject}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          {renewal.client?.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {renewal.client.email}
            </span>
          )}
          {renewal.client?.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {renewal.client.phone}
            </span>
          )}
          <span>{offersText}</span>
          {renewal.document_count > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> {renewal.document_count} doc{renewal.document_count !== 1 ? "s" : ""}
            </span>
          )}
          <span>· {new Date(renewal.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-300 dark:text-zinc-600" />
    </Link>
  );
}
