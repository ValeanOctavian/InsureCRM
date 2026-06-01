import type { ReminderChannel } from "@/types";

/**
 * A notification message to be sent to a client.
 */
export interface NotificationMessage {
  to: string;          // Email address or phone number
  subject?: string;    // Email subject
  body: string;        // Email HTML or SMS text
  metadata?: Record<string, unknown>;
}

/**
 * Result of sending a notification.
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstract interface for notification providers.
 * Each provider handles a specific channel (email, SMS, WhatsApp).
 */
export interface NotificationProvider {
  readonly channel: ReminderChannel;
  send(message: NotificationMessage): Promise<NotificationResult>;
}
