"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { updateTaskStatus } from "@/features/tasks/actions";
import {
  ClipboardList,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithClient } from "@/types/dashboard";
import type { TaskStatus } from "@/types";

interface TaskKanbanProps {
  todo: TaskWithClient[];
  inProgress: TaskWithClient[];
  done: TaskWithClient[];
  onCreate: () => void;
  onEdit: (task: TaskWithClient) => void;
}

const columns: {
  key: TaskStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: "todo",
    label: "To Do",
    color: "text-zinc-500",
    bgColor: "bg-zinc-50 dark:bg-zinc-900/50",
    borderColor: "border-zinc-200 dark:border-zinc-800",
  },
  {
    key: "in_progress",
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900",
  },
  {
    key: "done",
    label: "Done",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-900",
  },
];

const priorityBorder: Record<string, string> = {
  high: "border-l-red-400",
  medium: "border-l-yellow-400",
  low: "border-l-blue-400",
};

export function TaskKanban({
  todo,
  inProgress,
  done,
  onCreate,
  onEdit,
}: TaskKanbanProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const columnData: Record<TaskStatus, TaskWithClient[]> = {
    todo,
    in_progress: inProgress,
    done,
    cancelled: [],
  };

  const handleDrop = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      setUpdatingId(taskId);
      setDragOverCol(null);
      await updateTaskStatus(taskId, newStatus);
      setUpdatingId(null);
      router.refresh();
    },
    [router]
  );

  const allEmpty = todo.length === 0 && inProgress.length === 0 && done.length === 0;

  if (allEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description="Create your first task to get started."
        />
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((col) => {
        const tasks = columnData[col.key];
        const isDragOver = dragOverCol === col.key;

        return (
          <div
            key={col.key}
            className={cn(
              "flex flex-col rounded-xl border bg-white p-4 dark:bg-zinc-950",
              col.borderColor,
              isDragOver && "ring-2 ring-zinc-400"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("taskId");
              if (taskId) handleDrop(taskId, col.key);
            }}
          >
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    col.bgColor,
                    col.color
                  )}
                >
                  {tasks.length}
                </span>
                <h3 className={cn("text-sm font-semibold", col.color)}>
                  {col.label}
                </h3>
              </div>
              {col.key === "todo" && (
                <button
                  onClick={onCreate}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  title="Add task"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Task cards */}
            <div className="flex-1 space-y-2">
              {tasks.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 py-8 text-xs text-zinc-400 dark:border-zinc-700">
                  Drop tasks here
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("taskId", task.id);
                    }}
                    onClick={() => onEdit(task)}
                    className={cn(
                      "cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950",
                      priorityBorder[task.priority] || "border-l-zinc-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2">
                        {task.title}
                      </p>
                      {updatingId === task.id && (
                        <Loader2 className="h-3 w-3 animate-spin text-zinc-400 flex-shrink-0" />
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.priority} />
                      {task.clients && (
                        <span className="text-[10px] text-zinc-400">
                          {task.clients.first_name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-[10px] text-zinc-400">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
