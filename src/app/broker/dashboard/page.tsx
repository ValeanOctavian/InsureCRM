import { getCurrentProfile } from "@/lib/auth/middleware";
import { getDashboardData } from "@/features/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ExpiringPoliciesTable } from "@/components/dashboard/expiring-policies-table";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { RenewalRequestsList } from "@/components/dashboard/renewal-requests-list";
import { AiInsights } from "@/components/dashboard/ai-insights";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Ban,
  RefreshCw,
  FileSearch,
  ClipboardList,
  Bell,
  BellRing,
} from "lucide-react";

export default async function BrokerDashboardPage() {
  const profile = await getCurrentProfile();
  console.log(profile, 'test 2')
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Unable to load profile. Please try again.</p>
      </div>
    );
  }

  const result = await getDashboardData(profile.id);

  if (result.error || !result.data) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of your insurance brokerage"
        />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <h3 className="font-semibold text-red-800 dark:text-red-200">
            Unable to load dashboard data
          </h3>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {result.error || "An unexpected error occurred."}
          </p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
            Make sure you have run the database migration and your Supabase project is connected.
          </p>
        </div>
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile.full_name.split(" ")[0]}! Here's your overview.`}
      />

      {/* KPI Cards — Row 1 */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Clients"
            value={data.stats.totalClients}
            icon={Users}
          />
          <KpiCard
            label="Active Policies"
            value={data.stats.activePolicies}
            icon={ShieldCheck}
            variant="success"
          />
          <KpiCard
            label="Expiring in 7 Days"
            value={data.stats.expiring7Days}
            icon={AlertTriangle}
            variant={data.stats.expiring7Days > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Expired Policies"
            value={data.stats.expiredPolicies}
            icon={Ban}
            variant={data.stats.expiredPolicies > 0 ? "danger" : "default"}
          />
        </div>

        {/* KPI Cards — Row 2 */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Expiring in 30 Days"
            value={data.stats.expiring30Days}
            icon={Clock}
            variant={data.stats.expiring30Days > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Renewal Requests"
            value={data.stats.pendingRenewals}
            icon={RefreshCw}
            variant={data.stats.pendingRenewals > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Documents Pending OCR"
            value={data.stats.pendingOcr}
            icon={FileSearch}
            variant={data.stats.pendingOcr > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Tasks Due Today"
            value={data.stats.tasksDueToday}
            icon={ClipboardList}
            variant={data.stats.tasksDueToday > 0 ? "warning" : "default"}
          />
        </div>

        {/* KPI Cards — Row 3: Reminders */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Reminders Sent Today"
            value={data.stats.remindersSentToday}
            icon={BellRing}
            variant={data.stats.remindersSentToday > 0 ? "success" : "default"}
          />
          <KpiCard
            label="Failed Reminders"
            value={data.stats.remindersFailed}
            icon={Bell}
            variant={data.stats.remindersFailed > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Need Reminder"
            value={data.stats.policiesNeedingReminder}
            icon={AlertTriangle}
            variant={data.stats.policiesNeedingReminder > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Expiring in 30 Days"
            value={data.stats.expiring30Days}
            icon={Clock}
            variant={data.stats.expiring30Days > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      {/* Expiring Policies + Today's Tasks */}
      <section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Expiring Soon
            </h2>
            <ExpiringPoliciesTable policies={data.expiringPolicies} />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Today&apos;s Tasks
            </h2>
            <TodayTasks tasks={data.todayTasks} />
          </div>
        </div>
      </section>

      {/* Recent Documents + Renewal Requests */}
      <section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Recent Documents
            </h2>
            <RecentDocuments documents={data.recentDocuments} />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Renewal Requests
            </h2>
            <RenewalRequestsList requests={data.renewalRequests} />
          </div>
        </div>
      </section>

      {/* AI Insights */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          AI Assistant
        </h2>
        <AiInsights />
      </section>
    </div>
  );
}
