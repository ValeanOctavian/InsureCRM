import { redirect } from "next/navigation";
import { getPortalClient, getPortalPolicyDetail } from "@/features/portal/queries";
import { PolicyRequestWizard } from "./policy-request-wizard";

interface PageProps {
  searchParams: Promise<{ policy?: string; wizard?: string }>;
}

export default async function PolicyRequestPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const portal = await getPortalClient();
  if (!portal) redirect("/portal/login");

  const policyId = params.policy ?? null;
  const wizardMode = params.wizard === "1";

  // If a policyId was passed, fetch its summary
  let policySummary: {
    id: string;
    insurer_name: string;
    policy_number: string;
    type: import("@/types").PolicyType;
    end_date: string;
    vehicle: { registration_number: string; brand: string; model: string } | null;
  } | null = null;

  if (policyId) {
    const detail = await getPortalPolicyDetail(policyId);
    if (detail) {
      policySummary = {
        id: detail.policy.id,
        insurer_name: detail.policy.insurer_name,
        policy_number: detail.policy.policy_number,
        type: detail.policy.type,
        end_date: detail.policy.end_date,
        vehicle: detail.vehicle
          ? {
              registration_number: detail.vehicle.registration_number,
              brand: detail.vehicle.brand,
              model: detail.vehicle.model,
            }
          : null,
      };
    }
  }

  return (
    <PolicyRequestWizard
      policy={policySummary}
      wizardMode={wizardMode}
      firstName={portal.client.first_name}
    />
  );
}
