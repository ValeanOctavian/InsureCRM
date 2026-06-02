"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/middleware";
import { ROUTES } from "@/lib/utils";
import type { ActionResponse } from "@/types";

const CNP_REGEX = /^\d{13}$/;

function isCnp(identifier: string): boolean {
  return CNP_REGEX.test(identifier.trim());
}

/**
 * Resolves a CNP to the email associated with that client record.
 * Uses the service-role client to bypass RLS (callers are not yet authenticated).
 * Returns null when no client exists with that CNP.
 */
async function resolveCnpToEmail(identifier: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("email, auth_user_id")
    .eq("cnp", identifier.trim())
    .maybeSingle();

  if (!data) return null;
  if (!data.email) return null;
  return data.email;
}

/**
 * Portal login: identifier is either an email or a 13-digit CNP.
 *
 * For CNP: looks up the email via the admin client, then signs in.
 * For email: signs in directly.
 */
export async function loginWithCnpOrEmail(
  identifier: string,
  password: string
): Promise<ActionResponse> {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    return { success: false, error: "Identifier and password are required." };
  }

  let email = trimmed;
  if (isCnp(trimmed)) {
    const resolved = await resolveCnpToEmail(trimmed);
    if (!resolved) {
      return {
        success: false,
        error: "No account found for this CNP. Please register first.",
        code: "not_found",
      };
    }
    email = resolved;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(ROUTES.CLIENT.PORTAL);
}

/**
 * Public self-registration for clients.
 *
 * Creates an auth user with role=client and the CNP in raw_user_meta_data.
 * The `handle_new_user` trigger inserts the matching `clients` row.
 */
export async function registerClientPortalAccount(input: {
  firstName: string;
  lastName: string;
  email: string;
  cnp: string;
  password: string;
}): Promise<ActionResponse<{ sessionEstablished: boolean }>> {
  if (!input.firstName || !input.lastName || !input.email || !input.cnp || !input.password) {
    return { success: false, error: "All fields are required." };
  }
  if (!isCnp(input.cnp)) {
    return { success: false, error: "CNP must be exactly 13 digits." };
  }
  if (input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const admin = createAdminClient();

  // Guard: email must be unique
  const { data: existingByEmail } = await admin
    .from("clients")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (existingByEmail) {
    return { success: false, error: "An account with this email already exists.", code: "email_taken" };
  }

  // Guard: CNP must be unique
  const { data: existingByCnp } = await admin
    .from("clients")
    .select("id")
    .eq("cnp", input.cnp)
    .maybeSingle();
  if (existingByCnp) {
    return { success: false, error: "An account with this CNP already exists.", code: "cnp_taken" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: "client",
        first_name: input.firstName,
        last_name: input.lastName,
        full_name: `${input.firstName} ${input.lastName}`,
        cnp: input.cnp,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // If email confirmation is required, the user is not immediately signed in.
  // The trigger will still have fired and inserted the clients row.
  return {
    success: true,
    data: { sessionEstablished: Boolean(data?.session) },
    message: data?.session
      ? "Account created!"
      : "Account created! Check your email to confirm before signing in.",
  };
}

/**
 * Completes the Romanian policy-mandatory fields for a self-registered client.
 * Marks `profile_completed = true` on success.
 */
export async function completeClientProfile(input: {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  county: string;
  birthDate: string;        // YYYY-MM-DD
  idSeries: string;
  idNumber: string;
  idIssuedBy: string;
  idIssuedDate: string;     // YYYY-MM-DD
  idExpiryDate: string;     // YYYY-MM-DD
}): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      county: input.county || null,
      birth_date: input.birthDate || null,
      id_series: input.idSeries || null,
      id_number: input.idNumber || null,
      id_issued_by: input.idIssuedBy || null,
      id_issued_date: input.idIssuedDate || null,
      id_expiry_date: input.idExpiryDate || null,
      profile_completed: true,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(ROUTES.CLIENT.PORTAL);
}
