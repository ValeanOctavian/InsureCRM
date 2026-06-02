import { redirect } from "next/navigation";
import { getPortalClient } from "@/features/portal/queries";
import { CompleteProfileForm } from "./complete-profile-form";
import { ROUTES } from "@/lib/utils";

export default async function CompleteProfilePage() {
  const portal = await getPortalClient();

  if (!portal) {
    redirect(ROUTES.PORTAL_LOGIN);
  }

  if (portal.client.profile_completed) {
    redirect(ROUTES.CLIENT.PORTAL);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Complete your profile
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We need a few more details required by Romanian insurance documents.
        </p>

        <CompleteProfileForm
          defaultFirstName={portal.client.first_name}
          defaultLastName={portal.client.last_name}
          defaultPhone={portal.client.phone ?? ""}
          defaultAddress={portal.client.address ?? ""}
          defaultCity={portal.client.city ?? ""}
          defaultCounty={portal.client.county ?? ""}
          defaultBirthDate={portal.client.birth_date ?? ""}
          defaultIdSeries={portal.client.id_series ?? ""}
          defaultIdNumber={portal.client.id_number ?? ""}
          defaultIdIssuedBy={portal.client.id_issued_by ?? ""}
          defaultIdIssuedDate={portal.client.id_issued_date ?? ""}
          defaultIdExpiryDate={portal.client.id_expiry_date ?? ""}
        />
      </div>
    </div>
  );
}
