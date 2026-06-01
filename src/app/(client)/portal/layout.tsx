import { redirect } from "next/navigation";
import { getPortalClient } from "@/features/portal/queries";
import { PortalNav } from "./portal-nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portal = await getPortalClient();

  if (!portal) {
    redirect("/login?redirect=/portal");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Top header - visible on tablet/desktop */}
      <header className="sticky top-0 z-30 hidden border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 md:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
              IC
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                My Insurance Portal
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Welcome, {portal.client.first_name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
              IC
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              My Portal
            </span>
          </div>
          <span className="text-xs text-zinc-500">
            Hi, {portal.client.first_name}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>

      {/* Bottom navigation - mobile only + desktop sidebar */}
      <PortalNav />
    </div>
  );
}
