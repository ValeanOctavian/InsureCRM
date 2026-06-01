import { requireAuth } from "@/lib/auth/middleware";
import { PageHeader } from "@/components/shared/page-header";

export default async function RenewalsPage() {
  await requireAuth();

  return (
    <div className="p-6">
      <PageHeader
        title="Renewals"
        description="Track policy renewals and send reminders"
      />

      <div className="mt-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Renewal reminders will be implemented in Module 9.
          </p>
        </div>
      </div>
    </div>
  );
}
