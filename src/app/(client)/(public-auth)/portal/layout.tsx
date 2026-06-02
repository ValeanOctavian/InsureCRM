import { Shield } from "lucide-react";
import Link from "next/link";

export default function PortalPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Branding header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"
          >
            <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <span>My Insurance Portal</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto px-6 py-4 text-center text-xs text-zinc-400">
          Secure customer self-service portal
        </div>
      </footer>
    </div>
  );
}
