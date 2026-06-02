import { getPortalClient, getPortalPoliciesForCards, getPortalPolicyDetail } from "@/features/portal/queries";
import { PortalDashboardClient } from "./portal-dashboard";

export default async function PortalDashboardPage() {
  const portal = await getPortalClient();

  if (!portal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-lg font-medium">Welcome to your insurance portal</p>
        <p className="mt-1 text-sm">Sign in to see your policies and documents.</p>
      </div>
    );
  }

  const policies = await getPortalPoliciesForCards();

  // Pre-fetch all details server-side so the sheet can open without an extra round-trip
  const detailById: Record<string, Awaited<ReturnType<typeof getPortalPolicyDetail>>> = {};
  await Promise.all(
    policies.map(async (p) => {
      detailById[p.id] = await getPortalPolicyDetail(p.id);
    })
  );

  return (
    <PortalDashboardClient
      policies={policies}
      detailById={detailById}
      firstName={portal.client.first_name}
    />
  );
}
