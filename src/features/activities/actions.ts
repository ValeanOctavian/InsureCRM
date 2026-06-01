"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import type { ActivityAction, ActivityEntityType } from "@/types/activity";

interface LogActivityParams {
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();

  await supabase.from("activity_logs").insert({
    broker_id: profile.id,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    description: params.description,
    metadata: params.metadata ?? null,
  });
}
