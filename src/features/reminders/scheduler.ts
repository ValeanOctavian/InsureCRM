import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { EmailNotificationProvider } from "@/lib/notifications";
import { renderRenewalReminderEmail } from "@/emails/renewal-reminder";

export type ReminderWindow = 30 | 14 | 7 | 1;

export const REMINDER_WINDOWS: ReminderWindow[] = [30, 14, 7, 1];

export const DEFAULT_REMINDER_WINDOWS: ReminderWindow[] = [30, 14, 7, 1];

/**
 * Result of running the reminder scheduler.
 */
export interface SchedulerRunResult {
  totalPoliciesFound: number;
  remindersCreated: number;
  emailsSent: number;
  errors: string[];
}

/**
 * Find all active/expiring_soon policies that expire within the given number of days.
 */
export async function findPoliciesExpiringInDays(days: number) {
  const supabase = await createClient();

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const targetDateStr = format(targetDate, "yyyy-MM-dd");

  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      clients(id, first_name, last_name, email, phone),
      vehicles(registration_number)
    `)
    .in("status", ["active", "expiring_soon"])
    .eq("end_date", targetDateStr)
    .limit(500);

  return policies ?? [];
}

/**
 * Check if a reminder was already sent today for this policy+channel combination.
 */
export async function hasReminderBeenSentToday(
  policyId: string,
  channel: string
): Promise<boolean> {
  const supabase = await createClient();
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
 */
export async function createReminderRecord(input: {
  broker_id: string;
  client_id: string;
  policy_id: string;
  channel: string;
  scheduled_for: string;
}): Promise<string | null> {
  const supabase = await createClient();

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
 */
export async function updateReminderStatus(
  reminderId: string,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("reminders")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", reminderId);
}

/**
 * Send an email reminder for a specific policy.
 */
async function sendEmailReminder(policy: any): Promise<string | null> {
  const client = policy.clients;
  const vehicle = policy.vehicles;
  const broker = policy.profiles;

  if (!client?.email) {
    return `Client ${client?.first_name ?? "unknown"} has no email address`;
  }

  const expirationDate = new Date(policy.end_date);
  const daysRemaining = Math.ceil(
    (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const renewalLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/renew?policy=${policy.id}`;

  const emailHtml = renderRenewalReminderEmail({
    clientName: `${client.first_name} ${client.last_name}`,
    policyType: policy.type,
    policyNumber: policy.policy_number,
    insurerName: policy.insurer_name,
    vehicleRegistration: vehicle?.registration_number,
    expirationDate: policy.end_date,
    daysRemaining: Math.max(0, daysRemaining),
    renewalLink,
    brokerName: broker?.full_name,
    brokerEmail: broker?.broker_email,
    brokerPhone: broker?.broker_phone,
  });

  const provider = new EmailNotificationProvider();
  const result = await provider.send({
    to: client.email,
    subject: `Renewal Reminder: Your ${policy.type} policy expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
    body: emailHtml,
  });

  if (!result.success) {
    return result.error ?? "Email send failed";
  }

  return null; // No error = success
}

/**
 * Run the reminder scheduler for a specific time window (e.g., 30 days).
 *
 * 1. Find policies expiring in exactly N days.
 * 2. Skip if reminder was already sent today.
 * 3. Create a reminder record.
 * 4. Send email reminder.
 * 5. Update reminder record status.
 */
export async function runSchedulerForWindow(
  days: ReminderWindow
): Promise<SchedulerRunResult> {
  const result: SchedulerRunResult = {
    totalPoliciesFound: 0,
    remindersCreated: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    const policies = await findPoliciesExpiringInDays(days);
    result.totalPoliciesFound = policies.length;

    for (const policy of policies) {
      try {
        const client = policy.clients;
        const broker = policy.profiles;

        if (!client) {
          result.errors.push(`Policy ${policy.id}: No client data`);
          continue;
        }

        // Skip if email already sent today
        const alreadySent = await hasReminderBeenSentToday(policy.id, "email");
        if (alreadySent) {
          continue;
        }

        // Create reminder record
        const reminderId = await createReminderRecord({
          broker_id: policy.broker_id,
          client_id: client.id,
          policy_id: policy.id,
          channel: "email",
          scheduled_for: new Date().toISOString(),
        });

        if (!reminderId) {
          result.errors.push(`Policy ${policy.id}: Failed to create reminder record`);
          continue;
        }

        result.remindersCreated++;

        // Send email
        const emailError = await sendEmailReminder(policy);
        if (emailError) {
          await updateReminderStatus(reminderId, "failed", emailError);
          result.errors.push(`Policy ${policy.id}: ${emailError}`);
        } else {
          await updateReminderStatus(reminderId, "sent");
          result.emailsSent++;
        }
      } catch (err) {
        result.errors.push(
          `Policy ${policy.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
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
 * Run the full reminder scheduler across all time windows (30, 14, 7, 1 days).
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
    errors: [],
  };

  for (const days of DEFAULT_REMINDER_WINDOWS) {
    const windowResult = await runSchedulerForWindow(days);
    windows[`${days}days`] = windowResult;

    total.totalPoliciesFound += windowResult.totalPoliciesFound;
    total.remindersCreated += windowResult.remindersCreated;
    total.emailsSent += windowResult.emailsSent;
    total.errors.push(...windowResult.errors);
  }

  return { windows, total };
}
