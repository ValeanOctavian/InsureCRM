"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Search, Users, ChevronRight, Phone, Mail } from "lucide-react";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

interface ClientsListProps {
  clients: ClientRow[];
  loading?: boolean;
}

export function ClientsList({ clients, loading = false }: ClientsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [clients, search]);

  if (loading) {
    return <LoadingSkeleton variant="table" count={8} />;
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No clients yet"
        description="Add your first client to get started."
        action={
          <button
            onClick={() => router.push("/broker/clients/new")}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            Add Client
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-zinc-500">
        {filtered.length} of {clients.length} client{clients.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              No clients match your search.
            </div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => router.push(`/broker/clients/${client.id}`)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 sm:px-6"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900 dark:text-violet-300">
                  {client.first_name[0]}
                  {client.last_name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {client.first_name} {client.last_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {client.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <StatusBadge status={client.status} />

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-300 dark:text-zinc-600" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
