"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface MobileNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const navItems: MobileNavItem[] = [
  { title: "Dashboard", href: "/broker/dashboard", icon: LayoutDashboard },
  { title: "Clients", href: "/broker/clients", icon: Users },
  { title: "Policies", href: "/broker/policies", icon: Shield },
  { title: "Tasks", href: "/broker/tasks", icon: ClipboardList },
  { title: "Assistant", href: "/broker/assistant", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 transition-colors",
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
