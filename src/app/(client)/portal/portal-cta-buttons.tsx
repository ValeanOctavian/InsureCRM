"use client";

import { Phone, RefreshCcw, FileText } from "lucide-react";

export function PortalCTAButtons() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <a
        href="/portal/renew"
        className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <RefreshCcw className="h-4 w-4" />
        Request Renewal
      </a>
      <a
        href="/portal/documents"
        className="flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <FileText className="h-4 w-4" />
        Upload Document
      </a>
      <button
        onClick={() => {
          const contact = document.getElementById("broker-contact");
          contact?.scrollIntoView({ behavior: "smooth" });
        }}
        className="flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <Phone className="h-4 w-4" />
        Contact Broker
      </button>
    </div>
  );
}
