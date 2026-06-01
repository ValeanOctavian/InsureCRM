"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Plus,
  Users,
  FileText,
  ClipboardList,
  Bell,
  X,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  shortcut?: string;
}

interface QuickActionsButtonProps {
  actions?: QuickAction[];
  onCreateClient?: () => void;
  onCreateTask?: () => void;
  onUploadDocument?: () => void;
  onSendReminder?: () => void;
}

export function QuickActionsButton({
  actions: customActions,
  onCreateClient,
  onCreateTask,
  onUploadDocument,
  onSendReminder,
}: QuickActionsButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultActions: QuickAction[] = [
    {
      id: "client",
      label: "New Client",
      icon: Users,
      action: onCreateClient ?? (() => router.push("/broker/clients")),
      shortcut: "C",
    },
    {
      id: "document",
      label: "Upload Document",
      icon: FileText,
      action: onUploadDocument ?? (() => router.push("/broker/documents")),
      shortcut: "D",
    },
    {
      id: "task",
      label: "Create Task",
      icon: ClipboardList,
      action: onCreateTask ?? (() => router.push("/broker/tasks")),
      shortcut: "T",
    },
    {
      id: "reminder",
      label: "Send Reminder",
      icon: Bell,
      action: onSendReminder ?? (() => router.push("/broker/renewals")),
      shortcut: "R",
    },
  ];

  const actions = customActions ?? defaultActions;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Menu Items */}
      <div
        className={cn(
          "absolute bottom-16 right-0 mb-2 flex flex-col items-end gap-2 transition-all duration-200",
          open
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => {
                action.action?.();
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-700 dark:hover:bg-zinc-800",
                "animate-in fade-in slide-in-from-bottom-2"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {action.label}
              </span>
              {action.shortcut && (
                <kbd className="ml-2 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
                  {action.shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200",
          open
            ? "bg-zinc-900 text-white rotate-45 dark:bg-zinc-50 dark:text-zinc-900"
            : "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
