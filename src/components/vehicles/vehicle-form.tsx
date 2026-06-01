"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createVehicle, updateVehicle } from "@/features/vehicles/actions";
import type { Vehicle } from "@/types";

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  vehicle?: Vehicle | null;
}

export function VehicleForm({
  open,
  onOpenChange,
  clients,
  vehicle,
}: VehicleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState(vehicle?.client_id ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(
    vehicle?.registration_number ?? ""
  );
  const [brand, setBrand] = useState(vehicle?.brand ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(vehicle?.year?.toString() ?? "");
  const [vin, setVin] = useState(vehicle?.vin ?? "");
  const [engineCapacity, setEngineCapacity] = useState(
    vehicle?.engine_capacity?.toString() ?? ""
  );
  const [fuelType, setFuelType] = useState(vehicle?.fuel_type ?? "");
  const [documentNumber, setDocumentNumber] = useState(
    vehicle?.document_number ?? ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      clientId,
      registrationNumber,
      brand,
      model,
      year: parseInt(year),
      vin: vin || null,
      engineCapacity: engineCapacity ? parseInt(engineCapacity) : null,
      fuelType: fuelType || null,
      documentNumber: documentNumber || null,
    };

    const result = vehicle
      ? await updateVehicle(vehicle.id, input)
      : await createVehicle(input);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {vehicle ? "Edit Vehicle" : "Add Vehicle"}
          </SheetTitle>
          <SheetDescription>
            {vehicle
              ? "Update the vehicle information below."
              : "Fill in the vehicle details and link it to a client."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="clientId">Client *</Label>
            <Select
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Select a client"
              options={clients.map((c) => ({
                label: `${c.first_name} ${c.last_name}`,
                value: c.id,
              }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number *</Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. B 123 ABC"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. BMW"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. X5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Input
                id="fuelType"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                placeholder="e.g. Diesel"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vin">VIN / Serial Number</Label>
            <Input
              id="vin"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17-character VIN"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="engineCapacity">Engine Capacity (cc)</Label>
              <Input
                id="engineCapacity"
                type="number"
                value={engineCapacity}
                onChange={(e) => setEngineCapacity(e.target.value)}
                placeholder="e.g. 1998"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Vehicle document ID"
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : vehicle
                  ? "Update Vehicle"
                  : "Add Vehicle"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
