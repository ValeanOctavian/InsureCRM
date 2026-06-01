import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import type { ReminderChannel } from "@/types";

/**
 * Email notification provider using Resend.
 *
 * Requires RESEND_API_KEY environment variable.
 * Falls back to a log-only mode if no API key is configured.
 */
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel: ReminderChannel = "email";

  private apiKey: string;
  private fromAddress: string;

  constructor(config?: { apiKey?: string; fromAddress?: string }) {
    this.apiKey = config?.apiKey ?? process.env.RESEND_API_KEY ?? "";
    this.fromAddress = config?.fromAddress ?? process.env.RESEND_FROM ?? "noreply@insurecrm.app";
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.apiKey) {
      console.log("[EmailProvider] No RESEND_API_KEY configured. Logging email:");
      console.log(`  To: ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
      console.log(`  Body: ${message.body.substring(0, 200)}...`);
      return { success: true, messageId: "logged" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: message.to,
          subject: message.subject,
          html: message.body,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `Resend API error (${response.status}): ${errorBody}`,
        };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Email send failed",
      };
    }
  }
}
