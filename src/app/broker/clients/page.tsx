import { requireAuth } from "@/lib/auth/middleware";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { PageHeader } from "@/components/shared/page-header";
import { ClientsList } from "./clients-list";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function ClientsPage() {
  await requireAuth();
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="p-6">
        <PageHeader title="Clients" description="Manage your insurance clients" />
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Unable to load profile.</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, status, created_at")
    .eq("broker_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Clients"
        description="Manage your insurance clients"
        actions={
          <Link
            href="/broker/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
        }
      />

      <div className="mt-6">
        <ClientsList clients={clients ?? []} />
      </div>
    </div>
  );
}
