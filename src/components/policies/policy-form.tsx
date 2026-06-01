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
import { createPolicy, updatePolicy } from "@/features/policies/actions";
import { POLICY_TYPES } from "@/lib/utils";
import type { Policy, PolicyType } from "@/types";

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface VehicleOption {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

interface PolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  vehicles: VehicleOption[];
  policy?: Policy | null;
}

const policyTypeOptions = Object.values(POLICY_TYPES).map((t) => ({
  label: t,
  value: t,
}));

export function PolicyForm({
  open,
  onOpenChange,
  clients,
  vehicles,
  policy,
}: PolicyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState(policy?.client_id ?? "");
  const [vehicleId, setVehicleId] = useState(policy?.vehicle_id ?? "none");
  const [type, setType] = useState<PolicyType>(policy?.type ?? "RCA");
  const [insurerName, setInsurerName] = useState(policy?.insurer_name ?? "");
  const [policyNumber, setPolicyNumber] = useState(policy?.policy_number ?? "");
  const [startDate, setStartDate] = useState(policy?.start_date ?? "");
  const [endDate, setEndDate] = useState(policy?.end_date ?? "");
  const [premiumAmount, setPremiumAmount] = useState(
    policy?.premium_amount?.toString() ?? ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      clientId,
      vehicleId: vehicleId === "none" ? null : vehicleId,
      type,
      insurerName,
      policyNumber,
      startDate,
      endDate,
      premiumAmount: parseFloat(premiumAmount) || 0,
      status: (policy?.status ?? "active") as any,
    };

    const result = policy
      ? await updatePolicy(policy.id, input)
      : await createPolicy(input);

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
          <SheetTitle>{policy ? "Edit Policy" : "Add Policy"}</SheetTitle>
          <SheetDescription>
            {policy
              ? "Update the policy information. Status is calculated automatically based on the end date."
              : "Fill in the policy details. The status will be calculated automatically."}
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
              onChange={(e) => {
                setClientId(e.target.value);
                setVehicleId("none");
              }}
              placeholder="Select a client"
              options={clients.map((c) => ({
                label: `${c.first_name} ${c.last_name}`,
                value: c.id,
              }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle (for RCA/CASCO)</Label>
            <Select
              id="vehicleId"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="No vehicle (optional)"
              options={[
                { label: "No vehicle", value: "none" },
                ...vehicles.map((v) => ({
                  label: `${v.registration_number} - ${v.brand} ${v.model}`,
                  value: v.id,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Policy Type *</Label>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as PolicyType)}
                options={policyTypeOptions}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurerName">Insurer *</Label>
              <Input
                id="insurerName"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
                placeholder="e.g. Allianz"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number *</Label>
            <Input
              id="policyNumber"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="e.g. POL-2024-001"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="premiumAmount">Premium Amount *</Label>
            <Input
              id="premiumAmount"
              type="number"
              step="0.01"
              min="0"
              value={premiumAmount}
              onChange={(e) => setPremiumAmount(e.target.value)}
              placeholder="e.g. 1500.00"
              required
            />
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
                : policy
                  ? "Update Policy"
                  : "Add Policy"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
