"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Shield,
  Pencil,
  Trash2,
  RefreshCw,
  ClipboardList,
  FileText,
  Search,
  Ban,
  MoreHorizontal,
} from "lucide-react";
import { formatDate, formatCurrency, POLICY_TYPES, POLICY_STATUS } from "@/lib/utils";
import { PolicyForm } from "./policy-form";
import type { Policy } from "@/types";
import type { PolicyWithClient } from "@/types/dashboard";

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface VehicleOption {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

interface PolicyTableProps {
  policies: PolicyWithClient[];
  clients: ClientOption[];
  vehicles: VehicleOption[];
}

const typeOptions = [
  { label: "All Types", value: "all" },
  ...Object.values(POLICY_TYPES).map((t) => ({ label: t, value: t })),
];

const statusOptions = [
  { label: "All Statuses", value: "all" },
  ...Object.values(POLICY_STATUS).map((s) => ({
    label: s.replace(/_/g, " "),
    value: s,
  })),
];

export function PolicyTable({
  policies,
  clients,
  vehicles,
}: PolicyTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filtered = policies.filter((p) => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.policy_number.toLowerCase().includes(q) ||
        p.insurer_name.toLowerCase().includes(q) ||
        p.clients?.first_name?.toLowerCase().includes(q) ||
        p.clients?.last_name?.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;
    const { deletePolicy } = await import("@/features/policies/actions");
    const result = await deletePolicy(id);
    if (result.success) router.refresh();
  };

  const handleRenew = async (id: string) => {
    const { renewPolicy } = await import("@/features/policies/actions");
    const result = await renewPolicy(id);
    if (result.success) router.refresh();
  };

  const handleCreateTask = async (policyId: string, policyNumber: string) => {
    const title = `Follow up on policy ${policyNumber}`;
    const { createTaskFromPolicy } = await import("@/features/policies/actions");
    const result = await createTaskFromPolicy(policyId, title);
    if (result.success) router.refresh();
  };

  const handleCreateRenewalRequest = async (policyId: string) => {
    const { createRenewalRequestFromPolicy } = await import("@/features/policies/actions");
    const result = await createRenewalRequestFromPolicy(policyId);
    if (result.success) router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 py-2 pl-10 pr-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <div className="w-36">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={typeOptions}
          />
        </div>

        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
          />
        </div>

        <Button onClick={() => { setEditPolicy(null); setShowForm(true); }}>
          <Shield className="mr-2 h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={
            search || typeFilter !== "all" || statusFilter !== "all"
              ? "No policies match your filters"
              : "No policies yet"
          }
          description={
            search || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Add your first policy to start tracking."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Policy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Insurer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Valid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Premium
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {filtered.map((policy) => (
                <tr
                  key={policy.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {policy.policy_number}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {policy.clients
                      ? `${policy.clients.first_name} ${policy.clients.last_name}`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={policy.type} variant="info" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {policy.insurer_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {formatDate(policy.start_date)} – {formatDate(policy.end_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(policy.premium_amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={policy.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="relative flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRenew(policy.id)}
                        disabled={
                          policy.status === "expired" ||
                          policy.status === "cancelled"
                        }
                        title="Renew policy"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Renew
                      </Button>

                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setActiveMenu(
                              activeMenu === policy.id ? null : policy.id
                            )
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {activeMenu === policy.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  setEditPolicy(policy);
                                  setShowForm(true);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleCreateTask(
                                    policy.id,
                                    policy.policy_number
                                  );
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                <ClipboardList className="h-4 w-4" />
                                Create Task
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleCreateRenewalRequest(policy.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                <FileText className="h-4 w-4" />
                                Request Renewal
                              </button>
                              <hr className="my-1 border-zinc-200 dark:border-zinc-800" />
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  handleDelete(policy.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PolicyForm
        open={showForm}
        onOpenChange={setShowForm}
        clients={clients}
        vehicles={vehicles}
        policy={editPolicy}
      />
    </div>
  );
}
