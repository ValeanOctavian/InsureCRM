import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug-auth
 *
 * Debug endpoint to check the current auth status and profile.
 */
export async function GET() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json({
      authenticated: false,
      error: userError.message,
    });
  }

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      error: "No user found in session",
    });
  }

  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    userId: user.id,
    userEmail: user.email,
    userRole: user.user_metadata?.role,
    profile,
    profileError: profileError?.message ?? null,
  });
}
