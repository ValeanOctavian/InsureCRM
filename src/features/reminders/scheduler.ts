import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase";
import { format } from "date-fns";
import {
  EmailNotificationProvider,
  SmsNotificationProvider,
  WhatsAppNotificationProvider,
} from "@/lib/notifications";
import type { NotificationProvider } from "@/lib/notifications";
import type { ReminderChannel } from "@/types";
import { renderRenewalReminderEmail } from "@/emails/renewal-reminder";
import { renderRenewalReminderSms } from "@/emails/sms-reminder";
import { renderRenewalReminderWhatsApp } from "@/emails/whatsapp-reminder";

export type ReminderWindow = 30 | 14 | 7 | 1;

export const REMINDER_WINDOWS: ReminderWindow[] = [30, 14, 7, 1];

export const DEFAULT_REMINDER_WINDOWS: ReminderWindow[] = [30, 14, 7, 1];

/**
 * Channels the scheduler dispatches to. Order matters: the same reminder
 * record is created once per (policy, channel) pair, and the dedup check
 * runs per channel.
 */
export const REMINDER_CHANNELS: ReminderChannel[] = ["email", "sms", "whatsapp"];

export interface SchedulerRunResult {
  totalPoliciesFound: number;
  remindersCreated: number;
  emailsSent: number;
  smsSent: number;
  whatsappSent: number;
  skipped: number;
  errors: string[];
}

interface PolicyWithJoins {
  id: string;
  type: string;
  policy_number: string;
  insurer_name: string;
  end_date: string;
  broker_id: string;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  vehicles: { registration_number: string } | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

/**
 * Find all active/expiring_soon policies that expire within the given number of days.
 */
export async function findPoliciesExpiringInDays(days: number): Promise<PolicyWithJoins[]> {
  const supabase = await createClient();

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const targetDateStr = format(targetDate, "yyyy-MM-dd");

  const { data: policies } = await supabase
    .from("policies")
    .select(
      `
      id, type, policy_number, insurer_name, end_date, broker_id,
      clients(id, first_name, last_name, email, phone),
      vehicles(registration_number),
      profiles!policies_broker_id_fkey ( id, full_name, email, phone )
    `
    )
    .in("status", ["active", "expiring_soon"])
    .eq("end_date", targetDateStr)
    .limit(500);

  return ((policies ?? []) as unknown as PolicyWithJoins[]).map((p) => ({
    ...p,
    clients: Array.isArray(p.clients) ? p.clients[0] ?? null : p.clients,
    vehicles: Array.isArray(p.vehicles) ? p.vehicles[0] ?? null : p.vehicles,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
  }));
}

/**
 * Check if a reminder was already sent today for this policy+channel combination.
 * Pass `useAdmin: true` to bypass RLS (e.g. when called from a cron route).
 */
export async function hasReminderBeenSentToday(
  policyId: string,
  channel: string,
  useAdmin = false
): Promise<boolean> {
  const supabase = useAdmin ? createAdminClient() : await createClient();
  const todayStart = format(new Date(), "yyyy-MM-dd");

  const { data } = await supabase
    .from("reminders")
    .select("id")
    .eq("policy_id", policyId)
    .eq("channel", channel)
    .gte("created_at", todayStart)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Create a reminder record in the database.
 * Pass `useAdmin: true` to bypass RLS (e.g. when called from a cron route).
 */
export async function createReminderRecord(
  input: {
    broker_id: string;
    client_id: string;
    policy_id: string;
    channel: string;
    scheduled_for: string;
  },
  useAdmin = false
): Promise<string | null> {
  const supabase = useAdmin ? createAdminClient() : await createClient();

  const { data } = await supabase
    .from("reminders")
    .insert({
      broker_id: input.broker_id,
      client_id: input.client_id,
      policy_id: input.policy_id,
      channel: input.channel,
      scheduled_for: input.scheduled_for,
      status: "pending",
    })
    .select("id")
    .single();

  return data?.id ?? null;
}

/**
 * Update a reminder record's status.
 * Pass `useAdmin: true` to bypass RLS (e.g. when called from a cron route).
 */
export async function updateReminderStatus(
  reminderId: string,
  status: "sent" | "failed",
  useAdmin = false
): Promise<void> {
  const supabase = useAdmin ? createAdminClient() : await createClient();
  await supabase
    .from("reminders")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", reminderId);
}

/**
 * Build the deep-link to the client portal. No token, no query.
 * The portal is auth-gated — the user must sign in to see their renewals.
 */
function buildPortalLink(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal`;
}

/**
 * Send a reminder via the specified channel. Returns null on success,
 * or an error string on failure.
 *
 * Skips silently if the client has no contact for that channel.
 */
async function sendChannelReminder(
  policy: PolicyWithJoins,
  channel: ReminderChannel
): Promise<string | null> {
  const client = policy.clients;
  if (!client) return `Policy ${policy.id}: no client data`;

  const expirationDate = new Date(policy.end_date);
  const daysRemaining = Math.max(
    0,
    Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const renewalLink = buildPortalLink();
  const clientName = `${client.first_name} ${client.last_name}`;
  const broker = policy.profiles;

  let provider: NotificationProvider;
  let message: { to: string; subject?: string; body: string };

  switch (channel) {
    case "email": {
      if (!client.email) return null; // skip silently — no contact
      provider = new EmailNotificationProvider();
      const html = renderRenewalReminderEmail({
        clientName,
        policyType: policy.type,
        policyNumber: policy.policy_number,
        insurerName: policy.insurer_name,
        vehicleRegistration: policy.vehicles?.registration_number ?? null,
        expirationDate: policy.end_date,
        daysRemaining,
        renewalLink,
        brokerName: broker?.full_name,
        brokerEmail: broker?.email,
        brokerPhone: broker?.phone,
      });
      message = {
        to: client.email,
        subject: `Renewal Reminder: Your ${policy.type} policy expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
        body: html,
      };
      break;
    }
    case "sms": {
      if (!client.phone) return null; // skip silently
      provider = new SmsNotificationProvider();
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
      message = { to: client.phone, body };
      break;
    }
    case "whatsapp": {
      if (!client.phone) return null;
      provider = new WhatsAppNotificationProvider();
      const body = renderRenewalReminderWhatsApp({
        clientName,
        policyType: policy.type,
        policyNumber: policy.policy_number,
        insurerName: policy.insurer_name,
        vehicleRegistration: policy.vehicles?.registration_number ?? null,
        expirationDate: policy.end_date,
        daysRemaining,
        renewalLink,
        brokerName: broker?.full_name,
        brokerPhone: broker?.phone,
      });
      message = { to: client.phone, body };
      break;
    }
  }

  const result = await provider.send(message);
  return result.success ? null : result.error ?? `${channel} send failed`;
}

/**
 * Run the reminder scheduler for a specific time window (e.g., 30 days).
 *
 * For each policy expiring in N days and each channel (email, sms, whatsapp):
 *   1. Skip if reminder was already sent today for (policy, channel).
 *   2. Create a reminder record.
 *   3. Send the reminder via the right provider.
 *   4. Update the reminder record's status.
 */
export async function runSchedulerForWindow(
  days: ReminderWindow
): Promise<SchedulerRunResult> {
  const result: SchedulerRunResult = {
    totalPoliciesFound: 0,
    remindersCreated: 0,
    emailsSent: 0,
    smsSent: 0,
    whatsappSent: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const policies = await findPoliciesExpiringInDays(days);
    result.totalPoliciesFound = policies.length;

    for (const policy of policies) {
      for (const channel of REMINDER_CHANNELS) {
        try {
          // Skip if already sent today on this channel
          const alreadySent = await hasReminderBeenSentToday(policy.id, channel);
          if (alreadySent) {
            result.skipped++;
            continue;
          }

          // Create reminder record
          const reminderId = await createReminderRecord({
            broker_id: policy.broker_id,
            client_id: policy.clients?.id ?? "",
            policy_id: policy.id,
            channel,
            scheduled_for: new Date().toISOString(),
          });

          if (!reminderId) {
            result.errors.push(
              `Policy ${policy.id} (${channel}): failed to create reminder record`
            );
            continue;
          }

          result.remindersCreated++;

          // Send
          const sendError = await sendChannelReminder(policy, channel);
          if (sendError) {
            await updateReminderStatus(reminderId, "failed");
            result.errors.push(`Policy ${policy.id} (${channel}): ${sendError}`);
          } else {
            await updateReminderStatus(reminderId, "sent");
            if (channel === "email") result.emailsSent++;
            else if (channel === "sms") result.smsSent++;
            else if (channel === "whatsapp") result.whatsappSent++;
          }
        } catch (err) {
          result.errors.push(
            `Policy ${policy.id} (${channel}): ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }
    }
  } catch (err) {
    result.errors.push(
      `Scheduler error for ${days}-day window: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  return result;
}

/**
 * Run the full reminder scheduler across all time windows (30, 14, 7, 1 days)
 * and all channels.
 */
export async function runFullScheduler(): Promise<{
  windows: Record<string, SchedulerRunResult>;
  total: SchedulerRunResult;
}> {
  const windows: Record<string, SchedulerRunResult> = {};
  const total: SchedulerRunResult = {
    totalPoliciesFound: 0,
    remindersCreated: 0,
    emailsSent: 0,
    smsSent: 0,
    whatsappSent: 0,
    skipped: 0,
    errors: [],
  };

  for (const days of DEFAULT_REMINDER_WINDOWS) {
    const windowResult = await runSchedulerForWindow(days);
    windows[`${days}days`] = windowResult;

    total.totalPoliciesFound += windowResult.totalPoliciesFound;
    total.remindersCreated += windowResult.remindersCreated;
    total.emailsSent += windowResult.emailsSent;
    total.smsSent += windowResult.smsSent;
    total.whatsappSent += windowResult.whatsappSent;
    total.skipped += windowResult.skipped;
    total.errors.push(...windowResult.errors);
  }

  return { windows, total };
}
