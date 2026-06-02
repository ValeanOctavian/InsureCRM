import type { NotificationProvider, NotificationMessage, NotificationResult } from "./types";
import type { ReminderChannel } from "@/types";

/**
 * SMS notification provider using Twilio.
 *
 * Requires the following environment variables:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_FROM_NUMBER  (E.164 format, e.g. +407xxxxxxxx)
 *
 * Falls back to log-only mode if credentials are not configured.
 */
export class SmsNotificationProvider implements NotificationProvider {
  readonly channel: ReminderChannel = "sms";

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config?: { accountSid?: string; authToken?: string; fromNumber?: string }) {
    this.accountSid = config?.accountSid ?? process.env.TWILIO_ACCOUNT_SID ?? "";
    this.authToken = config?.authToken ?? process.env.TWILIO_AUTH_TOKEN ?? "";
    this.fromNumber = config?.fromNumber ?? process.env.TWILIO_FROM_NUMBER ?? "";
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.log(
        "[SmsProvider] Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER). Logging SMS:"
      );
      console.log(`  To: ${message.to}`);
      console.log(`  Body: ${message.body}`);
      return { success: true, messageId: "logged" };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

    try {
      const form = new URLSearchParams();
      form.set("To", message.to);
      form.set("From", this.fromNumber);
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
          error: `Twilio API error (${response.status}): ${errorText}`,
        };
      }

      const data = (await response.json()) as { sid?: string };
      return { success: true, messageId: data.sid };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SMS send failed",
      };
    }
  }
}
