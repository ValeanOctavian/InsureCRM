import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase";
import { sendReminderNow } from "@/features/reminders/actions";

/**
 * POST /api/reminders/send-now
 *
 * Immediately sends a reminder for a given policy. Useful for testing and
 * for brokers who want to fire an ad-hoc reminder.
 *
 * Auth (in order of precedence):
 *   1. `Authorization: Bearer <CRON_SECRET>` — for cron / curl testing.
 *      In this mode the route looks up the policy's broker and passes the
 *      broker id into the action, so no session cookie is required.
 *   2. Broker Supabase session cookie (via requireApiAuth).
 *
 * Body:
 *   { policyId: string, channel?: "email" | "sms" | "whatsapp" }
 *
 *   - If channel is omitted, sends on all 3 channels.
 *   - The reminder is rendered with the real `NEXT_PUBLIC_APP_URL/portal`
 *     deep-link.
 *   - If the corresponding provider env keys are not set, the provider
 *     falls back to "log-only" mode and prints the rendered message to
 *     the server console — perfect for local testing.
 */
export async function POST(request: Request) {
  // ─── 1. CRON_SECRET bearer token (for local curl / external schedulers) ───
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
  const isCron = !!(cronSecret && bearerToken && bearerToken === cronSecret);

  // ─── 2. Broker session cookie ────────────────────────────────────────────
  if (!isCron) {
    const auth = await requireApiAuth(["broker"]);
    if (auth instanceof NextResponse) return auth;
  }

  try {
    const body = await request.json();
    const { policyId, channel } = body as {
      policyId?: string;
      channel?: "email" | "sms" | "whatsapp";
    };

    if (!policyId) {
      return NextResponse.json(
        { success: false, error: "policyId is required" },
        { status: 400 }
      );
    }

    if (
      channel &&
      !["email", "sms", "whatsapp"].includes(channel)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "channel must be 'email', 'sms', or 'whatsapp' (or omitted for all 3)",
        },
        { status: 400 }
      );
    }

    // In cron mode, look up the policy's broker and pass it explicitly so the
    // action can authorize without a session.
    let asBrokerId: string | undefined;
    if (isCron) {
      const supabase = createAdminClient();
      const { data: policy } = await supabase
        .from("policies")
        .select("broker_id")
        .eq("id", policyId)
        .single();

      if (!policy) {
        return NextResponse.json(
          { success: false, error: "Policy not found" },
          { status: 404 }
        );
      }
      asBrokerId = policy.broker_id;
    }

    const result = await sendReminderNow(policyId, channel, { asBrokerId });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
