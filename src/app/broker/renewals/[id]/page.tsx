import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/middleware";
import { PageHeader } from "@/components/shared/page-header";
import { getBrokerRenewalDetail } from "@/features/renewals";
import { RenewalDetail } from "./renewal-detail";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BrokerRenewalDetailPage({ params }: PageProps) {
  await requireAuth();
  const { id } = await params;

  const detail = await getBrokerRenewalDetail(id);
  if (!detail) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6">
      <Link
        href="/broker/renewals"
        className="mb-3 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to renewals
      </Link>
      <PageHeader
        title={detail.client ? `${detail.client.first_name} ${detail.client.last_name}` : "Renewal request"}
        description={detail.renewal.is_new_policy ? "New policy request" : "Policy renewal"}
      />

      <div className="mt-6">
        <RenewalDetail detail={detail} />
      </div>
    </div>
  );
}
