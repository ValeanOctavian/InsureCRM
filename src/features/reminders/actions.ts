"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { logActivity } from "@/features/activities/actions";
import {
  EmailNotificationProvider,
  SmsNotificationProvider,
  WhatsAppNotificationProvider,
} from "@/lib/notifications";
import { renderRenewalReminderEmail } from "@/emails/renewal-reminder";
import { renderRenewalReminderSms } from "@/emails/sms-reminder";
import { renderRenewalReminderWhatsApp } from "@/emails/whatsapp-reminder";
import {
  runSchedulerForWindow,
  hasReminderBeenSentToday,
  createReminderRecord,
  updateReminderStatus,
} from "./scheduler";
import type { ActionResponse, ReminderChannel } from "@/types";
import type { ReminderWindow, SchedulerRunResult } from "./scheduler";

function buildPortalLink(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal`;
}

/**
 * Send a renewal reminder now for a specific policy, on the specified channel
 * (or all 3 channels if `channel` is omitted).
 *
 * Channels are skipped silently if the client has no contact for that channel.
 */
export async function sendReminderNow(
  policyId: string,
  channel?: ReminderChannel,
  options?: { asBrokerId?: string }
): Promise<ActionResponse<{ sent: ReminderChannel[] }>> {
  // When called from a cron route, the caller passes the broker id directly.
  let profile: { id: string } | null = null;
  if (options?.asBrokerId) {
    profile = { id: options.asBrokerId };
  } else {
    const p = await getCurrentProfile();
    profile = p ? { id: p.id } : null;
  }
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // In cron mode (asBrokerId set) use the admin client to bypass RLS;
    // otherwise the user's session-bound client enforces broker ownership.
    const supabase = options?.asBrokerId
      ? createAdminClient()
      : await createClient();

    const { data: policy } = await supabase
      .from("policies")
      .select(
        `
        *,
        clients(id, first_name, last_name, email, phone),
        vehicles(registration_number),
        profiles!policies_broker_id_fkey ( id, full_name, email, phone )
      `
      )
      .eq("id", policyId)
      .eq("broker_id", profile.id)
      .single();

    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    const client = (Array.isArray(policy.clients) ? policy.clients[0] : policy.clients) as
      | { id: string; first_name: string; last_name: string; email: string | null; phone: string | null }
      | null;
    const vehicle = (Array.isArray(policy.vehicles) ? policy.vehicles[0] : policy.vehicles) as
      | { registration_number: string }
      | null;
    const broker = (Array.isArray(policy.profiles) ? policy.profiles[0] : policy.profiles) as
      | { id: string; full_name: string; email: string; phone: string | null }
      | null;

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const expirationDate = new Date(policy.end_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    const renewalLink = buildPortalLink();
    const clientName = `${client.first_name} ${client.last_name}`;

    const channels: ReminderChannel[] = channel ? [channel] : ["email", "sms", "whatsapp"];
    const sent: ReminderChannel[] = [];
    const errors: string[] = [];
    const useAdmin = !!options?.asBrokerId;

    for (const ch of channels) {
      // Dedupe: skip if already sent today on this channel
      const alreadySent = await hasReminderBeenSentToday(policyId, ch, useAdmin);
      if (alreadySent) continue;

      // Create reminder record
      const reminderId = await createReminderRecord({
        broker_id: policy.broker_id,
        client_id: client.id,
        policy_id: policyId,
        channel: ch,
        scheduled_for: new Date().toISOString(),
      }, useAdmin);

      if (!reminderId) {
        errors.push(`${ch}: failed to create reminder record`);
        continue;
      }

      let error: string | null = null;

      switch (ch) {
        case "email": {
          if (!client.email) {
            error = "client has no email";
            break;
          }
          const html = renderRenewalReminderEmail({
            clientName,
            policyType: policy.type,
            policyNumber: policy.policy_number,
            insurerName: policy.insurer_name,
            vehicleRegistration: vehicle?.registration_number ?? null,
            expirationDate: policy.end_date,
            daysRemaining,
            renewalLink,
            brokerName: broker?.full_name,
            brokerEmail: broker?.email,
            brokerPhone: broker?.phone,
          });
          const result = await new EmailNotificationProvider().send({
            to: client.email,
            subject: `Renewal Reminder: Your ${policy.type} policy expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
            body: html,
          });
          error = result.success ? null : result.error ?? "email send failed";
          break;
        }
        case "sms": {
          if (!client.phone) {
            error = "client has no phone";
            break;
          }
          const body = renderRenewalReminderSms({
            clientName,
            policyType: policy.type,
            policyNumber: policy.policy_number,
            insurerName: policy.insurer_name,
            daysRemaining,
            expirationDate: policy.end_date,
            renewalLink,
            brokerName: broker?.full_name,
          });
          const result = await new SmsNotificationProvider().send({ to: client.phone, body });
          error = result.success ? null : result.error ?? "sms send failed";
          break;
        }
        case "whatsapp": {
          if (!client.phone) {
            error = "client has no phone";
            break;
          }
          const body = renderRenewalReminderWhatsApp({
            clientName,
            policyType: policy.type,
            policyNumber: policy.policy_number,
            insurerName: policy.insurer_name,
            vehicleRegistration: vehicle?.registration_number ?? null,
            expirationDate: policy.end_date,
            daysRemaining,
            renewalLink,
            brokerName: broker?.full_name,
            brokerPhone: broker?.phone,
          });
          const result = await new WhatsAppNotificationProvider().send({
            to: client.phone,
            body,
          });
          error = result.success ? null : result.error ?? "whatsapp send failed";
          break;
        }
      }

      if (error) {
        await updateReminderStatus(reminderId, "failed", useAdmin);
        errors.push(`${ch}: ${error}`);
      } else {
        await updateReminderStatus(reminderId, "sent", useAdmin);
        sent.push(ch);

        if (!useAdmin) {
          logActivity({
            entityType: "reminder",
            entityId: reminderId,
            action: "sent",
            description: `Renewal reminder sent to ${clientName} via ${ch} for ${policy.type} policy`,
            metadata: { policyId, channel: ch },
          });
        }
      }
    }

    revalidatePath("/broker/dashboard");
    revalidatePath("/broker/policies");
    revalidatePath("/broker/renewals");

    if (sent.length === 0) {
      return {
        success: false,
        error: errors.length > 0 ? errors.join("; ") : "No channels available for this client",
      };
    }

    return {
      success: true,
      data: { sent },
      message:
        sent.length === 1
          ? `Reminder sent via ${sent[0]}.`
          : `Reminders sent via ${sent.join(", ")}.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send reminder",
    };
  }
}

/**
 * Manually trigger the scheduler for a specific time window.
 * e.g., sendRemindersForWindow(30) sends reminders for policies expiring in 30 days
 * on all 3 channels.
 */
export async function sendRemindersForWindow(
  days: ReminderWindow
): Promise<ActionResponse<SchedulerRunResult>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await runSchedulerForWindow(days);

    revalidatePath("/broker/dashboard");
    revalidatePath("/broker/policies");
    revalidatePath("/broker/renewals");

    return {
      success: true,
      data: result,
      message: `Processed ${result.totalPoliciesFound} policies — ${result.emailsSent} email, ${result.smsSent} SMS, ${result.whatsappSent} WhatsApp.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Scheduler failed",
    };
  }
}

/**
 * Get pending reminder counts for the dashboard.
 */
export async function getReminderStats(
  profileId: string
): Promise<{
  pending: number;
  sentToday: number;
  failed: number;
}> {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ count: pending }, { count: sentToday }, { count: failed }] = await Promise.all([
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("broker_id", profileId)
      .eq("status", "pending"),
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("broker_id", profileId)
      .eq("status", "sent")
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("broker_id", profileId)
      .eq("status", "failed"),
  ]);

  return {
    pending: pending ?? 0,
    sentToday: sentToday ?? 0,
    failed: failed ?? 0,
  };
}
