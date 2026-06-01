"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Car,
  FileText,
  FolderOpen,
  ClipboardList,
  Bell,
  Sparkles,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/auth/actions";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/broker/dashboard", icon: LayoutDashboard },
  { title: "Clients", href: "/broker/clients", icon: Users },
  { title: "Vehicles", href: "/broker/vehicles", icon: Car },
  { title: "Policies", href: "/broker/policies", icon: Shield },
  { title: "Documents", href: "/broker/documents", icon: FolderOpen },
  { title: "Tasks", href: "/broker/tasks", icon: ClipboardList },
  { title: "Renewals", href: "/broker/renewals", icon: Bell },
  { title: "AI Assistant", href: "/broker/assistant", icon: Sparkles },
];

export function BrokerSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-zinc-200 bg-white transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link
          href="/broker/dashboard"
          className={cn(
            "flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <Shield className="h-6 w-6" />
          ) : (
            <>
              <Shield className="h-6 w-6" />
              <span>InsureCRM</span>
            </>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <button
          onClick={() => signOut()}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
            collapsed && "justify-center px-2"
          )}
          title="Sign out"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
