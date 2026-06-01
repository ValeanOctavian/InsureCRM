import type { Role } from "@/lib/utils";

// ─────────────────────── Profiles ───────────────────────

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  broker_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Clients ───────────────────────

export type ClientStatus = "active" | "inactive" | "lead";

export interface Client {
  id: string;
  broker_id: string;
  first_name: string;
  last_name: string;
  cnp: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Vehicles ───────────────────────

export interface Vehicle {
  id: string;
  client_id: string;
  broker_id: string;
  registration_number: string;
  vin: string | null;
  brand: string;
  model: string;
  year: number;
  engine_capacity: number | null;
  fuel_type: string | null;
  document_number: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Policies ───────────────────────

export type PolicyStatus = "active" | "expiring_soon" | "expired" | "renewed" | "cancelled";
export type PolicyType = "RCA" | "CASCO" | "HOME" | "TRAVEL" | "HEALTH" | "OTHER";

export interface Policy {
  id: string;
  client_id: string;
  vehicle_id: string | null;
  broker_id: string;
  type: PolicyType;
  insurer_name: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Documents ───────────────────────

export type DocumentType =
  | "identity_card"
  | "car_registration"
  | "car_identity_book"
  | "address_certificate"
  | "policy"
  | "other";

export type QualityStatus = "pending" | "clear" | "blurry" | "rejected";
export type OcrStatus = "pending" | "processing" | "completed" | "failed";

export interface Document {
  id: string;
  client_id: string;
  vehicle_id: string | null;
  broker_id: string;
  type: DocumentType;
  file_url: string;
  quality_status: QualityStatus;
  ocr_status: OcrStatus;
  extracted_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Tasks ───────────────────────

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  broker_id: string;
  client_id: string | null;
  policy_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Reminders ───────────────────────

export type ReminderChannel = "email" | "sms" | "whatsapp";
export type ReminderStatus = "pending" | "sent" | "failed";

export interface Reminder {
  id: string;
  broker_id: string;
  client_id: string;
  policy_id: string;
  channel: ReminderChannel;
  scheduled_for: string;
  sent_at: string | null;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}

// ─────────────────────── Renewal Requests ───────────────────────

export type RenewalRequestStatus =
  | "requested"
  | "documents_needed"
  | "in_progress"
  | "issued"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "not_required";

export interface RenewalRequest {
  id: string;
  client_id: string;
  broker_id: string;
  policy_id: string;
  status: RenewalRequestStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}
