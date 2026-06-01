"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { addDays, format } from "date-fns";
import { logActivity } from "@/features/activities/actions";
import type { ActionResponse } from "@/types";
import type { TaskStatus, TaskPriority, Task } from "@/types";

// ─── CRUD Actions ───

export interface TaskInput {
  title: string;
  description?: string;
  clientId?: string | null;
  policyId?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
}

export async function createTask(
  input: TaskInput
): Promise<ActionResponse<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.title.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        broker_id: profile.id,
        client_id: input.clientId ?? null,
        policy_id: input.policyId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        priority: input.priority,
        status: input.status,
        due_date: input.dueDate ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/broker/tasks");
    revalidatePath("/broker/dashboard");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create task",
    };
  }
}

export async function updateTask(
  taskId: string,
  input: TaskInput
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.title.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("tasks")
      .update({
        client_id: input.clientId ?? null,
        policy_id: input.policyId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        priority: input.priority,
        status: input.status,
        due_date: input.dueDate ?? null,
      })
      .eq("id", taskId)
      .eq("broker_id", profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/broker/tasks");
    revalidatePath("/broker/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update task",
    };
  }
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
      .eq("broker_id", profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log activity
    if (newStatus === "done") {
      logActivity({
        entityType: "task",
        entityId: taskId,
        action: "completed",
        description: `Task marked as done`,
      });
    }

    revalidatePath("/broker/tasks");
    revalidatePath("/broker/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update task status",
    };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("broker_id", profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/broker/tasks");
    revalidatePath("/broker/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete task",
    };
  }
}

// ─── Auto-Creation Actions ───

/**
 * Create a task for a policy expiring within 7 days.
 * Should be called daily by the reminder scheduler or cron.
 */
export async function autoCreateExpiringPolicyTasks(): Promise<ActionResponse<{ created: number }>> {
  const supabase = await createClient();
  const in7Days = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    // Find active policies expiring in exactly 7 days that don't already have a pending task
    const { data: policies } = await supabase
      .from("policies")
      .select("id, client_id, broker_id, policy_number, type, insurer_name")
      .in("status", ["active", "expiring_soon"])
      .eq("end_date", in7Days);

    let created = 0;

    for (const policy of policies ?? []) {
      // Check if task already exists for this policy
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("policy_id", policy.id)
        .in("status", ["todo", "in_progress"])
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Create task
      const { error } = await supabase.from("tasks").insert({
        broker_id: policy.broker_id,
        client_id: policy.client_id,
        policy_id: policy.id,
        title: `Policy ${policy.policy_number} (${policy.type}) expires in 7 days`,
        description: `${policy.insurer_name} — renewal needed by ${in7Days}`,
        priority: "high",
        status: "todo",
        due_date: in7Days,
      });

      if (!error) created++;
    }

    if (created > 0) {
      revalidatePath("/broker/tasks");
      revalidatePath("/broker/dashboard");
    }

    return { success: true, data: { created } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create expiring policy tasks",
    };
  }
}

/**
 * Create tasks for renewal requests submitted by clients.
 * Should be triggered when a client submits a renewal request.
 */
export async function autoCreateRenewalRequestTasks(
  clientId: string,
  policyId: string
): Promise<ActionResponse<{ id: string } | null>> {
  const supabase = await createClient();

  try {
    const { data: policy } = await supabase
      .from("policies")
      .select("policy_number, type, broker_id")
      .eq("id", policyId)
      .single();

    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    const { data, error } = await supabase.from("tasks").insert({
      broker_id: policy.broker_id,
      client_id: clientId,
      policy_id: policyId,
      title: `Renewal request for ${policy.type} — ${policy.policy_number}`,
      description: "Client has requested renewal. Review and process the request.",
      priority: "medium",
      status: "todo",
    }).select("id").single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/broker/tasks");
    revalidatePath("/broker/dashboard");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create renewal request task",
    };
  }
}

/**
 * Create a task for a document that failed OCR.
 */
export async function autoCreateOcrFailedTask(
  documentId: string,
  clientId: string,
  documentType: string
): Promise<ActionResponse<{ id: string } | null>> {
  const supabase = await createClient();

  try {
    const { data: doc } = await supabase
      .from("documents")
      .select("broker_id")
      .eq("id", documentId)
      .single();

    if (!doc) {
      return { success: false, error: "Document not found" };
    }

    // Check if a pending task already exists for this document
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("policy_id", documentId)
      .in("status", ["todo", "in_progress"])
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, data: null };
    }

    const { data, error } = await supabase.from("tasks").insert({
      broker_id: doc.broker_id,
      client_id: clientId,
      title: `OCR failed for ${documentType.replace(/_/g, " ")} document`,
      description: "The document could not be processed automatically. Please review and retry OCR or enter data manually.",
      priority: "medium",
      status: "todo",
    }).select("id").single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/broker/tasks");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create OCR failed task",
    };
  }
}

/**
 * Create tasks for clients missing required documents.
 * E.g., clients without an identity_card uploaded.
 */
export async function autoCreateMissingDocumentTasks(
  profileId: string
): Promise<ActionResponse<{ created: number }>> {
  const supabase = await createClient();

  try {
    // Find active clients who have no identity_card document
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("broker_id", profileId)
      .eq("status", "active");

    let created = 0;

    for (const client of clients ?? []) {
      // Check if client has an identity_card document
      const { data: docs } = await supabase
        .from("documents")
        .select("id")
        .eq("client_id", client.id)
        .eq("type", "identity_card")
        .limit(1);

      if (docs && docs.length > 0) continue; // Has identity card

      // Check if a pending task already exists for this
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("client_id", client.id)
        .ilike("title", "%identity card%")
        .in("status", ["todo", "in_progress"])
        .limit(1);

      if (existing && existing.length > 0) continue; // Already has a task

      // Create task
      const { error } = await supabase.from("tasks").insert({
        broker_id: profileId,
        client_id: client.id,
        title: `Missing identity card for ${client.first_name} ${client.last_name}`,
        description: "This client has not uploaded an identity card document. Request one from the client.",
        priority: "low",
        status: "todo",
      });

      if (!error) created++;
    }

    if (created > 0) {
      revalidatePath("/broker/tasks");
      revalidatePath("/broker/dashboard");
    }

    return { success: true, data: { created } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create missing document tasks",
    };
  }
}
