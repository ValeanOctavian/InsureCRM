"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import { logActivity } from "@/features/activities/actions";
import { EmailNotificationProvider } from "@/lib/notifications";
import { renderRenewalReminderEmail } from "@/emails/renewal-reminder";
import {
  runFullScheduler,
  runSchedulerForWindow,
  hasReminderBeenSentToday,
  createReminderRecord,
  updateReminderStatus,
  findPoliciesExpiringInDays,
} from "./scheduler";
import type { ActionResponse } from "@/types";
import type { ReminderWindow, SchedulerRunResult } from "./scheduler";

/**
 * Send a renewal reminder now for a specific policy.
 * Used by the "Send Reminder Now" button on the broker dashboard.
 */
export async function sendReminderNow(
  policyId: string
): Promise<ActionResponse<{ reminderId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const supabase = await createClient();

    // Load policy with client and vehicle data
    const { data: policy } = await supabase
      .from("policies")
      .select(`
        *,
        clients(id, first_name, last_name, email, phone),
        vehicles(registration_number)
      `)
      .eq("id", policyId)
      .eq("broker_id", profile.id)
      .single();

    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    const client = policy.clients;
    if (!client?.email) {
      return { success: false, error: "Client has no email address" };
    }

    // Check if already sent today
    const alreadySent = await hasReminderBeenSentToday(policyId, "email");
    if (alreadySent) {
      return { success: false, error: "Reminder was already sent today for this policy." };
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
      return { success: false, error: "Failed to create reminder record" };
    }

    // Build and send email
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
      vehicleRegistration: policy.vehicles?.registration_number,
      expirationDate: policy.end_date,
      daysRemaining: Math.max(0, daysRemaining),
      renewalLink,
      brokerName: profile.full_name,
      brokerEmail: profile.email,
      brokerPhone: profile.phone,
    });

    const provider = new EmailNotificationProvider();
    const sendResult = await provider.send({
      to: client.email,
      subject: `Renewal Reminder: Your ${policy.type} policy expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
      body: emailHtml,
    });

    if (!sendResult.success) {
      await updateReminderStatus(reminderId, "failed", sendResult.error);
      return { success: false, error: sendResult.error ?? "Failed to send email" };
    }

    await updateReminderStatus(reminderId, "sent");

    // Log activity
    logActivity({
      entityType: "reminder",
      entityId: reminderId,
      action: "sent",
      description: `Renewal reminder sent to ${client.first_name} ${client.last_name} for ${policy.type} policy`,
      metadata: { policyId, channel: "email" },
    });

    revalidatePath("/broker/dashboard");
    revalidatePath("/broker/policies");

    return {
      success: true,
      data: { reminderId },
      message: `Reminder sent to ${client.first_name} ${client.last_name}`,
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
 * e.g., sendRemindersForWindow(30) sends reminders for policies expiring in 30 days.
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

    return {
      success: true,
      data: result,
      message: `Processed ${result.totalPoliciesFound} policies, sent ${result.emailsSent} reminders.`,
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
