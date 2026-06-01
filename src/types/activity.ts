// ─────────────────────── Activity/Audit Log ───────────────────────

export type ActivityEntityType =
  | "client"
  | "document"
  | "policy"
  | "vehicle"
  | "task"
  | "reminder"
  | "renewal_request";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "uploaded"
  | "completed"
  | "sent"
  | "failed"
  | "renewed"
  | "requested"
  | "approved"
  | "rejected"
  | "checked";

export interface ActivityLog {
  id: string;
  broker_id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  action: ActivityAction;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityWithClient {
  id: string;
  broker_id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  action: ActivityAction;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  clients?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

// ─────────────────────── Activity Timeline Item ───────────────────────

export interface TimelineItem {
  id: string;
  type: "activity" | "task" | "document" | "policy" | "renewal";
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  metadata?: Record<string, unknown>;
}
