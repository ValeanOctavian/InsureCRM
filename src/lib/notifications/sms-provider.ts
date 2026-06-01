import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import type { ReminderChannel } from "@/types";

/**
 * SMS notification provider — placeholder.
 *
 * TODO: Integrate with Twilio, MessageBird, or similar SMS API.
 * Environment variables needed:
 *   - SMS_PROVIDER_API_KEY
 *   - SMS_FROM_NUMBER
 */
export class SmsNotificationProvider implements NotificationProvider {
  readonly channel: ReminderChannel = "sms";

  async send(message: NotificationMessage): Promise<NotificationResult> {
    console.log("[SmsProvider] SMS sending not yet implemented. Logging message:");
    console.log(`  To: ${message.to}`);
    console.log(`  Body: ${message.body.substring(0, 200)}...`);

    return {
      success: true,
      messageId: "placeholder-sms",
      error: undefined,
    };
  }
}
