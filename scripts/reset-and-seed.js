#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/reset-and-seed.js
 *
 * Wipes the extended test data (rows whose IDs start with "x") and re-seeds it.
 * Useful when the dev server has a cached version of /api/seed, or when
 * you just want a clean extended dataset without touching the original 6 demo clients.
 *
 *   1. Make sure your dev server is NOT running
 *   2. Run: node scripts/reset-and-seed.js
 *   3. The script connects directly to Supabase via the service role key
 *      and inserts the data using the same generator as supabase/seed_extended.sql
 *
 * Requires: psql OR a SUPABASE_DB_URL env var (postgres connection string).
 * Alternative: just run the dev server and hit POST /api/seed
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  console.error("Load .env.local first:  set -a; source .env.local; set +a");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function wipe() {
  // Wipe in reverse-FK order (children first)
  const tables = [
    "activity_logs",
    "renewal_requests",
    "reminders",
    "tasks",
    "documents",
    "policies",
    "vehicles",
    "clients",
    "profiles",
  ];
  for (const t of tables) {
    const { error, count } = await sb.from(t).delete({ count: "exact" }).like("id", "f%");
    if (error) console.error(`  ✗ ${t}: ${error.message}`);
    else console.log(`  ✓ wiped ${count} rows from ${t}`);
  }
}

async function seed() {
  const raw = fs.readFileSync(path.resolve(__dirname, "seed_data.json"), "utf8");
  const data = JSON.parse(raw);

  // 1) Create broker auth users (skip if they already exist)
  for (const b of data.brokers) {
    const { data: u, error } = await sb.auth.admin.createUser({
      email: b.email,
      password: "Demo123!",
      email_confirm: true,
      user_metadata: { full_name: b.fullName, role: "broker" },
    });
    if (error && !/already/i.test(error.message)) {
      console.error(`  ✗ auth ${b.email}: ${error.message}`);
      continue;
    }
    if (u?.user) {
      const { error: pe } = await sb.from("profiles").upsert({
        id: b.profileId,
        user_id: u.user.id,
        full_name: b.fullName,
        email: b.email,
        phone: b.phone,
        role: "broker",
      }, { onConflict: "id" });
      if (pe) console.error(`  ✗ profile ${b.email}: ${pe.message}`);
      else console.log(`  ✓ broker ${b.email} (${b.profileId})`);
    } else {
      console.log(`  · broker ${b.email} already exists, skipping profile upsert`);
    }
  }

  // 2) Insert extended data
  const inserts = [
    ["clients", data.clients.map(({ platePrefix, ...r }) => r)],
    ["vehicles", data.vehicles],
    ["policies", data.policies],
    ["documents", data.documents],
    ["tasks", data.tasks],
    ["reminders", data.reminders],
    ["renewal_requests", data.renewals],
    ["activity_logs", data.activities],
  ];

  for (const [table, rows] of inserts) {
    let ok = 0, errs = 0;
    for (const row of rows) {
      const { error } = await sb.from(table).upsert(row, { onConflict: "id" });
      if (error) { errs++; if (errs <= 3) console.error(`    ✗ ${table} ${row.id}: ${error.message}`); }
      else ok++;
    }
    console.log(`  ✓ ${table}: ${ok} ok, ${errs} errors`);
  }
}

(async () => {
  console.log("Wiping existing extended data…");
  await wipe();
  console.log("\nSeeding…");
  await seed();
  console.log("\nDone.");
  process.exit(0);
})();
