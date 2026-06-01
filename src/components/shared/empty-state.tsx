import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 dark:border-zinc-700 dark:bg-zinc-950">
      <Icon className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-500" />
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-center text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
