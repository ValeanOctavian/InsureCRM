"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTask, updateTask } from "@/features/tasks/actions";
import { TASK_STATUS, TASK_PRIORITY } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types";

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  task?: Task | null;
  defaultClientId?: string;
  defaultPolicyId?: string;
}

const statusOptions = Object.values(TASK_STATUS).map((t) => ({
  label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  value: t,
}));

const priorityOptions = Object.values(TASK_PRIORITY).map((p) => ({
  label: p.charAt(0).toUpperCase() + p.slice(1),
  value: p,
}));

export function TaskForm({
  open,
  onOpenChange,
  clients,
  task,
  defaultClientId,
  defaultPolicyId,
}: TaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [clientId, setClientId] = useState(
    task?.client_id ?? defaultClientId ?? ""
  );
  const [policyId] = useState(task?.policy_id ?? defaultPolicyId ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium"
  );
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      title: title.trim(),
      description: description.trim() || undefined,
      clientId: clientId || null,
      policyId: policyId || null,
      priority,
      status,
      dueDate: dueDate || null,
    };

    const result = task
      ? await updateTask(task.id, input)
      : await createTask(input);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error);
    }

    setLoading(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{task ? "Edit Task" : "Create Task"}</SheetTitle>
          <SheetDescription>
            {task
              ? "Update the task details."
              : "Create a new task to track work."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review policy renewal documents"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                options={priorityOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                options={statusOptions}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-client">Assign to Client</Label>
            <Select
              id="task-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="No client (optional)"
              options={[
                { label: "No client", value: "" },
                ...clients.map((c) => ({
                  label: `${c.first_name} ${c.last_name}`,
                  value: c.id,
                })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due">Due Date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : task
                  ? "Update Task"
                  : "Create Task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
