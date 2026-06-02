"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeClientProfile } from "@/lib/auth/portal-actions";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface CompleteProfileFormProps {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultAddress: string;
  defaultCity: string;
  defaultCounty: string;
  defaultBirthDate: string;
  defaultIdSeries: string;
  defaultIdNumber: string;
  defaultIdIssuedBy: string;
  defaultIdIssuedDate: string;
  defaultIdExpiryDate: string;
}

export function CompleteProfileForm(props: CompleteProfileFormProps) {
  const [firstName, setFirstName] = useState(props.defaultFirstName);
  const [lastName, setLastName] = useState(props.defaultLastName);
  const [phone, setPhone] = useState(props.defaultPhone);
  const [address, setAddress] = useState(props.defaultAddress);
  const [city, setCity] = useState(props.defaultCity);
  const [county, setCounty] = useState(props.defaultCounty);
  const [birthDate, setBirthDate] = useState(props.defaultBirthDate);
  const [idSeries, setIdSeries] = useState(props.defaultIdSeries);
  const [idNumber, setIdNumber] = useState(props.defaultIdNumber);
  const [idIssuedBy, setIdIssuedBy] = useState(props.defaultIdIssuedBy);
  const [idIssuedDate, setIdIssuedDate] = useState(props.defaultIdIssuedDate);
  const [idExpiryDate, setIdExpiryDate] = useState(props.defaultIdExpiryDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(false);

      const result = await completeClientProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        county: county.trim(),
        birthDate,
        idSeries: idSeries.trim().toUpperCase(),
        idNumber: idNumber.trim(),
        idIssuedBy: idIssuedBy.trim(),
        idIssuedDate,
        idExpiryDate,
      });

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Server action redirects on success
      setSuccess(true);
    },
    [firstName, lastName, phone, address, city, county, birthDate, idSeries, idNumber, idIssuedBy, idIssuedDate, idExpiryDate]
  );

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Profile saved — redirecting...
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Contact</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cp-firstName">First name</Label>
            <Input id="cp-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-lastName">Last name</Label>
            <Input id="cp-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cp-phone">Phone</Label>
            <Input id="cp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40 7XX XXX XXX" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cp-address">Address</Label>
            <Input id="cp-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, number" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-city">City</Label>
            <Input id="cp-city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-county">County</Label>
            <Input id="cp-county" value={county} onChange={(e) => setCounty(e.target.value)} required />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Personal</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cp-birthDate">Date of birth</Label>
            <Input id="cp-birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Identity card (Carte de Identitate)</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cp-idSeries">Series</Label>
            <Input id="cp-idSeries" value={idSeries} onChange={(e) => setIdSeries(e.target.value)} placeholder="AB" maxLength={2} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-idNumber">Number</Label>
            <Input id="cp-idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="123456" maxLength={6} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cp-idIssuedBy">Issued by</Label>
            <Input id="cp-idIssuedBy" value={idIssuedBy} onChange={(e) => setIdIssuedBy(e.target.value)} placeholder="SPCLEP / Politie" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-idIssuedDate">Issued date</Label>
            <Input id="cp-idIssuedDate" type="date" value={idIssuedDate} onChange={(e) => setIdIssuedDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-idExpiryDate">Expiry date</Label>
            <Input id="cp-idExpiryDate" type="date" value={idExpiryDate} onChange={(e) => setIdExpiryDate(e.target.value)} required />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save and continue"
          )}
        </Button>
      </div>
    </form>
  );
}
