import { BrokerSidebar } from "@/components/dashboard/broker-sidebar";
import { CommandMenu } from "@/components/layout/command-menu";
import { QuickActionsButton } from "@/components/layout/quick-actions-button";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function BrokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <BrokerSidebar />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {children}
      </main>

      {/* Global UI */}
      <CommandMenu />
      <QuickActionsButton />
      <MobileNav />
    </div>
  );
}
