"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { ClipboardList, Circle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import type { TaskWithClient } from "@/types/dashboard";
import { useState, useCallback } from "react";
import { updateTaskStatus } from "@/features/tasks/actions";
import type { TaskStatus } from "@/types";

interface TodayTasksProps {
  tasks: TaskWithClient[];
}

const priorityColors: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

export function TodayTasks({ tasks }: TodayTasksProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (taskId: string, currentStatus: string) => {
      setUpdatingId(taskId);
      const newStatus: TaskStatus =
        currentStatus === "todo"
          ? "done"
          : currentStatus === "done"
            ? "todo"
            : "done";
      await updateTaskStatus(taskId, newStatus);
      setUpdatingId(null);
      router.refresh();
    },
    [router]
  );

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No tasks due today"
        description="You're all caught up! Tasks that are due today will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href="/broker/tasks"
          className={cn(
            "flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
            priorityColors[task.priority] || "border-l-zinc-300"
          )}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggle(task.id, task.status);
            }}
            disabled={updatingId === task.id}
            className="mt-0.5 flex-shrink-0 text-zinc-400 hover:text-green-500 transition-colors disabled:opacity-50"
          >
            {updatingId === task.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : task.status === "done" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                {task.title}
              </p>
              <StatusBadge status={task.priority} />
            </div>
            {task.description && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                {task.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
              <span className="capitalize">{task.status.replace(/_/g, " ")}</span>
              {task.client_id && task.clients && (
                <span>
                  {task.clients.first_name} {task.clients.last_name}
                </span>
              )}
            </div>
          </div>

          <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-zinc-300 dark:text-zinc-600" />
        </Link>
      ))}

      <div className="pt-1">
        <Link
          href="/broker/tasks"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          View all tasks →
        </Link>
      </div>
    </div>
  );
}
