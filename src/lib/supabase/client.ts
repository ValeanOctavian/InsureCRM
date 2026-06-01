import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Creates or returns a cached Supabase client for browser-side usage.
 *
 * Uses `@supabase/ssr`'s createBrowserClient so that auth tokens are stored
 * in cookies (not localStorage), allowing the middleware and server components
 * to read the session on subsequent requests.
 *
 * The singleton pattern prevents "Multiple GoTrueClient instances" warnings.
 */
export function createClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  cachedClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return cachedClient;
}
