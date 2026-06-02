import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * POST /api/migrate
 *
 * One-off migration runner. Executes the statements in
 * `supabase/migrations/00002_portal_overhaul.sql` and `00003_wizard_nullable_policy_id.sql`
 * in order. Safe to run multiple times — every statement uses `IF NOT EXISTS`
 * or is wrapped in a `DO $$` block with exception handling.
 *
 * This is needed because the Supabase JS client doesn't expose arbitrary
 * SQL execution. The admin client is used here (service-role key) and the
 * route is open in dev only — gate it behind CRON_SECRET in production.
 *
 * Response:
 *   { success: boolean, executed: number, errors: string[] }
 */
export async function POST(request: Request) {
  // Gate: require CRON_SECRET in env, or allow in dev when NODE_ENV !== "production"
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
  const isCron = !!(cronSecret && bearerToken && bearerToken === cronSecret);
  const isDev = process.env.NODE_ENV !== "production";

  if (!isCron && !isDev) {
    return NextResponse.json(
      { success: false, error: "Migration endpoint is disabled in production" },
      { status: 403 }
    );
  }

  const errors: string[] = [];
  let executed = 0;
  const supabase = createAdminClient();

  /**
   * Execute raw SQL via the admin client.
   * Supabase JS client doesn't expose `query()` directly for arbitrary SQL,
   * but we can use the `rpc` endpoint by calling a no-op or by hitting
   * PostgREST's `/rpc/` with a custom function. Since we don't have a
   * custom function defined for this, we fall back to per-statement REST
   * calls where possible and use `pg` for DDL.
   */
  // We use the `pg` package via dynamic import to run raw SQL.
  let pg: typeof import("pg");
  try {
    pg = (await import("pg")).default as typeof import("pg");
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "The `pg` package is not installed. Run `npm install pg` then retry.",
      },
      { status: 500 }
    );
  }

  const fs = await import("fs/promises");
  const path = await import("path");

  // We need a direct postgres connection. Supabase exposes one at
  //   postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
  // The password is the service role key for newer projects, or a separate
  // DB password set in the dashboard. We try both.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ref = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) {
    return NextResponse.json(
      { success: false, error: "Could not parse Supabase project ref from NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 }
    );
  }

  const candidates = [
    process.env.DATABASE_URL,
    process.env.DIRECT_URL,
    `postgresql://postgres:${process.env.SUPABASE_SERVICE_ROLE_KEY}@db.${ref}.supabase.co:5432/postgres`,
  ].filter(Boolean) as string[];

  let client: import("pg").Client | null = null;
  let lastError: string | null = null;
  for (const connStr of candidates) {
    try {
      const c = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
      await c.connect();
      client = c;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!client) {
    return NextResponse.json(
      {
        success: false,
        error: `Could not connect to Postgres directly. Tried ${candidates.length} connection string(s). Last error: ${lastError}. ` +
          `Add DATABASE_URL to .env.local (Supabase dashboard → Settings → Database → Connection string → Direct).`,
      },
      { status: 500 }
    );
  }

  // Read and execute migration files in order. The portal-overhaul migration
  // is split into 00002a (enum additions) + 00002b (data renames + schema +
  // RLS + trigger) because `ALTER TYPE ... ADD VALUE` cannot run in the same
  // transaction as a statement that references the new value.
  const migrationFiles = [
    "00002a_enum_values.sql",
    "00002b_portal_overhaul_rest.sql",
    "00003_wizard_nullable_policy_id.sql",
    "00004_storage_rls_fix.sql",
  ];

  for (const file of migrationFiles) {
    const filePath = path.resolve(process.cwd(), "supabase", "migrations", file);
    let sql: string;
    try {
      sql = await fs.readFile(filePath, "utf8");
    } catch (e) {
      errors.push(`Could not read ${file}: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    try {
      // Each migration file runs in its own transaction so a failure in one
      // doesn't roll back the others. This is critical for the enum split.
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      executed += sql.split(";").filter((s) => s.trim()).length;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${file}: ${msg}`);
      try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    }
  }

  await client.end();

  return NextResponse.json({
    success: errors.length === 0,
    executed,
    errors,
  });
}
