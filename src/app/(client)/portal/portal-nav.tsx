"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  User,
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";

const navItems = [
  { label: "Policies", href: "/portal", icon: LayoutDashboard },
  { label: "Documents", href: "/portal/documents", icon: FileText },
  { label: "Profile", href: "/portal/profile", icon: User },
];

export function PortalNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Portal navigation"
        className="fixed left-0 top-0 hidden h-full w-56 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex"
      >
        <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
            IC
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            My Portal
          </span>
        </div>
        <div className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Portal navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-zinc-900 dark:text-zinc-50" : ""
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => signOut()}
            aria-label="Sign out"
            className="flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium text-zinc-400 transition-colors dark:text-zinc-500"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}
