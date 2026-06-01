import { getCurrentProfile } from "@/lib/auth/middleware";
import { getPolicies } from "@/features/policies/queries";
import { getVehicleOptions, getClientsForSelect } from "@/features/vehicles/queries";
import { PageHeader } from "@/components/shared/page-header";
import { PolicyTable } from "@/components/policies/policy-table";

interface PoliciesPageProps {
  searchParams?: Promise<{
    type?: string;
    status?: string;
  }>;
}

export default async function PoliciesPage({ searchParams }: PoliciesPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <div className="p-6 text-zinc-500">Unable to load profile.</div>;
  }

  const params = searchParams ? await searchParams : undefined;

  const [policies, clients, vehicleOptions] = await Promise.all([
    getPolicies(profile.id, {
      type: (params?.type as any) ?? undefined,
      status: (params?.status as any) ?? undefined,
    }),
    getClientsForSelect(profile.id),
    getVehicleOptions(profile.id),
  ]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Policies"
        description="Manage insurance policies, track expirations, and process renewals"
      />

      <PolicyTable
        policies={policies}
        clients={clients}
        vehicles={vehicleOptions}
      />
    </div>
  );
}
