import { createClient } from "@/lib/supabase/server";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import type { TaskWithClient } from "@/types/dashboard";

export interface TaskFilters {
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  clientId?: string;
  search?: string;
}

export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * Fetch tasks for a broker with optional filters.
 */
export async function getTasks(
  profileId: string,
  filters?: TaskFilters
): Promise<TaskWithClient[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("*, clients(first_name, last_name)")
    .eq("broker_id", profileId);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const { data } = (await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200)) as unknown as { data: TaskWithClient[] | null };

  return data ?? [];
}

/**
 * Get tasks grouped by status for Kanban view.
 */
export async function getTasksGrouped(
  profileId: string,
  filters?: Omit<TaskFilters, "status">
): Promise<Record<TaskStatus, TaskWithClient[]>> {
  const allTasks = await getTasks(profileId, { ...filters, status: "all" });

  return {
    todo: allTasks.filter((t) => t.status === "todo"),
    in_progress: allTasks.filter((t) => t.status === "in_progress"),
    done: allTasks.filter((t) => t.status === "done"),
    cancelled: allTasks.filter((t) => t.status === "cancelled"),
  };
}

/**
 * Get a single task by ID.
 */
export async function getTaskById(
  taskId: string,
  profileId: string
): Promise<TaskWithClient | null> {
  const supabase = await createClient();

  const { data } = (await supabase
    .from("tasks")
    .select("*, clients(first_name, last_name)")
    .eq("id", taskId)
    .eq("broker_id", profileId)
    .single()) as unknown as { data: TaskWithClient | null };

  return data;
}

/**
 * Get clients for the task form dropdown.
 */
export async function getClientsForTaskForm(
  profileId: string
): Promise<ClientOption[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("broker_id", profileId)
    .order("first_name", { ascending: true });

  return data ?? [];
}
