"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContactDetails } from "@/features/portal/actions";
import { Pencil, XCircle, CheckCircle2, Loader2 } from "lucide-react";

interface PortalDashboardClientProps {
  currentPhone: string | null;
  currentAddress: string | null;
  currentCity: string | null;
  currentCounty: string | null;
  clientId: string;
}

export function PortalDashboardClient({
  currentPhone,
  currentAddress,
  currentCity,
  currentCounty,
}: PortalDashboardClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [phone, setPhone] = useState(currentPhone ?? "");
  const [address, setAddress] = useState(currentAddress ?? "");
  const [city, setCity] = useState(currentCity ?? "");
  const [county, setCounty] = useState(currentCounty ?? "");

  const handleEdit = useCallback(() => {
    setEditing(true);
    setError(null);
    setSuccess(null);
    setPhone(currentPhone ?? "");
    setAddress(currentAddress ?? "");
    setCity(currentCity ?? "");
    setCounty(currentCounty ?? "");
  }, [currentPhone, currentAddress, currentCity, currentCounty]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await updateContactDetails({
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      county: county || undefined,
    });

    if (result.success) {
      setSuccess("Contact details updated.");
      setEditing(false);
      router.refresh();
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [phone, address, city, county, router]);

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={handleEdit} className="mt-2 text-xs">
        <Pencil className="mr-1.5 h-3 w-3" />
        Edit contact details
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Update Contact Details
      </p>

      <div className="space-y-2">
        <Label htmlFor="edit-phone" className="text-xs">Phone</Label>
        <Input
          id="edit-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+40 7XX XXX XXX"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-address" className="text-xs">Address</Label>
        <Input
          id="edit-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, number"
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="edit-city" className="text-xs">City</Label>
          <Input
            id="edit-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-county" className="text-xs">County</Label>
          <Input
            id="edit-county"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="County"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-1.5 rounded-md bg-green-50 p-2 text-xs text-green-600 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleCancel} className="text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={loading} className="text-xs">
          {loading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
