import { getPortalClient } from "@/features/portal/queries";
import { PortalContactDetailsForm } from "../portal-contact-details-form";
import { MapPin, Phone, Mail, User, Shield } from "lucide-react";

export default async function PortalProfilePage() {
  const portal = await getPortalClient();

  if (!portal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg font-medium">Please sign in to view your profile</p>
      </div>
    );
  }

  const { client, profile, broker } = portal;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your personal information
        </p>
      </div>

      {/* Personal Info */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {client.first_name?.[0]}{client.last_name?.[0]}
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {client.first_name} {client.last_name}
            </h2>
            <p className="text-xs text-zinc-500">
              {client.cnp ? `CNP: ${client.cnp}` : "Client"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Mail className="h-4 w-4 text-zinc-400" />
            {client.email || "—"}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Phone className="h-4 w-4 text-zinc-400" />
            {client.phone || "Not set"}
          </div>
          <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400" />
            <span>
              {[client.address, client.city, client.county].filter(Boolean).join(", ") || "Address not set"}
            </span>
          </div>
        </div>

        <PortalContactDetailsForm
          clientId={client.id}
          currentPhone={client.phone}
          currentAddress={client.address}
          currentCity={client.city}
          currentCounty={client.county}
        />
      </div>

      {/* Romanian ID data */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Identity card
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-zinc-500">CNP</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-50">{client.cnp || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Date of birth</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{client.birth_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Series / Number</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {client.id_series || "—"} {client.id_number || ""}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Issued by</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{client.id_issued_by || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Issued date</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{client.id_issued_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Expiry date</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{client.id_expiry_date || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Account Information
        </h2>
        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Email</span>
            <span className="text-zinc-900 dark:text-zinc-50">{profile.email}</span>
          </div>
          <div className="flex justify-between">
            <span>Account type</span>
            <span className="capitalize text-zinc-900 dark:text-zinc-50">{profile.role}</span>
          </div>
          <div className="flex justify-between">
            <span>Member since</span>
            <span className="text-zinc-900 dark:text-zinc-50">
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Broker Info */}
      {broker && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Your Broker
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {broker.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{broker.full_name}</p>
              <p className="text-xs text-zinc-500">{broker.email}</p>
              {broker.phone && (
                <p className="text-xs text-zinc-500">{broker.phone}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
