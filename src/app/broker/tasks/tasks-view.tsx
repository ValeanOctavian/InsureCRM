"use client";

import { useState, useCallback } from "react";
import { TaskList } from "@/components/tasks/task-list";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithClient } from "@/types/dashboard";
import type { Task } from "@/types";

interface TasksViewProps {
  tasks: TaskWithClient[];
  todo: TaskWithClient[];
  inProgress: TaskWithClient[];
  done: TaskWithClient[];
  clients: { id: string; first_name: string; last_name: string }[];
}

export function TasksView({
  tasks,
  todo,
  inProgress,
  done,
  clients,
}: TasksViewProps) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleCreate = useCallback(() => {
    setEditingTask(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((task: TaskWithClient) => {
    setEditingTask(task);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingTask(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "kanban"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
        </div>
      </div>

      {/* List View */}
      {view === "list" && (
        <TaskList
          tasks={tasks}
          onCreate={handleCreate}
          onEdit={handleEdit}
        />
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <TaskKanban
          todo={todo}
          inProgress={inProgress}
          done={done}
          onCreate={handleCreate}
          onEdit={handleEdit}
        />
      )}

      {/* Task Form Sheet */}
      <TaskForm
        open={formOpen}
        onOpenChange={handleFormClose}
        clients={clients}
        task={editingTask}
      />
    </div>
  );
}
