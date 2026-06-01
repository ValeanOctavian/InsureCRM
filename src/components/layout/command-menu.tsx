"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Car,
  Shield,
  FolderOpen,
  ClipboardList,
  Bell,
  Sparkles,
  Search,
  Loader2,
  FileText,
  type LucideIcon,
} from "lucide-react";

const STATIC_NAV = [
  { label: "Dashboard", href: "/broker/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/broker/clients", icon: Users },
  { label: "Vehicles", href: "/broker/vehicles", icon: Car },
  { label: "Policies", href: "/broker/policies", icon: Shield },
  { label: "Documents", href: "/broker/documents", icon: FolderOpen },
  { label: "Tasks", href: "/broker/tasks", icon: ClipboardList },
  { label: "Renewals", href: "/broker/renewals", icon: Bell },
  { label: "AI Assistant", href: "/broker/assistant", icon: Sparkles },
];

interface DynamicResult {
  label: string;
  href: string;
  icon: string;
  subtitle?: string;
}

/** Map icon name strings (from API) to LucideIcon components */
const iconNameToComponent: Record<string, LucideIcon> = {
  Users,
  Shield,
  Car,
  FileText,
};

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dynamicResults, setDynamicResults] = useState<DynamicResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Toggle on CMD+K / CTRL+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Global search function
  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setDynamicResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setDynamicResults(data.results ?? []);
      }
    } catch {
      setDynamicResults([]);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search, runSearch]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Group: for empty search show static nav; for non-empty show dynamic + filtered nav
  const showStaticNav = !search.trim();
  const hasResults = dynamicResults.length > 0;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Command Dialog */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-start justify-center pt-[15vh]",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <Command
          className={cn(
            "w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950",
            open ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
            {searching ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" />
            ) : (
              <Search className="mr-2 h-5 w-5 text-zinc-400" />
            )}
            <Command.Input
              placeholder="Search clients, policies, vehicles..."
              value={search}
              onValueChange={setSearch}
              className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-zinc-400 dark:text-zinc-50"
              autoFocus
            />
            <kbd className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-block dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              {searching ? "Searching..." : "No results found."}
            </Command.Empty>

            {/* Static Navigation */}
            {showStaticNav && (
              <Command.Group heading="Navigation">
                {STATIC_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href}
                      value={item.href}
                      onSelect={() => handleSelect(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 aria-selected:bg-zinc-100 dark:text-zinc-300 dark:aria-selected:bg-zinc-800"
                    >
                      <Icon className="h-4 w-4 text-zinc-400" />
                      <span>{item.label}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Dynamic Search Results */}
            {!showStaticNav && hasResults && (
              <Command.Group heading="Search Results">
                {dynamicResults.map((item) => {
                  const Icon = iconNameToComponent[item.icon] ?? LayoutDashboard;
                  return (
                    <Command.Item
                      key={item.href}
                      value={item.href}
                      onSelect={() => handleSelect(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 aria-selected:bg-zinc-100 dark:text-zinc-300 dark:aria-selected:bg-zinc-800"
                    >
                      <Icon className="h-4 w-4 text-zinc-400" />
                      <div className="flex flex-col">
                        <span>{item.label}</span>
                        {item.subtitle && (
                          <span className="text-xs text-zinc-400">{item.subtitle}</span>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {!showStaticNav && !hasResults && !searching && (
              <div className="py-6 text-center text-sm text-zinc-500">
                No results found for &ldquo;{search}&rdquo;
              </div>
            )}
          </Command.List>
        </Command>
      </div>
    </>
  );
}
