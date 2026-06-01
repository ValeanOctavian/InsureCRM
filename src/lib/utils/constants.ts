export const ROLES = {
  ADMIN: "admin",
  BROKER: "broker",
  CLIENT: "client",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const POLICY_STATUS = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring_soon",
  EXPIRED: "expired",
  RENEWED: "renewed",
  CANCELLED: "cancelled",
} as const;

export const POLICY_TYPES = {
  RCA: "RCA",
  CASCO: "CASCO",
  HOME: "HOME",
  TRAVEL: "TRAVEL",
  HEALTH: "HEALTH",
  OTHER: "OTHER",
} as const;

export const DOCUMENT_TYPES = {
  IDENTITY_CARD: "identity_card",
  CAR_REGISTRATION: "car_registration",
  CAR_IDENTITY_BOOK: "car_identity_book",
  ADDRESS_CERTIFICATE: "address_certificate",
  POLICY: "policy",
  OTHER: "other",
} as const;

export const QUALITY_STATUS = {
  PENDING: "pending",
  CLEAR: "clear",
  BLURRY: "blurry",
  REJECTED: "rejected",
} as const;

export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export const REMINDER_CHANNELS = {
  EMAIL: "email",
  SMS: "sms",
  WHATSAPP: "whatsapp",
} as const;

export const REMINDER_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
} as const;

export const CLIENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  LEAD: "lead",
} as const;

export const OCR_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const RENEWAL_REQUEST_STATUS = {
  REQUESTED: "requested",
  DOCUMENTS_NEEDED: "documents_needed",
  IN_PROGRESS: "in_progress",
  ISSUED: "issued",
  CANCELLED: "cancelled",
} as const;

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PAID: "paid",
  NOT_REQUIRED: "not_required",
} as const;

export const DEFAULT_RENEWAL_REMINDER_DAYS = 30;

export const APP_NAME = "InsureCRM";
export const APP_DESCRIPTION = "Insurance Broker CRM";

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  BROKER: {
    DASHBOARD: "/broker/dashboard",
    CLIENTS: "/broker/clients",
    VEHICLES: "/broker/vehicles",
    POLICIES: "/broker/policies",
    DOCUMENTS: "/broker/documents",
    TASKS: "/broker/tasks",
    RENEWALS: "/broker/renewals",
    ANALYTICS: "/broker/analytics",
  },
  CLIENT: {
    PORTAL: "/client/portal",
    POLICIES: "/client/portal/policies",
    DOCUMENTS: "/client/portal/documents",
    RENEW: "/client/portal/renew",
    PROFILE: "/client/portal/profile",
  },
} as const;
