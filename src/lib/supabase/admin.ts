import { createClient } from "@supabase/supabase-js";

// This client uses the service role key and should ONLY be used in admin-only
// Server Actions or Route Handlers that are protected by admin role checks.
// NEVER expose this client to the browser.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Admin client is not available."
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
