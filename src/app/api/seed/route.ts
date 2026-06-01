import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promises as fs } from "fs";
import path from "path";

/**
 * POST /api/seed
 *
 * Seeds the database with comprehensive demo data.
 *
 * 1. Creates 3 broker auth users (broker@, diana@, vlad@insurecrm.com / Demo123!)
 * 2. Creates 1 demo client auth user (client@insurecrm.com / Demo123!)
 * 3. Inserts the 6 hard-coded demo clients, vehicles, policies, documents, etc.
 *    (matches supabase/seed.sql for reference)
 * 4. Inserts the extended dataset (40 clients, 55 vehicles, 75 policies, …)
 *    read from scripts/seed_data.json
 *
 * Idempotent — calling it again will skip existing records (upsert-safe).
 */

const BROKER_1_ID = "00000000-0000-0000-0000-000000000001";
const BROKER_2_ID = "ff000001-0000-0000-0000-000000000000";
const BROKER_3_ID = "ff000002-0000-0000-0000-000000000000";
const CLIENT_1_ID = "00000000-0000-0000-0000-000000000002";

const isDuplicateError = (message: string) =>
  message.toLowerCase().includes("already exists") ||
  message.toLowerCase().includes("already been registered");

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export async function POST() {
  try {
    const adminSupabase = createAdminClient();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // ────────────────────────────────────────────────────────────
    // STEP 1 — Create auth users (brokers + demo client)
    // ────────────────────────────────────────────────────────────

    const brokerAccounts = [
      { email: "broker@insurecrm.com", password: "Demo123!", fullName: "Andrei Popescu",     profileId: BROKER_1_ID },
      { email: "diana@insurecrm.com",  password: "Demo123!", fullName: "Diana Munteanu",     profileId: BROKER_2_ID },
      { email: "vlad@insurecrm.com",   password: "Demo123!", fullName: "Vlad Constantinescu", profileId: BROKER_3_ID },
    ];

    for (const acc of brokerAccounts) {
      let userId: string | undefined;
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.fullName, role: "broker" },
      });
      if (error && !isDuplicateError(error.message)) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      if (data?.user) {
        userId = data.user.id;
      } else {
        // Auth user already exists — look it up by email so we still have a valid
        // user_id to attach to the profile row.
        const { data: list, error: listErr } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
        if (listErr) {
          return NextResponse.json({ success: false, error: `listUsers failed: ${listErr.message}` }, { status: 500 });
        }
        const existing = list?.users?.find((u) => u.email === acc.email);
        if (!existing) {
          return NextResponse.json(
            { success: false, error: `Could not find auth user for ${acc.email} after create error` },
            { status: 500 },
          );
        }
        userId = existing.id;
      }

      const phone =
        acc.email === "broker@insurecrm.com" ? "+40 721 123 456"
        : acc.email === "diana@insurecrm.com" ? "+40 731 555 101"
        : "+40 732 555 202";

      // Clear out any pre-existing profile that conflicts on either the hard-coded
      // `id` or the `user_id`, so the subsequent upsert can land the row in the
      // shape our FK references expect (id = acc.profileId).
      await adminSupabase.from("profiles").delete().eq("id", acc.profileId);
      await adminSupabase.from("profiles").delete().eq("user_id", userId);

      const { error: profileErr } = await adminSupabase.from("profiles").upsert({
        id: acc.profileId,
        user_id: userId,
        full_name: acc.fullName,
        email: acc.email,
        phone,
        role: "broker",
      }, { onConflict: "id" });
      if (profileErr) {
        return NextResponse.json(
          { success: false, error: `profile upsert for ${acc.email} failed: ${profileErr.message}` },
          { status: 500 },
        );
      }
    }

    // Sanity check — confirm all 3 broker profile rows are present before we
    // start inserting clients/vehicles/policies that reference them.
    const { data: profileRows, error: profileCheckErr } = await adminSupabase
      .from("profiles")
      .select("id, email, role")
      .in("id", [BROKER_1_ID, BROKER_2_ID, BROKER_3_ID]);
    if (profileCheckErr) {
      return NextResponse.json({ success: false, error: `profile check failed: ${profileCheckErr.message}` }, { status: 500 });
    }
    const foundIds = new Set((profileRows ?? []).map((p) => p.id));
    const missing = [BROKER_1_ID, BROKER_2_ID, BROKER_3_ID].filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Broker profiles missing after upsert: ${missing.join(", ")}` },
        { status: 500 },
      );
    }

    // Demo client (Maria Ionescu)
    const { data: clientUser, error: clientErr } = await adminSupabase.auth.admin.createUser({
      email: "client@insurecrm.com",
      password: "Demo123!",
      email_confirm: true,
      user_metadata: { full_name: "Maria Ionescu", role: "client" },
    });
    if (clientErr && !isDuplicateError(clientErr.message)) {
      return NextResponse.json({ success: false, error: clientErr.message }, { status: 500 });
    }
    let mariaUserId: string | undefined = clientUser?.user?.id;
    if (!mariaUserId) {
      // Auth user already exists — look up by email so we still have a user_id
      // to attach to the profile row.
      const { data: list, error: listErr } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) {
        return NextResponse.json({ success: false, error: `listUsers failed: ${listErr.message}` }, { status: 500 });
      }
      const existing = list?.users?.find((u) => u.email === "client@insurecrm.com");
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Could not find auth user for client@insurecrm.com after create error" },
          { status: 500 },
        );
      }
      mariaUserId = existing.id;
    }
    // Clear out any pre-existing profile that conflicts on id or user_id.
    await adminSupabase.from("profiles").delete().eq("id", CLIENT_1_ID);
    await adminSupabase.from("profiles").delete().eq("user_id", mariaUserId);
    const { error: mariaProfileErr } = await adminSupabase.from("profiles").upsert({
      id: CLIENT_1_ID,
      user_id: mariaUserId,
      full_name: "Maria Ionescu",
      email: "client@insurecrm.com",
      phone: "+40 722 987 654",
      role: "client",
      broker_id: BROKER_1_ID,
    }, { onConflict: "id" });
    if (mariaProfileErr) {
      return NextResponse.json(
        { success: false, error: `profile upsert for client@insurecrm.com failed: ${mariaProfileErr.message}` },
        { status: 500 },
      );
    }

    // ────────────────────────────────────────────────────────────
    // STEP 2 — Insert original 6 demo clients (matches seed.sql)
    // ────────────────────────────────────────────────────────────

    const demoClients = [
      { id: "c0000000-0000-0000-0000-000000000001", first_name: "Maria",     last_name: "Ionescu",   cnp: "2890112345678", email: "client@insurecrm.com", phone: "+40 722 987 654", city: "București",    county: "Ilfov",   address: "Str. Mihai Viteazu 12" },
      { id: "c0000000-0000-0000-0000-000000000002", first_name: "Ion",       last_name: "Popescu",   cnp: "1850612345679", email: "ion.popescu@email.ro",   phone: "+40 723 456 789", city: "Cluj-Napoca", county: "Cluj",   address: "Str. Libertății 45" },
      { id: "c0000000-0000-0000-0000-000000000003", first_name: "Elena",     last_name: "Dumitru",   cnp: "2900312345680", email: "elena.dumitru@email.ro", phone: "+40 724 567 890", city: "Iași",         county: "Iași",   address: "Bd. Unirii 78" },
      { id: "c0000000-0000-0000-0000-000000000004", first_name: "Alexandru", last_name: "Stan",      cnp: "1870812345681", email: "alex.stan@email.ro",      phone: "+40 725 678 901", city: "Timișoara",    county: "Timiș",  address: "Str. Primăverii 23" },
      { id: "c0000000-0000-0000-0000-000000000005", first_name: "Cristina",  last_name: "Mihai",     cnp: "2920512345682", email: "cristina.mihai@email.ro", phone: "+40 726 789 012", city: "Brașov",       county: "Brașov", address: "Aleea Constructorilor 5" },
      { id: "c0000000-0000-0000-0000-000000000006", first_name: "Doru",      last_name: "Gheorghiu", cnp: "1830312345683", email: "doru.gheorghiu@email.ro", phone: "+40 727 890 123", city: "Constanța",    county: "Constanța", address: "Str. Republicii 34" },
    ];
    for (const c of demoClients) {
      await adminSupabase.from("clients").upsert({
        id: c.id, broker_id: BROKER_1_ID,
        first_name: c.first_name, last_name: c.last_name, cnp: c.cnp,
        email: c.email, phone: c.phone, address: c.address, city: c.city, county: c.county,
        status: "active",
      }, { onConflict: "id" });
    }

    const demoVehicles = [
      { id: "v0000000-0000-0000-0000-000000000001", client_id: "c0000000-0000-0000-0000-000000000001", reg: "B-123-ABC",  vin: "WBA3A5C50DF123456", brand: "BMW",         model: "X3",      year: 2022, engine: 1998, fuel: "Diesel"  },
      { id: "v0000000-0000-0000-0000-000000000002", client_id: "c0000000-0000-0000-0000-000000000002", reg: "CJ-45-ABC",  vin: "U5YPC8135GL654321", brand: "Dacia",       model: "Logan",   year: 2021, engine: 1598, fuel: "Petrol"  },
      { id: "v0000000-0000-0000-0000-000000000003", client_id: "c0000000-0000-0000-0000-000000000002", reg: "CJ-46-ABC",  vin: "VF1DA000035123456", brand: "Renault",     model: "Megane",  year: 2023, engine: 1461, fuel: "Diesel"  },
      { id: "v0000000-0000-0000-0000-000000000004", client_id: "c0000000-0000-0000-0000-000000000003", reg: "IS-78-BCD",  vin: "W0L0AHL4851234567", brand: "Opel",        model: "Astra",   year: 2020, engine: 1598, fuel: "Petrol"  },
      { id: "v0000000-0000-0000-0000-000000000005", client_id: "c0000000-0000-0000-0000-000000000004", reg: "TM-12-XYZ",  vin: "TMBJK7NPXK1234567", brand: "Škoda",       model: "Octavia", year: 2023, engine: 1968, fuel: "Diesel"  },
      { id: "v0000000-0000-0000-0000-000000000006", client_id: "c0000000-0000-0000-0000-000000000005", reg: "BV-90-DEF",  vin: "JTDKW3D3X01234567", brand: "Toyota",      model: "Corolla", year: 2022, engine: 1798, fuel: "Hybrid"  },
      { id: "v0000000-0000-0000-0000-000000000007", client_id: "c0000000-0000-0000-0000-000000000006", reg: "CT-56-GHI",  vin: "UU1DG8JH5K1234567", brand: "Volkswagen",  model: "Passat",  year: 2021, engine: 1968, fuel: "Diesel"  },
    ];
    for (const v of demoVehicles) {
      await adminSupabase.from("vehicles").upsert({
        id: v.id, client_id: v.client_id, broker_id: BROKER_1_ID,
        registration_number: v.reg, vin: v.vin, brand: v.brand, model: v.model,
        year: v.year, engine_capacity: v.engine, fuel_type: v.fuel,
      }, { onConflict: "id" });
    }

    const demoPolicies = [
      { id: "p0000000-0000-0000-0000-000000000001", client_id: "c0000000-0000-0000-0000-000000000001", vehicle_id: "v0000000-0000-0000-0000-000000000001", type: "RCA",   insurer: "Euroins",        number: "RCA-2024-001234", start: addDays(today, -365), end: addDays(today, 5),   premium: 1250, status: "expiring_soon" },
      { id: "p0000000-0000-0000-0000-000000000002", client_id: "c0000000-0000-0000-0000-000000000001", vehicle_id: "v0000000-0000-0000-0000-000000000001", type: "CASCO", insurer: "Allianz-Țiriac", number: "CASCO-2024-005678", start: addDays(today, -180), end: addDays(today, 185), premium: 3200, status: "expiring_soon" },
      { id: "p0000000-0000-0000-0000-000000000003", client_id: "c0000000-0000-0000-0000-000000000002", vehicle_id: "v0000000-0000-0000-0000-000000000002", type: "RCA",   insurer: "Groupama",      number: "RCA-2024-002345", start: addDays(today, -300), end: addDays(today, 65),  premium: 980,  status: "active" },
      { id: "p0000000-0000-0000-0000-000000000004", client_id: "c0000000-0000-0000-0000-000000000002", vehicle_id: "v0000000-0000-0000-0000-000000000003", type: "CASCO", insurer: "Allianz-Țiriac", number: "CASCO-2023-009876", start: addDays(today, -400), end: addDays(today, 320), premium: 2800, status: "active" },
      { id: "p0000000-0000-0000-0000-000000000005", client_id: "c0000000-0000-0000-0000-000000000003", vehicle_id: "v0000000-0000-0000-0000-000000000004", type: "RCA",   insurer: "Omniasig",      number: "RCA-2023-003456", start: addDays(today, -730), end: addDays(today, -30), premium: 1100, status: "expired" },
      { id: "p0000000-0000-0000-0000-000000000006", client_id: "c0000000-0000-0000-0000-000000000004", vehicle_id: "v0000000-0000-0000-0000-000000000005", type: "RCA",   insurer: "Euroins",        number: "RCA-2024-004567", start: addDays(today, -364), end: addDays(today, 1),   premium: 1350, status: "expiring_soon" },
      { id: "p0000000-0000-0000-0000-000000000007", client_id: "c0000000-0000-0000-0000-000000000005", vehicle_id: "v0000000-0000-0000-0000-000000000006", type: "RCA",   insurer: "Groupama",      number: "RCA-2024-005678", start: addDays(today, -200), end: addDays(today, 165), premium: 1050, status: "active" },
      { id: "p0000000-0000-0000-0000-000000000008", client_id: "c0000000-0000-0000-0000-000000000005", vehicle_id: null,                                       type: "HOME",  insurer: "Generali",      number: "HOME-2024-001234", start: addDays(today, -90),  end: addDays(today, 275), premium: 850,  status: "active" },
      { id: "p0000000-0000-0000-0000-000000000009", client_id: "c0000000-0000-0000-0000-000000000006", vehicle_id: "v0000000-0000-0000-0000-000000000007", type: "RCA",   insurer: "Omniasig",      number: "RCA-2024-006789", start: addDays(today, -351), end: addDays(today, 14),  premium: 1180, status: "expiring_soon" },
      { id: "p0000000-0000-0000-0000-000000000010", client_id: "c0000000-0000-0000-0000-000000000006", vehicle_id: null,                                       type: "TRAVEL",insurer: "Allianz-Țiriac", number: "TRAVEL-2024-000567", start: addDays(today, -60),  end: addDays(today, 305), premium: 350,  status: "active" },
    ];
    for (const p of demoPolicies) {
      await adminSupabase.from("policies").upsert({
        id: p.id, client_id: p.client_id, vehicle_id: p.vehicle_id, broker_id: BROKER_1_ID,
        type: p.type, insurer_name: p.insurer, policy_number: p.number,
        start_date: p.start, end_date: p.end, premium_amount: p.premium, status: p.status,
      }, { onConflict: "id" });
    }

    const demoDocs = [
      { id: "d0000000-0000-0000-0000-000000000001", client_id: "c0000000-0000-0000-0000-000000000001", type: "identity_card",    quality: "clear",  ocr: "completed" },
      { id: "d0000000-0000-0000-0000-000000000002", client_id: "c0000000-0000-0000-0000-000000000002", type: "identity_card",    quality: "clear",  ocr: "completed" },
      { id: "d0000000-0000-0000-0000-000000000003", client_id: "c0000000-0000-0000-0000-000000000002", type: "car_registration", quality: "clear",  ocr: "completed" },
      { id: "d0000000-0000-0000-0000-000000000004", client_id: "c0000000-0000-0000-0000-000000000003", type: "identity_card",    quality: "blurry", ocr: "failed" },
      { id: "d0000000-0000-0000-0000-000000000005", client_id: "c0000000-0000-0000-0000-000000000004", type: "identity_card",    quality: "clear",  ocr: "completed" },
    ];
    for (const d of demoDocs) {
      await adminSupabase.from("documents").upsert({
        id: d.id, client_id: d.client_id, broker_id: BROKER_1_ID,
        type: d.type,
        file_url: `https://placehold.co/400x300/E2E8F0/64748B?text=${d.type.replace(/_/g, "+")}`,
        quality_status: d.quality, ocr_status: d.ocr,
      }, { onConflict: "id" });
    }

    await adminSupabase.from("tasks").upsert([
      { id: "t0000000-0000-0000-0000-000000000001", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000004", policy_id: "p0000000-0000-0000-0000-000000000006", title: "Renew RCA for Alexandru Stan", description: "Policy RCA-2024-004567 expires tomorrow. Contact client urgently.", priority: "high", status: "todo", due_date: today },
      { id: "t0000000-0000-0000-0000-000000000002", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000001", policy_id: "p0000000-0000-0000-0000-000000000001", title: "Review renewal request for Maria Ionescu", description: "Client has requested renewal of RCA policy. Review and process.", priority: "medium", status: "todo", due_date: addDays(today, 2) },
      { id: "t0000000-0000-0000-0000-000000000003", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000003", title: "Call Elena Dumitru about expired policy", description: "Elena has an expired RCA policy and needs a new quote.", priority: "medium", status: "in_progress", due_date: today },
      { id: "t0000000-0000-0000-0000-000000000004", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000003", title: "Review blurry document from Elena Dumitru", description: "Identity card upload is blurry. Request a new photo.", priority: "low", status: "todo", due_date: addDays(today, 5) },
      { id: "t0000000-0000-0000-0000-000000000005", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000006", policy_id: "p0000000-0000-0000-0000-000000000009", title: "Send renewal reminder to Doru Gheorghiu", description: "RCA policy expiring in 14 days. Send reminder via portal.", priority: "medium", status: "todo", due_date: addDays(today, 7) },
    ], { onConflict: "id" });

    await adminSupabase.from("renewal_requests").upsert([
      { id: "r0000000-0000-0000-0000-000000000001", client_id: "c0000000-0000-0000-0000-000000000001", broker_id: BROKER_1_ID, policy_id: "p0000000-0000-0000-0000-000000000001", status: "requested", payment_status: "not_required" },
      { id: "r0000000-0000-0000-0000-000000000002", client_id: "c0000000-0000-0000-0000-000000000004", broker_id: BROKER_1_ID, policy_id: "p0000000-0000-0000-0000-000000000006", status: "requested", payment_status: "not_required" },
    ], { onConflict: "id" });

    await adminSupabase.from("reminders").upsert([
      { id: "rem-00000001", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000001", policy_id: "p0000000-0000-0000-0000-000000000001", channel: "email", scheduled_for: today, sent_at: today, status: "sent" },
      { id: "rem-00000002", broker_id: BROKER_1_ID, client_id: "c0000000-0000-0000-0000-000000000004", policy_id: "p0000000-0000-0000-0000-000000000006", channel: "email", scheduled_for: today, sent_at: null, status: "pending" },
    ], { onConflict: "id" });

    await adminSupabase.from("activity_logs").upsert([
      { id: "a0000000-0000-0000-0000-000000000001", broker_id: BROKER_1_ID, entity_type: "client",  entity_id: "c0000000-0000-0000-0000-000000000001", action: "created",  description: "Client Maria Ionescu was created", created_at: addDays(today, -10) },
      { id: "a0000000-0000-0000-0000-000000000002", broker_id: BROKER_1_ID, entity_type: "document", entity_id: "d0000000-0000-0000-0000-000000000001", action: "uploaded", description: "Identity card document uploaded for Maria Ionescu", created_at: addDays(today, -10) },
      { id: "a0000000-0000-0000-0000-000000000003", broker_id: BROKER_1_ID, entity_type: "document", entity_id: "d0000000-0000-0000-0000-000000000001", action: "checked",  description: "OCR completed for identity card document", created_at: addDays(today, -9) },
      { id: "a0000000-0000-0000-0000-000000000006", broker_id: BROKER_1_ID, entity_type: "reminder", entity_id: "rem-00000001",                action: "sent",     description: "Renewal reminder sent to Maria Ionescu for RCA policy", created_at: today },
      { id: "a0000000-0000-0000-0000-000000000007", broker_id: BROKER_1_ID, entity_type: "renewal_request", entity_id: "p0000000-0000-0000-0000-000000000001", action: "requested", description: "Renewal request created for RCA-2024-001234", created_at: addDays(today, -2) },
    ], { onConflict: "id" });

    // ────────────────────────────────────────────────────────────
    // STEP 3 — Insert extended dataset from scripts/seed_data.json
    // ────────────────────────────────────────────────────────────

    const jsonPath = path.resolve(process.cwd(), "scripts", "seed_data.json");
    const raw = await fs.readFile(jsonPath, "utf8");
    const ext = JSON.parse(raw) as {
      clients:     Array<Record<string, unknown>>;
      vehicles:    Array<Record<string, unknown>>;
      policies:    Array<Record<string, unknown>>;
      documents:   Array<Record<string, unknown>>;
      tasks:       Array<Record<string, unknown>>;
      reminders:   Array<Record<string, unknown>>;
      renewals:    Array<Record<string, unknown>>;
      activities:  Array<Record<string, unknown>>;
    };

    // Track errors per table for full visibility.
    const tableErrors: Record<string, Array<{ id?: string; message: string }>> = {};
    const trackError = (table: string, id: string | undefined, message: string) => {
      if (!tableErrors[table]) tableErrors[table] = [];
      tableErrors[table].push({ id, message });
    };

    const insertAll = async <T extends Record<string, unknown>>(
      table: string,
      rows: T[],
      transform?: (row: T) => T,
    ) => {
      for (const original of rows) {
        const row = transform ? transform(original) : original;
        const { error } = await adminSupabase.from(table).upsert(row, { onConflict: "id" });
        if (error) trackError(table, row.id as string | undefined, error.message);
      }
    };

    await insertAll("clients", ext.clients, (c) => {
      const { platePrefix, ...row } = c as Record<string, unknown> & { platePrefix?: string };
      void platePrefix;
      return row as typeof c;
    });
    await insertAll("vehicles", ext.vehicles);
    await insertAll("policies", ext.policies);
    await insertAll("documents", ext.documents);
    await insertAll("tasks", ext.tasks);
    await insertAll("reminders", ext.reminders);
    await insertAll("renewal_requests", ext.renewals);
    await insertAll("activity_logs", ext.activities);

    // Verification: count rows for each table to confirm the inserts actually landed.
    const verify = async (table: string) => {
      const { count } = await adminSupabase.from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    };
    const finalCounts = {
      profiles: await verify("profiles"),
      clients: await verify("clients"),
      vehicles: await verify("vehicles"),
      policies: await verify("policies"),
      documents: await verify("documents"),
      tasks: await verify("tasks"),
      reminders: await verify("reminders"),
      renewal_requests: await verify("renewal_requests"),
      activity_logs: await verify("activity_logs"),
    };

    const totalErrors = Object.values(tableErrors).reduce((a, e) => a + e.length, 0);
    const sampleErrors: Record<string, Array<{ id?: string; message: string }>> = {};
    for (const [t, errs] of Object.entries(tableErrors)) {
      sampleErrors[t] = errs.slice(0, 3);
    }

    return NextResponse.json({
      success: totalErrors === 0,
      message:
        totalErrors === 0
          ? "Comprehensive demo data seeded successfully!"
          : `Seeded with ${totalErrors} errors — see 'errors' for details.`,
      accounts: {
        broker: { email: "broker@insurecrm.com", password: "Demo123!" },
        broker2: { email: "diana@insurecrm.com", password: "Demo123!" },
        broker3: { email: "vlad@insurecrm.com", password: "Demo123!" },
        client: { email: "client@insurecrm.com", password: "Demo123!" },
      },
      counts: {
        brokers: 3,
        ...finalCounts,
      },
      errors: sampleErrors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seed failed",
      },
      { status: 500 }
    );
  }
}
