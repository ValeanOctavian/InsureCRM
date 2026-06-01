import type { LucideIcon } from "lucide-react";
import { getPortalClient, getPortalSummary, getPortalActivePolicies, getPortalExpiredPolicies } from "@/features/portal/queries";
import { PortalDashboardClient } from "./portal-dashboard-client";
import { PortalCTAButtons } from "./portal-cta-buttons";
import { MapPin, Phone, Mail, Shield, Car, FileText, RefreshCcw, AlertTriangle } from "lucide-react";

export default async function PortalDashboardPage() {
  const portal = await getPortalClient();

  if (!portal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg font-medium">Welcome to your insurance portal</p>
        <p className="mt-1 text-sm">Sign in to see your policies and documents.</p>
      </div>
    );
  }

  const [summary, activePolicies, expiredPolicies] = await Promise.all([
    getPortalSummary(),
    getPortalActivePolicies(),
    getPortalExpiredPolicies(),
  ]);

  const { client, broker } = portal;

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white shadow-sm dark:from-zinc-800 dark:to-zinc-900">
        <h1 className="text-xl font-semibold">
          Welcome back, {client.first_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-300">
          Here&apos;s a summary of your insurance portfolio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Shield}
          label="Active"
          value={summary.activePolicies}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expiring Soon"
          value={summary.expiringSoon}
          color="yellow"
        />
        <StatCard
          icon={Shield}
          label="Expired"
          value={summary.expiredPolicies}
          color="red"
        />
        <StatCard
          icon={Car}
          label="Vehicles"
          value={summary.vehicles}
          color="blue"
        />
        <StatCard
          icon={FileText}
          label="Documents"
          value={summary.documents}
          color="violet"
        />
        <StatCard
          icon={RefreshCcw}
          label="Pending Renewals"
          value={summary.pendingRenewals}
          color="orange"
        />
      </div>

      {/* Active Policies */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Active Policies
        </h2>
        {activePolicies.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            No active policies
          </div>
        ) : (
          <div className="space-y-2">
            {activePolicies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    {policy.type}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {policy.insurer_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {policy.policy_number} · Ends {new Date(policy.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium ${
                    policy.status === "expiring_soon"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {policy.status === "expiring_soon" ? "Expiring soon" : "Active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired Policies */}
      {expiredPolicies.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Expired Policies
          </h2>
          <div className="space-y-2">
            {expiredPolicies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900 dark:text-red-400">
                    {policy.type}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {policy.insurer_name}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {policy.policy_number} · Expired {new Date(policy.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={`/portal/renew?policy=${policy.id}`}
                  className="text-xs font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                >
                  Renew
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <PortalCTAButtons />

      {/* Contact Details + Broker Info */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* My Contact Details */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            My Contact Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Mail className="h-4 w-4 text-zinc-400" />
              {client.email || "—"}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Phone className="h-4 w-4 text-zinc-400" />
              {client.phone || "—"}
            </div>
            <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400" />
              <span>
                {[client.address, client.city, client.county]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </span>
            </div>
          </div>
          <PortalDashboardClient
            clientId={client.id}
            currentPhone={client.phone}
            currentAddress={client.address}
            currentCity={client.city}
            currentCounty={client.county}
          />
        </div>

        {/* Broker Contact */}
        <div id="broker-contact" className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Your Broker
          </h2>
          {broker ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {broker.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {broker.full_name}
                  </p>
                  <p className="text-xs text-zinc-500">Insurance Broker</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Mail className="h-4 w-4 text-zinc-400" />
                {broker.email}
              </div>
              {broker.phone && (
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  {broker.phone}
                </div>
              )}
              <a
                href={`mailto:${broker.email}`}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </a>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No broker assigned yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: "green" | "yellow" | "red" | "blue" | "violet" | "orange";
}) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
