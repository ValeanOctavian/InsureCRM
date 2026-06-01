"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ClipboardList,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { deleteTask, updateTaskStatus } from "@/features/tasks/actions";
import { TASK_STATUS, TASK_PRIORITY } from "@/lib/utils";
import type { TaskWithClient } from "@/types/dashboard";
import type { TaskStatus } from "@/types";

interface TaskListProps {
  tasks: TaskWithClient[];
  onCreate: () => void;
  onEdit: (task: TaskWithClient) => void;
}

const statusFilterOptions = [
  { label: "All Statuses", value: "all" },
  ...Object.values(TASK_STATUS).map((s) => ({
    label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s,
  })),
];

const priorityFilterOptions = [
  { label: "All Priorities", value: "all" },
  ...Object.values(TASK_PRIORITY).map((p) => ({
    label: p.charAt(0).toUpperCase() + p.slice(1),
    value: p,
  })),
];

export function TaskList({ tasks, onCreate, onEdit }: TaskListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.clients
          ? `${t.clients.first_name} ${t.clients.last_name}`.toLowerCase().includes(q)
          : false)
      );
    }
    return true;
  });

  const handleStatusToggle = useCallback(
    async (taskId: string, currentStatus: string) => {
      setUpdatingId(taskId);
      const newStatus: TaskStatus =
        currentStatus === "todo"
          ? "in_progress"
          : currentStatus === "in_progress"
            ? "done"
            : "todo";
      await updateTaskStatus(taskId, newStatus);
      setUpdatingId(null);
      router.refresh();
    },
    [router]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      if (!confirm("Delete this task?")) return;
      await deleteTask(taskId);
      router.refresh();
    },
    [router]
  );

  if (tasks.length === 0) {
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 text-sm shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:placeholder:text-zinc-500"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={statusFilterOptions}
          className="w-40"
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={priorityFilterOptions}
          className="w-40"
        />
        <Button onClick={onCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Task count */}
      <p className="text-xs text-zinc-500">
        Showing {filtered.length} of {tasks.length} tasks
      </p>

      {/* Task rows */}
      <div className="space-y-2">
        {filtered.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            {/* Status toggle */}
            <button
              onClick={() => handleStatusToggle(task.id, task.status)}
              disabled={updatingId === task.id}
              className="mt-0.5 flex-shrink-0 text-zinc-400 hover:text-green-500 transition-colors disabled:opacity-50"
            >
              {updatingId === task.id ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : task.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      task.status === "done"
                        ? "text-zinc-400 line-through"
                        : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={task.priority} />
                  <StatusBadge status={task.status} />
                  {task.due_date && new Date(task.due_date) <= new Date() && task.status !== "done" && (
                    <span className="text-[10px] font-medium text-red-500">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                {task.clients && (
                  <span>
                    {task.clients.first_name} {task.clients.last_name}
                  </span>
                )}
                {task.policy_id && <span>Linked to policy</span>}
                {task.due_date && (
                  <span>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => onEdit(task)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                title="Edit task"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-zinc-500">
          No tasks match your filters.
        </div>
      )}
    </div>
  );
}
