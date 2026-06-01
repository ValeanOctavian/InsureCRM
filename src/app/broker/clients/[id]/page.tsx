import { requireAuth } from "@/lib/auth/middleware";
import { createClient } from "@/lib/supabase/server";
import { getClientRelatedTimeline } from "@/features/activities/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ClientDetailClient } from "./client-detail-client";
import { notFound } from "next/navigation";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  await requireAuth();
  const { id } = await params;

  const supabase = await createClient();

  // Get client
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) {
    notFound();
  }

  // Get counts
  const [{ count: vehiclesCount }, { count: policiesCount }, { count: documentsCount }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id),
      supabase
        .from("policies")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id),
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id),
    ]);

  // Get activity timeline
  const activities = await getClientRelatedTimeline(id, client.broker_id);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={client.first_name + " " + client.last_name}
        description="Client profile"
      />

      <div className="mt-6">
        <ClientDetailClient
          client={{
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            city: client.city,
            county: client.county,
            status: client.status,
            created_at: client.created_at,
            notes: client.notes,
          }}
          activities={activities}
          vehiclesCount={vehiclesCount ?? 0}
          policiesCount={policiesCount ?? 0}
          documentsCount={documentsCount ?? 0}
        />
      </div>
    </div>
  );
}
