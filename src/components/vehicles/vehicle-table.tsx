"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Car,
  Pencil,
  Trash2,
  Eye,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { VehicleForm } from "./vehicle-form";
import { VehicleDetail } from "./vehicle-detail";
import type { Vehicle } from "@/types";

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface VehicleTableProps {
  vehicles: (Vehicle & {
    clients: { first_name: string; last_name: string } | null;
  })[];
  clients: ClientOption[];
}

export function VehicleTable({ vehicles, clients }: VehicleTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailVehicleId, setDetailVehicleId] = useState<string | null>(null);

  const filtered = vehicles.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.registration_number.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.clients?.first_name.toLowerCase().includes(q) ||
      v.clients?.last_name.toLowerCase().includes(q) ||
      false
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    const { deleteVehicle } = await import("@/features/vehicles/actions");
    await deleteVehicle(id);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 py-2 pl-10 pr-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>
        <Button onClick={() => { setEditVehicle(null); setShowForm(true); }}>
          <Car className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Car}
          title={search ? "No vehicles match your search" : "No vehicles yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first vehicle to start tracking."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Registration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Added
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {filtered.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      onClick={() => setDetailVehicleId(vehicle.id)}
                      className="font-mono text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {vehicle.registration_number}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {vehicle.brand} {vehicle.model}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {vehicle.year}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {vehicle.clients
                      ? `${vehicle.clients.first_name} ${vehicle.clients.last_name}`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDate(vehicle.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDetailVehicleId(vehicle.id)}
                        title="View details, documents, and policies"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditVehicle(vehicle);
                          setShowForm(true);
                        }}
                        title="Edit vehicle"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(vehicle.id)}
                        title="Delete vehicle"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet */}
      <VehicleDetail
        vehicleId={detailVehicleId}
        onClose={() => setDetailVehicleId(null)}
      />

      {/* Edit/Add Form Sheet */}
      <VehicleForm
        open={showForm}
        onOpenChange={setShowForm}
        clients={clients}
        vehicle={editVehicle}
      />
    </div>
  );
}
