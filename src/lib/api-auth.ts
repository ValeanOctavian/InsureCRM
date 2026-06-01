import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/utils";

interface ApiAuthResult {
  userId: string;
  profileId: string;
  role: Role;
}

/**
 * Require authentication in an API route handler.
 * Returns the authenticated user + profile if valid, or a 401/403 response.
 *
 * Usage:
 *   const auth = await requireApiAuth(request);
 *   if (!auth) return auth; // Response object
 *   // auth.userId, auth.profileId, auth.role available
 */
export async function requireApiAuth(
  allowedRoles?: Role[]
): Promise<ApiAuthResult | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "Profile not found" },
      { status: 401 }
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role as Role) && profile.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return {
    userId: user.id,
    profileId: profile.id,
    role: profile.role as Role,
  };
}
