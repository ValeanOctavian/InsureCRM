"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelative } from "@/lib/utils";
import { FileText, FileImage, FileSpreadsheet } from "lucide-react";
import type { DocumentWithClient } from "@/types/dashboard";

interface RecentDocumentsProps {
  documents: DocumentWithClient[];
}

const typeIcons: Record<string, typeof FileText> = {
  identity_card: FileText,
  car_registration: FileSpreadsheet,
  car_identity_book: FileText,
  address_certificate: FileText,
  policy: FileImage,
  other: FileText,
};

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents uploaded yet"
        description="Documents uploaded by you or your clients will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Document
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Client
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quality
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              OCR
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
                      <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
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

      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/broker/documents"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          View all documents →
        </Link>
      </div>
    </div>
  );
}
