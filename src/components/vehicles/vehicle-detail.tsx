"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { fetchVehicleDetail } from "@/features/vehicles/actions";
import type { VehicleDetailData } from "@/features/vehicles/queries";

interface VehicleDetailProps {
  vehicleId: string | null;
  onClose: () => void;
}

export function VehicleDetail({ vehicleId, onClose }: VehicleDetailProps) {
  const [data, setData] = useState<VehicleDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchVehicleDetail(vehicleId)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load vehicle details");
        setLoading(false);
      });
  }, [vehicleId]);

  return (
    <Sheet open={!!vehicleId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : data ? (
          <>
            <SheetHeader>
              <SheetTitle>
                {data.vehicle.brand} {data.vehicle.model}
              </SheetTitle>
              <SheetDescription>
                {data.vehicle.registration_number} · {data.vehicle.year}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              {/* Vehicle Info */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Vehicle Details
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-500">Client</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {data.vehicle.clients
                        ? `${data.vehicle.clients.first_name} ${data.vehicle.clients.last_name}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">VIN</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {data.vehicle.vin || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Engine Capacity</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {data.vehicle.engine_capacity
                        ? `${data.vehicle.engine_capacity} cc`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Fuel Type</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {data.vehicle.fuel_type || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Document Number</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {data.vehicle.document_number || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Related Policies */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Related Policies ({data.policies.length})
                </h4>
                {data.policies.length === 0 ? (
                  <p className="text-sm text-zinc-500">No policies linked to this vehicle.</p>
                ) : (
                  <div className="space-y-2">
                    {data.policies.map((policy) => (
                      <div
                        key={policy.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {policy.type} · {policy.policy_number}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {policy.insurer_name} · {formatDate(policy.start_date)} – {formatDate(policy.end_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(policy.premium_amount)}
                          </span>
                          <StatusBadge status={policy.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Documents ({data.documents.length})
                </h4>
                {data.documents.length === 0 ? (
                  <p className="text-sm text-zinc-500">No documents linked to this vehicle.</p>
                ) : (
                  <div className="space-y-2">
                    {data.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div>
                          <p className="text-sm capitalize text-zinc-900 dark:text-zinc-50">
                            {doc.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Uploaded {formatDate(doc.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={doc.ocr_status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">Vehicle not found.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
