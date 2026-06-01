import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import type { ReminderChannel } from "@/types";

/**
 * WhatsApp notification provider — placeholder.
 *
 * TODO: Integrate with Twilio WhatsApp API, MessageBird, or WATI.
 * Environment variables needed:
 *   - WHATSAPP_API_KEY
 *   - WHATSAPP_FROM_NUMBER
 */
export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly channel: ReminderChannel = "whatsapp";

  async send(message: NotificationMessage): Promise<NotificationResult> {
    console.log("[WhatsAppProvider] WhatsApp sending not yet implemented. Logging message:");
    console.log(`  To: ${message.to}`);
    console.log(`  Body: ${message.body.substring(0, 200)}...`);

    return {
      success: true,
      messageId: "placeholder-whatsapp",
      error: undefined,
    };
  }
}
