import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import type { ReminderChannel } from "@/types";

/**
 * WhatsApp notification provider using Twilio's WhatsApp Business API.
 *
 * Requires the following environment variables:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_WHATSAPP_FROM  (E.164 format, prefixed with `whatsapp:`, e.g. `whatsapp:+14155238886`)
 *
 * Twilio's WhatsApp sandbox number (+14155238886) works for development.
 * Falls back to log-only mode if credentials are not configured.
 */
export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly channel: ReminderChannel = "whatsapp";

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config?: { accountSid?: string; authToken?: string; fromNumber?: string }) {
    this.accountSid = config?.accountSid ?? process.env.TWILIO_ACCOUNT_SID ?? "";
    this.authToken = config?.authToken ?? process.env.TWILIO_AUTH_TOKEN ?? "";
    this.fromNumber = config?.fromNumber ?? process.env.TWILIO_WHATSAPP_FROM ?? "";
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.log(
        "[WhatsAppProvider] Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM). Logging message:"
      );
      console.log(`  To: ${message.to}`);
      console.log(`  Body: ${message.body}`);
      return { success: true, messageId: "logged" };
    }

    // Twilio's WhatsApp API requires the `whatsapp:` prefix on both ends.
    const toWithPrefix = message.to.startsWith("whatsapp:") ? message.to : `whatsapp:${message.to}`;
    const fromWithPrefix = this.fromNumber.startsWith("whatsapp:")
      ? this.fromNumber
      : `whatsapp:${this.fromNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

    try {
      const form = new URLSearchParams();
      form.set("To", toWithPrefix);
      form.set("From", fromWithPrefix);
      form.set("Body", message.body);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Twilio WhatsApp API error (${response.status}): ${errorText}`,
        };
      }

      const data = (await response.json()) as { sid?: string };
      return { success: true, messageId: data.sid };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "WhatsApp send failed",
      };
    }
  }
}
