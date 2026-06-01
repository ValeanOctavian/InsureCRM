import { getPortalDocuments } from "@/features/portal/queries";
import { FileText, FileImage, FileSpreadsheet, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelative } from "@/lib/utils";
import { PortalDocumentUpload } from "./portal-document-upload";

const typeIcons: Record<string, typeof FileText> = {
  identity_card: FileText,
  car_registration: FileSpreadsheet,
  car_identity_book: FileText,
  address_certificate: FileText,
  policy: FileImage,
  other: FileText,
};

export default async function PortalDocumentsPage() {
  const documents = await getPortalDocuments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          My Documents
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Upload and view your insurance documents
        </p>
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Upload a Document
          </h2>
        </div>
        <PortalDocumentUpload />
      </div>

      {/* Document List */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          All Documents ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Documents uploaded by you or your broker will appear here."
          />
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const Icon = typeIcons[doc.type] || FileText;
              return (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Icon className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {doc.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatRelative(doc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={doc.quality_status} />
                    <StatusBadge status={doc.ocr_status} />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
