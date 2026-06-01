"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ActivityWithClient } from "@/types/activity";
import {
  User,
  Car,
  Shield,
  FileText,
  Activity,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Upload,
  RefreshCw,
  Bell,
  ClipboardList,
  Plus,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

type Tab = "overview" | "vehicles" | "policies" | "documents" | "activity";

interface TabConfig {
  id: Tab;
  label: string;
  icon: typeof User;
}

const tabs: TabConfig[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "policies", label: "Policies", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "activity", label: "Activity", icon: Activity },
];

interface ClientDetailClientProps {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    county: string | null;
    status: string;
    created_at: string;
    notes: string | null;
  };
  activities: ActivityWithClient[];
  vehiclesCount: number;
  policiesCount: number;
  documentsCount: number;
}

export function ClientDetailClient({
  client,
  activities,
  vehiclesCount,
  policiesCount,
  documentsCount,
}: ClientDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const timelineItems = activities.map((a) => ({
    id: a.id,
    title: a.description,
    description: formatActivityTime(a.created_at),
    type: a.entity_type,
    action: a.action,
  }));

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-600 dark:bg-violet-900 dark:text-violet-300">
              {client.first_name[0]}
              {client.last_name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {client.first_name} {client.last_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                {client.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={client.status} />
        </div>

        {client.address && (
          <div className="mt-4 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5" />
            {client.address}
            {client.city && `, ${client.city}`}
            {client.county && `, ${client.county}`}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {vehiclesCount}
            </p>
            <p className="text-xs text-zinc-500">Vehicles</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {policiesCount}
            </p>
            <p className="text-xs text-zinc-500">Policies</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {documentsCount}
            </p>
            <p className="text-xs text-zinc-500">Documents</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-zinc-100 text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Activity Timeline */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-zinc-400" />
                  Recent Activity
                </h3>
                <button
                  onClick={() => setActiveTab("activity")}
                  className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
                >
                  View all
                </button>
              </div>
              <div className="p-5">
                {timelineItems.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No activity yet"
                    description="Activity will appear here as you interact with this client."
                  />
                ) : (
                  <Timeline items={timelineItems.slice(0, 10)} />
                )}
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Notes
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {client.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === "vehicles" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <Car className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Vehicle management
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              View and manage vehicles for {client.first_name}.
            </p>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === "policies" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <Shield className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Policy management
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              View and manage policies for {client.first_name}.
            </p>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Document management
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              View and manage documents for {client.first_name}.
            </p>
          </div>
        )}

        {/* Full Activity Tab */}
        {activeTab === "activity" && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Activity className="h-4 w-4 text-zinc-400" />
                Activity Log
              </h3>
            </div>
            <div className="p-5">
              {timelineItems.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="Activity will be tracked here automatically."
                />
              ) : (
                <Timeline items={timelineItems} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Component ───

interface TimelineItemData {
  id: string;
  title: string;
  description: string;
  type: string;
  action: string;
}

function Timeline({ items }: { items: TimelineItemData[] }) {
  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800" />

      {items.map((item) => {
        const icon = getTimelineIcon(item.type, item.action);
        const color = getTimelineColor(item.action);

        return (
          <div key={item.id} className="relative flex items-start gap-4 pb-5 last:pb-0">
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-950",
                color
              )}
            >
              {icon}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTimelineIcon(type: string, action: string) {
  const size = "h-3 w-3 text-white";

  if (action === "uploaded") return <Upload className={size} />;
  if (action === "completed") return <CheckCircle2 className={size} />;
  if (action === "sent") return <Bell className={size} />;
  if (action === "failed") return <XCircle className={size} />;
  if (action === "renewed") return <RefreshCw className={size} />;
  if (action === "requested") return <ClipboardList className={size} />;
  if (action === "created") return <Plus className={size} />;
  if (action === "checked") return <Shield className={size} />;

  return <Activity className={size} />;
}

function getTimelineColor(action: string) {
  if (action === "completed" || action === "created" || action === "renewed")
    return "bg-emerald-500";
  if (action === "failed" || action === "rejected")
    return "bg-red-500";
  if (action === "sent" || action === "approved")
    return "bg-blue-500";
  if (action === "uploaded" || action === "requested")
    return "bg-violet-500";
  if (action === "checked")
    return "bg-zinc-500";

  return "bg-zinc-400";
}

function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
