import { getCurrentProfile } from "@/lib/auth/middleware";
import { createClient } from "@/lib/supabase/server";
import { getClientsForSelect, getVehicleOptions } from "@/features/vehicles/queries";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentUpload } from "@/components/documents/document-upload";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelative } from "@/lib/utils";
import { FileText, FileImage, FileSpreadsheet } from "lucide-react";
import type { Document } from "@/types";

const typeIcons: Record<string, typeof FileText> = {
  identity_card: FileText,
  car_registration: FileSpreadsheet,
  car_identity_book: FileText,
  address_certificate: FileText,
  policy: FileImage,
  other: FileText,
};

export default async function DocumentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <div className="p-6 text-zinc-500">Unable to load profile.</div>;
  }

  const supabase = await createClient();

  const [clients, vehicles, documentsResult] = await Promise.all([
    getClientsForSelect(profile.id),
    getVehicleOptions(profile.id),
    supabase
      .from("documents")
      .select("*, clients(first_name, last_name)")
      .eq("broker_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50) as unknown as Promise<{
      data: (Document & { clients: { first_name: string; last_name: string } | null })[] | null;
      error: any;
    }>,
  ]);

  const documents = documentsResult.data ?? [];

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Documents"
        description="Upload client documents with automatic quality check"
      />

      {/* Upload Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Upload New Document
        </h2>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Select a client, choose the document type, and upload. Images will be checked for quality before OCR.
        </p>
        <DocumentUpload clients={clients} vehicles={vehicles} />
      </div>

      {/* Documents List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Recent Documents
        </h2>

        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Uploaded documents will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Quality
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    OCR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {documents.map((doc) => {
                  const Icon = typeIcons[doc.type] || FileText;
                  return (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            <Icon className="h-4 w-4 text-zinc-500" />
                          </div>
                          <span className="text-sm capitalize text-zinc-900 dark:text-zinc-50">
                            {doc.type.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {doc.clients
                          ? `${doc.clients.first_name} ${doc.clients.last_name}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={doc.quality_status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={doc.ocr_status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatRelative(doc.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
