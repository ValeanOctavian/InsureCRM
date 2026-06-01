import { requireAuth, getCurrentProfile } from "@/lib/auth/middleware";
import { getVehicles, getClientsForSelect } from "@/features/vehicles/queries";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleTable } from "@/components/vehicles/vehicle-table";

export default async function VehiclesPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <div className="p-6 text-zinc-500">Unable to load profile.</div>;
  }

  const [vehicles, clients] = await Promise.all([
    getVehicles(profile.id),
    getClientsForSelect(profile.id),
  ]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage insured vehicles and link them to clients"
      />

      <VehicleTable vehicles={vehicles} clients={clients} />
    </div>
  );
}
