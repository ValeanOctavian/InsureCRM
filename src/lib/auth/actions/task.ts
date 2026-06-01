"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types";

export async function toggleTaskStatus(
  taskId: string,
  newStatus: string
): Promise<ActionResponse> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/broker/dashboard");
  return { success: true, data: undefined };
}
