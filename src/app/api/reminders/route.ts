import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiAuth } from "@/lib/api-auth";

/**
 * GET /api/reminders
 *
 * Returns recent reminders for the authenticated broker.
 * Query params: status (pending|sent|failed), limit (default 50)
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(["broker"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    const supabase = await createClient();

    let query = supabase
      .from("reminders")
      .select("*, policies(policy_number, type, insurer_name), clients(first_name, last_name)")
      .eq("broker_id", auth.profileId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: reminders, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: reminders ?? [] });
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

/**
 * POST /api/reminders
 *
 * Create a reminder record.
 * Body: { policyId: string, channel: "email" | "sms" | "whatsapp", sendNow?: boolean }
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(["broker"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { policyId, channel, sendNow } = body;

    if (!policyId || !channel) {
      return NextResponse.json(
        { success: false, error: "policyId and channel are required" },
        { status: 400 }
      );
    }

    if (!["email", "sms", "whatsapp"].includes(channel)) {
      return NextResponse.json(
        { success: false, error: "channel must be email, sms, or whatsapp" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Load policy data — filtered by broker_id for security
    const { data: policy } = await supabase
      .from("policies")
      .select("broker_id, client_id, policy_number, type")
      .eq("id", policyId)
      .eq("broker_id", auth.profileId)
      .single();

    if (!policy) {
      return NextResponse.json(
        { success: false, error: "Policy not found" },
        { status: 404 }
      );
    }

    // Create reminder record
    const { data: reminder, error: insertError } = await supabase
      .from("reminders")
      .insert({
        broker_id: auth.profileId,
        client_id: policy.client_id,
        policy_id: policyId,
        channel,
        scheduled_for: new Date().toISOString(),
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: reminder.id, policyId, channel, status: "pending" },
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
