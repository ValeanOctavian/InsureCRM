#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate supabase/seed_extended.sql
 *
 * Produces a comprehensive, realistic Romanian-insurance test dataset:
 *   • 2 additional brokers (3 total in the system)
 *   • 40 additional clients across Romania
 *   • 55 additional vehicles
 *   • 75 additional policies (mix of RCA / CASCO / HOME / TRAVEL / HEALTH)
 *   • 50 additional documents
 *   • 35 additional tasks
 *   • 25 additional reminders
 *   • 20 additional renewal requests
 *   • 80 additional activity log entries
 *
 * All dates are anchored to CURRENT_DATE so the dashboard always shows
 * a meaningful mix of active / expiring_soon / expired / renewed / cancelled.
 *
 * CNPs follow the Romanian 13-digit structure (sex/century, YY, MM, DD, JJ, NNN, C).
 * License plates match the client's county (B-*, CJ-*, BV-*, etc.).
 * VINs use real WMI prefixes (WBA, WVW, TMB, UU1, …).
 *
 * Run: node scripts/generate-seed.js
 */

const fs = require("fs");
const path = require("path");

// ─── Helpers ───────────────────────────────────────────────────────────────

const pad = (n, w = 2) => String(n).padStart(w, "0");

// Generates a valid 36-char UUID. The first 8-char segment uses a hex prefix
// per entity type so they are easy to read yet still valid for Postgres `uuid`.
//   brokers          → "ff" + 6-digit#   (e.g. "ff000001-…")
//   clients          → "fe" + 6-digit#
//   vehicles         → "fd" + 6-digit#
//   policies         → "fc" + 6-digit#
//   documents        → "fb" + 6-digit#
//   tasks            → "fa" + 6-digit#
//   reminders        → "f9" + 6-digit#
//   renewal_requests → "f8" + 6-digit#
//   activity_logs    → "f7" + 6-digit#
//   id("x2", 1)   → "fe000001-0000-0000-0000-000000000000"
//   id("x2", 40)  → "fe000040-0000-0000-0000-000000000000"
const PREFIX_MAP = {
  x1: "ff", x2: "fe", x3: "fd", x4: "fc", x5: "fb",
  x6: "fa", x7: "f9", x8: "f8", x9: "f7",
};
const id = (prefix, n) =>
  `${PREFIX_MAP[prefix]}${n.toString().padStart(6, "0")}-0000-0000-0000-000000000000`;

const escapeSql = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

const fmtDate = (offsetDays) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Deterministic pseudo-random so the generated file is stable across runs.
let _seed = 1234567;
const srand = () => {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
};
const sPick = (arr) => arr[Math.floor(srand() * arr.length)];
const sInt = (min, max) => Math.floor(srand() * (max - min + 1)) + min;

// ─── Reference data ────────────────────────────────────────────────────────

const BROKER_1 = "00000000-0000-0000-0000-000000000001";
const BROKER_2 = id("x1", 1);
const BROKER_3 = id("x1", 2);

const INSURERS = [
  "Allianz-Țiriac",
  "Groupama",
  "Omniasig",
  "Generali",
  "Asirom",
  "UNIQA",
  "Signal Iduna",
  "Gothaer",
];

const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
const VEHICLE_BRANDS = [
  { brand: "Dacia", models: ["Logan", "Duster", "Sandero", "Jogger", "Spring"] },
  { brand: "Škoda", models: ["Octavia", "Fabia", "Superb", "Kamiq", "Karoq", "Scala"] },
  { brand: "Volkswagen", models: ["Golf", "Passat", "Tiguan", "Polo", "T-Roc"] },
  { brand: "Renault", models: ["Megane", "Clio", "Captur", "Arkana", "Kadjar", "Symbol"] },
  { brand: "Ford", models: ["Focus", "Fiesta", "Kuga", "Puma", "Mondeo"] },
  { brand: "Toyota", models: ["Corolla", "Yaris", "RAV4", "C-HR"] },
  { brand: "Hyundai", models: ["i30", "Tucson", "Kona", "i20", "Bayon"] },
  { brand: "Kia", models: ["Sportage", "Ceed", "Stonic", "XCeed"] },
  { brand: "BMW", models: ["320d", "520d", "X1", "X3", "X5"] },
  { brand: "Mercedes", models: ["A 180", "C 220", "E 220", "GLC 220"] },
  { brand: "Audi", models: ["A3", "A4", "Q3", "Q5"] },
  { brand: "Opel", models: ["Astra", "Corsa", "Mokka", "Crossland"] },
  { brand: "Peugeot", models: ["208", "308", "2008", "3008"] },
  { brand: "Citroen", models: ["C3", "C4", "C5 Aircross"] },
  { brand: "Fiat", models: ["500", "500X", "Panda", "Tipo"] },
  { brand: "Honda", models: ["Civic", "CR-V", "HR-V"] },
  { brand: "Tesla", models: ["Model 3", "Model Y"] },
];

// VIN WMI prefixes (real ones, so VINs look legit)
const VIN_WMI = {
  BMW: "WBA",
  Mercedes: "WDB",
  Audi: "WAU",
  Volkswagen: "WVW",
  "Škoda": "TMB",
  Dacia: "UU1",
  Renault: "VF1",
  Ford: "WF0",
  Toyota: "JTD",
  Hyundai: "KMH",
  Kia: "U5Y",
  Opel: "W0L",
  Peugeot: "VF3",
  Citroen: "VF7",
  Fiat: "ZFA",
  Honda: "JHM",
  Tesla: "5YJ",
};

// City → (county, plate prefix)
const CITIES = [
  ["București", "București", "B"],
  ["Cluj-Napoca", "Cluj", "CJ"],
  ["Iași", "Iași", "IS"],
  ["Timișoara", "Timiș", "TM"],
  ["Brașov", "Brașov", "BV"],
  ["Constanța", "Constanța", "CT"],
  ["Sibiu", "Sibiu", "SB"],
  ["Oradea", "Bihor", "BH"],
  ["Arad", "Arad", "AR"],
  ["Pitești", "Argeș", "AG"],
  ["Ploiești", "Prahova", "PH"],
  ["Craiova", "Dolj", "DJ"],
  ["Galați", "Galați", "GL"],
  ["Brăila", "Brăila", "BR"],
  ["Bacău", "Bacău", "BC"],
  ["Piatra Neamț", "Neamț", "NT"],
  ["Suceava", "Suceava", "SV"],
  ["Botoșani", "Botoșani", "BT"],
  ["Baia Mare", "Maramureș", "MM"],
  ["Satu Mare", "Satu Mare", "SM"],
  ["Alba Iulia", "Alba", "AB"],
  ["Deva", "Hunedoara", "HD"],
  ["Târgu Mureș", "Mureș", "MS"],
  ["Sfântu Gheorghe", "Covasna", "CV"],
  ["Târgu Jiu", "Gorj", "GJ"],
  ["Slatina", "Olt", "OT"],
  ["Râmnicu Vâlcea", "Vâlcea", "VL"],
  ["Târgoviște", "Dâmbovița", "DB"],
  ["Buzău", "Buzău", "BZ"],
  ["Focșani", "Vrancea", "VN"],
  ["Vaslui", "Vaslui", "VS"],
  ["Tulcea", "Tulcea", "TL"],
  ["Călărași", "Călărași", "CL"],
  ["Giurgiu", "Giurgiu", "GR"],
  ["Slobozia", "Ialomița", "IL"],
  ["Alexandria", "Teleorman", "TR"],
  ["Zalău", "Sălaj", "SJ"],
  ["Reșița", "Caraș-Severin", "CS"],
];

// Romanian first names (M / F) and last names
const FIRST_NAMES_M = [
  "Vasile", "Marian", "Bogdan", "Ciprian", "Dragoș", "Sorin", "Florin", "Adrian", "Silviu",
  "Octavian", "Nicolae", "Petre", "Marius", "Radu", "Ștefan", "Cosmin", "Lucian", "Sebastian",
  "Robert", "Aurel", "Dumitru", "Cristian", "Mihai", "Andrei", "Dan", "Ion", "Alexandru",
  "Gheorghe", "Daniel", "Cătălin", "Bogdan", "Tudor", "Flavius", "Ovidiu", "Ciprian",
];

const FIRST_NAMES_F = [
  "Gabriela", "Irina", "Roxana", "Alina", "Oana", "Mihaela", "Carmen", "Laura", "Daniela",
  "Simona", "Geanina", "Adriana", "Ana", "Bianca", "Andreea", "Monica", "Nicoleta", "Lucia",
  "Iulia", "Maria", "Elena", "Cristina", "Ioana", "Florentina", "Raluca", "Diana", "Sorina",
  "Anca", "Cosmina",
];

const LAST_NAMES = [
  "Marin", "Nistor", "Dobre", "Petrescu", "Stancu", "Lupu", "Voinea", "Iacob", "Neacșu",
  "Coman", "Vintilă", "Barbu", "Matei", "Olteanu", "Dinu", "Tudor", "Ilie", "Marinescu",
  "Enache", "Badea", "Lazăr", "Florea", "Ene", "Moldovan", "Stoica", "Cristea", "Diaconu",
  "Niculescu", "Oprea", "Neagu", "Dragu", "Bălan", "Maftei", "Costache", "Cojocaru", "Sava",
  "Tomescu", "Grigorescu", "Iancu", "Popa", "Ionescu", "Popescu", "Stănescu", "Munteanu",
];

const STREETS = [
  "Str. Mihai Viteazu", "Str. Libertății", "Str. Unirii", "Str. Avram Iancu",
  "Str. 1 Decembrie", "Bd. Independenței", "Bd. Revoluției", "Str. Primăverii",
  "Str. Victoriei", "Str. Republicii", "Str. Eminescu", "Str. Cuza Vodă",
  "Str. Stejarului", "Str. Salcâmilor", "Str. Morii", "Str. Griviței",
  "Str. Fabricii", "Str. Stadionului", "Str. Oituz", "Str. Mărășești",
  "Str. Carpați", "Str. Rozelor", "Str. Liliacului", "Str. Crinului",
  "Str. Lalelelor", "Str. Panseluțelor", "Str. Trandafirilor", "Str. Viilor",
  "Str. Castanilor", "Str. Plopilor", "Str. Soarelui", "Str. Zorilor",
  "Str. Păcii", "Str. Muncii", "Str. Gării", "Str. Metalurgiștilor",
  "Aleea Teilor", "Aleea Rozelor", "Aleea Constructorilor", "Aleea Castanilor",
  "Bd. Carol I", "Bd. Tomis", "Bd. 1 Decembrie 1918",
];

// County code → county name (for CNP position 8-9)
const COUNTY_CODE = {
  Alba: "01", Arad: "02", Argeș: "03", Bacău: "04", Bihor: "05", Bistrița: "06",
  Botoșani: "07", Brașov: "08", Brăila: "09", Buzău: "10", Caraș: "11", Cluj: "12",
  Constanța: "13", Covasna: "14", Dâmbovița: "15", Dolj: "16", Galați: "17", Gorj: "18",
  Harghita: "19", Hunedoara: "20", Ialomița: "21", Iași: "22", Ilfov: "23", Maramureș: "24",
  Mehedinți: "25", Mureș: "26", Neamț: "27", Olt: "28", Prahova: "29", Satu: "30",
  Sălaj: "31", Sibiu: "32", Suceava: "33", Teleorman: "34", Timiș: "35", Tulcea: "36",
  Vaslui: "37", Vâlcea: "38", Vrancea: "39", București: "40", Călărași: "51", Giurgiu: "52",
};

const countyFromName = (county) => {
  for (const key of Object.keys(COUNTY_CODE)) {
    if (county.startsWith(key)) return COUNTY_CODE[key];
  }
  return "40"; // fallback
};

// ─── CNP generator (structurally correct, not checksum-validated) ──────────
const makeCNP = (sex, year, month, day, countyCode, serial) => {
  // sex digit: 1=male 1900-1999, 2=female 1900-1999, 5=male 2000-2099, 6=female 2000-2099
  let s;
  if (year >= 2000) s = sex === "M" ? "5" : "6";
  else if (year >= 1900) s = sex === "M" ? "1" : "2";
  else s = sex === "M" ? "3" : "4";
  const yy = String(year).slice(-2);
  return `${s}${yy}${pad(month)}${pad(day)}${countyCode}${pad(serial, 3)}${sInt(0, 9)}`;
};

// ─── VIN generator ────────────────────────────────────────────────────────
const makeVIN = (brand) => {
  const wmi = VIN_WMI[brand] || "WBA";
  const rest = Array.from({ length: 14 }, () =>
    sPick("0123456789ABCDEFGHJKLMNPRSTUVWXYZ".split(""))
  ).join("");
  return `${wmi}${rest}`.slice(0, 17);
};

// ─── License plate generator ──────────────────────────────────────────────
const makePlate = (prefix) =>
  `${prefix}-${pad(sInt(1, 99), 2)}-${Array.from({ length: 3 }, () => sPick("ABCDEFGHJKLMNPRSTUVWXYZ".split(""))).join("")}`;

// ─── Data generators ──────────────────────────────────────────────────────

function makeClient(idx, brokerId) {
  const isFemale = srand() < 0.5;
  const first = isFemale ? sPick(FIRST_NAMES_F) : sPick(FIRST_NAMES_M);
  const last = sPick(LAST_NAMES);
  const [city, county, platePrefix] = sPick(CITIES);
  const sex = isFemale ? "F" : "M";

  // Birth year 1955-2003
  const year = sInt(1955, 2003);
  const month = sInt(1, 12);
  const day = sInt(1, 28);
  const countyCode = countyFromName(county);
  const cnp = makeCNP(sex, year, month, day, countyCode, sInt(1, 999));

  // Status mix: ~75% active, ~15% lead, ~10% inactive
  const r = srand();
  const status = r < 0.75 ? "active" : r < 0.9 ? "lead" : "inactive";

  const email = `${first.toLowerCase().replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i").replace(/ș/g, "s").replace(/ț/g, "t")}.${last
    .toLowerCase()
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")}@email.ro`;

  const phone = `+40 7${sInt(20, 99)} ${sInt(100, 999)} ${pad(sInt(1, 999), 3)}`;

  const notes =
    srand() < 0.15
      ? sPick([
          "Client preferă comunicarea pe WhatsApp.",
          "Foarte loial, client din 2018.",
          "Lead venit din recomandare.",
          "Are 2 mașini în familie.",
          "Solicită oferte RCA lunar.",
          "Poliță anulată, nu a mai revenit.",
          "Client mutat în străinătate în 2023.",
          "Sensibil la preț, dorește reduceri.",
        ])
      : null;

  return {
    id: id("x2", idx),
    broker_id: brokerId,
    first_name: first,
    last_name: last,
    cnp,
    email,
    phone,
    address: `${sPick(STREETS)} ${sInt(1, 180)}`,
    city,
    county,
    status,
    notes,
    platePrefix,
  };
}

function makeVehicle(idx, client) {
  const brandObj = sPick(VEHICLE_BRANDS);
  const brand = brandObj.brand;
  const model = sPick(brandObj.models);
  const year = sInt(2015, 2024);
  const isElectric = brand === "Tesla" || (model === "Spring");
  const isHybrid = !isElectric && srand() < 0.2;
  let fuel;
  if (isElectric) fuel = "Electric";
  else if (isHybrid) fuel = "Hybrid";
  else fuel = srand() < 0.5 ? "Diesel" : "Petrol";

  // Engine capacity
  const engine =
    fuel === "Electric"
      ? 0
      : fuel === "Hybrid"
      ? sPick([1490, 1798, 1987, 1598])
      : sPick([999, 1199, 1399, 1461, 1499, 1591, 1598, 1968, 1995, 1998]);

  return {
    id: id("x3", idx),
    client_id: client.id,
    broker_id: client.broker_id,
    registration_number: makePlate(client.platePrefix),
    vin: makeVIN(brand),
    brand,
    model,
    year,
    engine_capacity: engine,
    fuel_type: fuel,
    document_number: `CIV-${client.platePrefix}-${year}-${sInt(100000, 999999)}`,
  };
}

function makePolicy(idx, client, vehicle, type) {
  // Date logic depending on status
  const statusRoll = srand();
  let status, startOffset, endOffset, premium;

  if (type === "RCA") {
    premium = sInt(550, 2200);
  } else if (type === "CASCO") {
    premium = sInt(1800, 5500);
  } else if (type === "HOME") {
    premium = sInt(450, 1800);
  } else if (type === "TRAVEL") {
    premium = sInt(150, 500);
  } else if (type === "HEALTH") {
    premium = sInt(900, 2500);
  } else {
    premium = sInt(500, 2000);
  }

  // ~45% active, ~25% expiring_soon, ~10% expired, ~15% renewed, ~5% cancelled
  if (statusRoll < 0.45) {
    status = "active";
    startOffset = -sInt(20, 340);
    endOffset = sInt(20, 340);
  } else if (statusRoll < 0.70) {
    status = "expiring_soon";
    startOffset = -sInt(330, 365);
    endOffset = sInt(1, 30);
  } else if (statusRoll < 0.80) {
    status = "expired";
    startOffset = -sInt(400, 800);
    endOffset = -sInt(20, 365);
  } else if (statusRoll < 0.95) {
    status = "renewed";
    startOffset = -sInt(700, 1100);
    endOffset = -sInt(300, 365);
  } else {
    status = "cancelled";
    startOffset = -sInt(800, 1200);
    endOffset = -sInt(300, 700);
  }

  const insurer = sPick(INSURERS);
  const year = new Date().getFullYear();
  const typeCode = type === "RCA" ? "RCA" : type === "CASCO" ? "CSC" : type === "HOME" ? "HOM" : type === "TRAVEL" ? "TRV" : type === "HEALTH" ? "HEA" : "OTH";
  const brokerSuffix = client.broker_id === BROKER_1 ? "1" : client.broker_id === BROKER_2 ? "2" : "3";
  const policyNumber = `${typeCode}-${year}-${brokerSuffix}${pad(idx, 5)}`;

  return {
    id: id("x4", idx),
    client_id: client.id,
    vehicle_id: type === "HOME" || type === "TRAVEL" || type === "HEALTH" ? null : vehicle?.id ?? null,
    broker_id: client.broker_id,
    type,
    insurer_name: insurer,
    policy_number: policyNumber,
    start_date: fmtDate(startOffset),
    end_date: fmtDate(endOffset),
    premium_amount: premium,
    status,
  };
}

function makeDocument(idx, client, vehicle) {
  const r = srand();
  let quality, ocr, type;
  if (r < 0.05) {
    type = "address_certificate";
  } else if (vehicle && srand() < 0.3) {
    type = "car_registration";
  } else {
    type = "identity_card";
  }

  // quality: 80% clear, 10% blurry, 5% rejected, 5% pending
  const q = srand();
  if (q < 0.80) quality = "clear";
  else if (q < 0.90) quality = "blurry";
  else if (q < 0.95) quality = "rejected";
  else quality = "pending";

  // ocr correlates with quality
  let ocr2;
  if (quality === "clear") ocr2 = srand() < 0.9 ? "completed" : "processing";
  else if (quality === "blurry") ocr2 = srand() < 0.7 ? "failed" : "processing";
  else if (quality === "rejected") ocr2 = "failed";
  else ocr2 = "pending";

  const createdAt = sInt(0, 60);

  // Realistic file_url via placehold.co
  const text = `${type.replace(/_/g, "+")}+${client.first_name}`;
  const bg = quality === "blurry" || quality === "rejected" ? "FEE2E2/EF4444" : "E2E8F0/64748B";
  const file_url = `https://placehold.co/400x300/${bg}?text=${text}`;

  // extracted_data realistic JSON
  const extracted_data =
    ocr2 === "completed"
      ? JSON.stringify({
          cnp: client.cnp,
          first_name: client.first_name,
          last_name: client.last_name,
          ...(vehicle ? { reg_number: vehicle.registration_number, vin: vehicle.vin } : {}),
        })
      : null;

  return {
    id: id("x5", idx),
    client_id: client.id,
    vehicle_id: type === "car_registration" ? vehicle?.id ?? null : null,
    broker_id: client.broker_id,
    type,
    file_url,
    quality_status: quality,
    ocr_status: ocr2,
    extracted_data,
    created_at: fmtDate(-createdAt),
  };
}

function makeTask(idx, client, policy) {
  const r = srand();
  const status =
    r < 0.50 ? "todo" : r < 0.75 ? "in_progress" : r < 0.95 ? "done" : "cancelled";
  const priority = srand() < 0.25 ? "high" : srand() < 0.5 ? "medium" : "low";

  const titles = [
    `Renew ${policy?.type ?? "policy"} for ${client.first_name} ${client.last_name}`,
    `Review ${policy?.type ?? "policy"} offer for ${client.first_name}`,
    `Call ${client.first_name} about renewal`,
    `Send reminder to ${client.last_name}`,
    `Process ${policy?.type ?? "policy"} request`,
    `Request new ID photo from ${client.first_name}`,
    `Quote new policy for ${client.first_name} ${client.last_name}`,
    `Annual review for ${client.last_name}`,
    `Bundle quote for ${client.first_name}`,
    `Update vehicle data in policy`,
  ];
  const descriptions = [
    `Policy ${policy?.policy_number ?? "N/A"} expires soon. Contact client.`,
    `Client has requested a new quote. Prepare 3 offers from top insurers.`,
    `Follow up on client satisfaction and cross-sell opportunities.`,
    `Document upload was unclear. Request a clearer copy.`,
    `Loyal client — discuss add-on products (life, health, travel).`,
    `Mid-year portfolio review. Send summary document.`,
    `Urgent — policy expires in less than 7 days.`,
    `Process renewal and confirm payment details.`,
  ];

  let dueOffset;
  if (status === "done") dueOffset = -sInt(1, 30);
  else if (status === "in_progress") dueOffset = sInt(0, 7);
  else dueOffset = sInt(-3, 30);

  return {
    id: id("x6", idx),
    broker_id: client.broker_id,
    client_id: client.id,
    policy_id: policy?.id ?? null,
    title: sPick(titles),
    description: sPick(descriptions),
    priority,
    status,
    due_date: fmtDate(dueOffset),
    created_at: fmtDate(-sInt(1, 14)),
  };
}

function makeReminder(idx, client, policy) {
  const channels = ["email", "sms", "whatsapp"];
  const channel = sPick(channels);
  const r = srand();
  const status = r < 0.60 ? "sent" : r < 0.85 ? "pending" : "failed";
  const scheduledFor = sInt(-7, 7);
  const sentAt = status === "sent" ? fmtDate(scheduledFor) : null;

  return {
    id: id("x7", idx),
    broker_id: client.broker_id,
    client_id: client.id,
    policy_id: policy.id,
    channel,
    scheduled_for: fmtDate(scheduledFor),
    sent_at: sentAt,
    status,
    created_at: fmtDate(-sInt(0, 7)),
  };
}

function makeRenewalRequest(idx, client, policy) {
  const r = srand();
  const status =
    r < 0.40 ? "requested" : r < 0.60 ? "in_progress" : r < 0.80 ? "documents_needed" : r < 0.95 ? "issued" : "cancelled";
  const payRoll = srand();
  const payment_status = payRoll < 0.4 ? "paid" : payRoll < 0.7 ? "unpaid" : "not_required";
  return {
    id: id("x8", idx),
    client_id: client.id,
    broker_id: client.broker_id,
    policy_id: policy.id,
    status,
    payment_status,
    created_at: fmtDate(-sInt(0, 30)),
  };
}

function makeActivityLog(idx, client, policy, vehicle, document, task) {
  // Always produce semantically-correct activity rows:
  // pick an entity type, then ensure the matching entity_id exists for that client.
  const clientPolicies = []; // populated outside, by reference
  const clientDocs = [];
  const clientTasks = [];

  const choices = [
    { type: "client", action: "created" },
    { type: "client", action: "updated" },
    { type: "policy", action: "created" },
    { type: "policy", action: "renewed" },
    { type: "policy", action: "updated" },
    { type: "document", action: "uploaded" },
    { type: "document", action: "checked" },
    { type: "document", action: "completed" },
    { type: "task", action: "created" },
    { type: "task", action: "completed" },
    { type: "reminder", action: "sent" },
    { type: "reminder", action: "failed" },
    { type: "renewal_request", action: "requested" },
    { type: "renewal_request", action: "approved" },
    { type: "renewal_request", action: "rejected" },
  ];
  const pick = choices[Math.floor(srand() * choices.length)];
  const { type: entityType, action } = pick;

  const descriptions = {
    "client/created": `Client ${client.first_name} ${client.last_name} was created`,
    "client/updated": `Client ${client.first_name} ${client.last_name} was updated`,
    "document/uploaded": `Document uploaded for ${client.first_name} ${client.last_name}`,
    "document/checked": `OCR check completed for document of ${client.first_name} ${client.last_name}`,
    "document/completed": `Document processing completed for ${client.first_name} ${client.last_name}`,
    "policy/created": `Policy ${policy?.policy_number ?? "—" } created for ${client.first_name} ${client.last_name}`,
    "policy/renewed": `Policy ${policy?.policy_number ?? "—" } renewed for ${client.first_name} ${client.last_name}`,
    "policy/updated": `Policy ${policy?.policy_number ?? "—" } updated for ${client.first_name} ${client.last_name}`,
    "task/created": `Task created for ${client.first_name} ${client.last_name}`,
    "task/completed": `Task completed for ${client.first_name} ${client.last_name}`,
    "reminder/sent": `Renewal reminder sent to ${client.first_name} ${client.last_name}`,
    "reminder/failed": `Reminder delivery failed for ${client.first_name} ${client.last_name}`,
    "renewal_request/requested": `Renewal request created for ${policy?.policy_number ?? "policy"}`,
    "renewal_request/approved": `Renewal request approved for ${client.first_name} ${client.last_name}`,
    "renewal_request/rejected": `Renewal request rejected for ${client.first_name} ${client.last_name}`,
  };
  const description = descriptions[`${entityType}/${action}`];

  // Pick an entity that actually exists for the given entity_type
  let entity_id;
  if (entityType === "client") entity_id = client.id;
  else if (entityType === "document") entity_id = document?.id ?? client.id;
  else if (entityType === "policy") entity_id = policy?.id ?? client.id;
  else if (entityType === "task") entity_id = task?.id ?? client.id;
  else if (entityType === "reminder") entity_id = policy?.id ?? client.id;
  else if (entityType === "renewal_request") entity_id = policy?.id ?? client.id;
  else entity_id = client.id;

  return {
    id: id("x9", idx),
    broker_id: client.broker_id,
    entity_type: entityType,
    entity_id,
    action,
    description,
    created_at: fmtDate(-sInt(0, 90)),
  };
}

// ─── Build the dataset ────────────────────────────────────────────────────

const NUM_CLIENTS = 40;
const TARGET_VEHICLES = 55; // ~1.4 vehicles per client
const TARGET_POLICIES = 75;
const TARGET_DOCUMENTS = 50;
const TARGET_TASKS = 35;
const TARGET_REMINDERS = 25;
const TARGET_RENEWALS = 20;
const TARGET_ACTIVITIES = 80;

// Brokers: 15 clients for broker 1, 12 for broker 2, 13 for broker 3
const clients = [];
for (let i = 1; i <= 15; i++) clients.push(makeClient(i, BROKER_1));
for (let i = 16; i <= 27; i++) clients.push(makeClient(i, BROKER_2));
for (let i = 28; i <= 40; i++) clients.push(makeClient(i, BROKER_3));

// Vehicles: give the first 15 clients a second vehicle, total TARGET_VEHICLES
const vehicles = [];
let vIdx = 1;
for (const c of clients) {
  vehicles.push(makeVehicle(vIdx++, c));
}
while (vehicles.length < TARGET_VEHICLES) {
  vehicles.push(makeVehicle(vIdx++, sPick(clients)));
}

// Policies: RCA on every vehicle, CASCO on ~25% of vehicles, plus HOME/TRAVEL/HEALTH for some clients
const policies = [];
let pIdx = 1;
for (const v of vehicles) {
  const c = clients.find((c) => c.id === v.client_id);
  if (!c) continue;
  if (c.status === "inactive" && srand() < 0.5) continue;
  policies.push(makePolicy(pIdx++, c, v, "RCA"));
  if (srand() < 0.25) policies.push(makePolicy(pIdx++, c, v, "CASCO"));
}

// Add HOME / TRAVEL / HEALTH for some active clients
for (const c of clients) {
  if (c.status !== "active") continue;
  if (srand() < 0.20) {
    const fakeV = vehicles.find((v) => v.client_id === c.id);
    policies.push(makePolicy(pIdx++, c, fakeV, "HOME"));
  }
  if (srand() < 0.10) {
    const fakeV = vehicles.find((v) => v.client_id === c.id);
    policies.push(makePolicy(pIdx++, c, fakeV, "TRAVEL"));
  }
  if (srand() < 0.07) {
    const fakeV = vehicles.find((v) => v.client_id === c.id);
    policies.push(makePolicy(pIdx++, c, fakeV, "HEALTH"));
  }
}

// Trim or pad to exactly TARGET_POLICIES
const finalPolicies = policies.slice(0, TARGET_POLICIES);

// Documents
const documents = [];
for (let i = 0; i < TARGET_DOCUMENTS; i++) {
  const c = sPick(clients);
  const v = vehicles.find((v) => v.client_id === c.id);
  documents.push(makeDocument(i + 1, c, v));
}

// Tasks
const tasks = [];
for (let i = 0; i < TARGET_TASKS; i++) {
  const c = sPick(clients);
  const p = sPick(finalPolicies.filter((p) => p.client_id === c.id));
  tasks.push(makeTask(i + 1, c, p));
}

// Reminders
const reminders = [];
for (let i = 0; i < TARGET_REMINDERS; i++) {
  const p = sPick(finalPolicies);
  const c = clients.find((c) => c.id === p.client_id);
  reminders.push(makeReminder(i + 1, c, p));
}

// Renewal requests
const renewals = [];
for (let i = 0; i < TARGET_RENEWALS; i++) {
  const p = sPick(finalPolicies);
  const c = clients.find((c) => c.id === p.client_id);
  renewals.push(makeRenewalRequest(i + 1, c, p));
}

// Activity logs
const activities = [];
for (let i = 0; i < TARGET_ACTIVITIES; i++) {
  const c = sPick(clients);
  const clientPolicies = finalPolicies.filter((p) => p.client_id === c.id);
  const clientDocs = documents.filter((d) => d.client_id === c.id);
  const clientTasks = tasks.filter((t) => t.client_id === c.id);
  const p = clientPolicies.length ? sPick(clientPolicies) : null;
  const d = clientDocs.length ? sPick(clientDocs) : null;
  const t = clientTasks.length ? sPick(clientTasks) : null;
  activities.push(makeActivityLog(i + 1, c, p, null, d, t));
}

// ─── SQL generation ───────────────────────────────────────────────────────

let sql = "";

// Header
sql += `-- ============================================================================
-- InsureCRM — EXTENDED SEED DATA
-- ============================================================================
-- Realistic, comprehensive test data for demo / development.
-- Generated by scripts/generate-seed.js
--
-- Adds on top of the base seed (seed.sql):
--   • ${2} additional brokers (3 total in the system)
--   • ${clients.length} additional clients across Romania
--   • ${vehicles.length} additional vehicles
--   • ${finalPolicies.length} additional policies — mixed types, mixed statuses
--   • ${documents.length} additional documents — mixed quality / OCR states
--   • ${tasks.length} additional tasks — todos, in-progress, done, cancelled
--   • ${reminders.length} additional reminders — sent / pending / failed
--   • ${renewals.length} additional renewal requests
--   • ${activities.length} additional activity log entries
--
-- Notes:
--   • CNPs follow the Romanian 13-digit structure (sex/century, YY, MM, DD, JJ, NNN, C)
--   • License plates match the client's county (B-* for București, CJ-* for Cluj, etc.)
--   • VINs use real WMI prefixes (WBA=BMW, WVW=VW, TMB=Škoda, UU1=Dacia, …)
--   • Insurer names are real Romanian insurance companies
--   • Dates are anchored to CURRENT_DATE so the dashboard always shows
--     a meaningful "expiring soon" / "expired" / "active" mix.
-- ============================================================================

-- ─── 0. Clean up potential conflicts (so re-running is safe) ───

DELETE FROM activity_logs    WHERE id::text LIKE 'f7%';
DELETE FROM renewal_requests WHERE id::text LIKE 'f8%';
DELETE FROM reminders        WHERE id::text LIKE 'f9%';
DELETE FROM tasks            WHERE id::text LIKE 'fa%';
DELETE FROM documents        WHERE id::text LIKE 'fb%';
DELETE FROM policies         WHERE id::text LIKE 'fc%';
DELETE FROM vehicles         WHERE id::text LIKE 'fd%';
DELETE FROM clients          WHERE id::text LIKE 'fe%';
DELETE FROM profiles         WHERE id::text LIKE 'ff%';
`;

// Brokers
sql += `\n-- ─── 1. Additional brokers (x1…) ───\n\n`;
sql += `INSERT INTO profiles (id, user_id, full_name, email, phone, role, broker_id) VALUES\n`;
sql += `  ('${BROKER_1}', 'auth-user-broker-1', 'Andrei Popescu',     'broker@insurecrm.com',  '+40 721 123 456', 'broker', NULL),\n`;
sql += `  ('${BROKER_2}', 'auth-user-broker-2', 'Diana Munteanu',     'diana@insurecrm.com',   '+40 731 555 101', 'broker', NULL),\n`;
sql += `  ('${BROKER_3}', 'auth-user-broker-3', 'Vlad Constantinescu', 'vlad@insurecrm.com',    '+40 732 555 202', 'broker', NULL);\n`;

// Clients
sql += `\n-- ─── 2. Additional clients (x2…) — ${clients.length} clients, distributed across 3 brokers ───\n\n`;
sql += `INSERT INTO clients (id, broker_id, first_name, last_name, cnp, email, phone, address, city, county, status, notes) VALUES\n`;
sql += clients
  .map(
    (c, i) =>
      `  ('${c.id}', '${c.broker_id}', ${escapeSql(c.first_name)}, ${escapeSql(c.last_name)}, ${escapeSql(c.cnp)}, ${escapeSql(c.email)}, ${escapeSql(c.phone)}, ${escapeSql(c.address)}, ${escapeSql(c.city)}, ${escapeSql(c.county)}, '${c.status}', ${escapeSql(c.notes)})${i < clients.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Vehicles
sql += `\n-- ─── 3. Additional vehicles (x3…) — ${vehicles.length} vehicles ───\n\n`;
sql += `INSERT INTO vehicles (id, client_id, broker_id, registration_number, vin, brand, model, year, engine_capacity, fuel_type, document_number) VALUES\n`;
sql += vehicles
  .map(
    (v, i) =>
      `  ('${v.id}', '${v.client_id}', '${v.broker_id}', ${escapeSql(v.registration_number)}, ${escapeSql(v.vin)}, ${escapeSql(v.brand)}, ${escapeSql(v.model)}, ${v.year}, ${v.engine_capacity}, ${escapeSql(v.fuel_type)}, ${escapeSql(v.document_number)})${i < vehicles.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Policies
sql += `\n-- ─── 4. Additional policies (x4…) — ${finalPolicies.length} policies ───\n\n`;
sql += `INSERT INTO policies (id, client_id, vehicle_id, broker_id, type, insurer_name, policy_number, start_date, end_date, premium_amount, status) VALUES\n`;
sql += finalPolicies
  .map(
    (p, i) =>
      `  ('${p.id}', '${p.client_id}', ${p.vehicle_id ? `'${p.vehicle_id}'` : "NULL"}, '${p.broker_id}', '${p.type}', ${escapeSql(p.insurer_name)}, ${escapeSql(p.policy_number)}, '${p.start_date}', '${p.end_date}', ${p.premium_amount}.00, '${p.status}')${i < finalPolicies.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Documents
sql += `\n-- ─── 5. Additional documents (x5…) — ${documents.length} documents ───\n\n`;
sql += `INSERT INTO documents (id, client_id, vehicle_id, broker_id, type, file_url, quality_status, ocr_status, extracted_data, created_at) VALUES\n`;
sql += documents
  .map(
    (d, i) =>
      `  ('${d.id}', '${d.client_id}', ${d.vehicle_id ? `'${d.vehicle_id}'` : "NULL"}, '${d.broker_id}', '${d.type}', ${escapeSql(d.file_url)}, '${d.quality_status}', '${d.ocr_status}', ${escapeSql(d.extracted_data)}::jsonb, '${d.created_at}')${i < documents.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Tasks
sql += `\n-- ─── 6. Additional tasks (x6…) — ${tasks.length} tasks ───\n\n`;
sql += `INSERT INTO tasks (id, broker_id, client_id, policy_id, title, description, priority, status, due_date, created_at) VALUES\n`;
sql += tasks
  .map(
    (t, i) =>
      `  ('${t.id}', '${t.broker_id}', '${t.client_id}', ${t.policy_id ? `'${t.policy_id}'` : "NULL"}, ${escapeSql(t.title)}, ${escapeSql(t.description)}, '${t.priority}', '${t.status}', '${t.due_date}', '${t.created_at}')${i < tasks.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Reminders
sql += `\n-- ─── 7. Additional reminders (x7…) — ${reminders.length} reminders ───\n\n`;
sql += `INSERT INTO reminders (id, broker_id, client_id, policy_id, channel, scheduled_for, sent_at, status, created_at) VALUES\n`;
sql += reminders
  .map(
    (r, i) =>
      `  ('${r.id}', '${r.broker_id}', '${r.client_id}', '${r.policy_id}', '${r.channel}', '${r.scheduled_for}', ${r.sent_at ? `'${r.sent_at}'` : "NULL"}, '${r.status}', '${r.created_at}')${i < reminders.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Renewals
sql += `\n-- ─── 8. Additional renewal requests (x8…) — ${renewals.length} renewals ───\n\n`;
sql += `INSERT INTO renewal_requests (id, client_id, broker_id, policy_id, status, payment_status, created_at) VALUES\n`;
sql += renewals
  .map(
    (r, i) =>
      `  ('${r.id}', '${r.client_id}', '${r.broker_id}', '${r.policy_id}', '${r.status}', '${r.payment_status}', '${r.created_at}')${i < renewals.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Activities
sql += `\n-- ─── 9. Additional activity logs (x9…) — ${activities.length} entries ───\n\n`;
sql += `INSERT INTO activity_logs (id, broker_id, entity_type, entity_id, action, description, created_at) VALUES\n`;
sql += activities
  .map(
    (a, i) =>
      `  ('${a.id}', '${a.broker_id}', '${a.entity_type}', '${a.entity_id}', '${a.action}', ${escapeSql(a.description)}, '${a.created_at}')${i < activities.length - 1 ? "," : ""}`
  )
  .join("\n");
sql += `;\n`;

// Footer
sql += `\n-- ─── Done. Combined with the base seed the system now has: ───\n`;
sql += `--    3 brokers  /  ${clients.length + 6} clients  /  ${vehicles.length + 7} vehicles  /  ${finalPolicies.length + 10} policies\n`;
sql += `--    ${documents.length + 5} documents  /  ${tasks.length + 5} tasks  /  ${reminders.length + 2} reminders  /  ${renewals.length + 2} renewal requests  /  ${activities.length + 10} activity logs\n`;

// Write file
const outPath = path.resolve(__dirname, "..", "supabase", "seed_extended.sql");
fs.writeFileSync(outPath, sql, "utf8");
console.log(`✓ Generated ${outPath} (${(sql.length / 1024).toFixed(1)} KB, ${sql.split("\n").length} lines)`);

// Also write a JSON version that the /api/seed route can consume directly.
const jsonPath = path.resolve(__dirname, "seed_data.json");
fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      brokers: [
        { profileId: BROKER_1, email: "broker@insurecrm.com", fullName: "Andrei Popescu", phone: "+40 721 123 456" },
        { profileId: BROKER_2, email: "diana@insurecrm.com", fullName: "Diana Munteanu", phone: "+40 731 555 101" },
        { profileId: BROKER_3, email: "vlad@insurecrm.com", fullName: "Vlad Constantinescu", phone: "+40 732 555 202" },
      ],
      clients,
      vehicles,
      policies: finalPolicies,
      documents,
      tasks,
      reminders,
      renewals,
      activities,
    },
    null,
    2
  ),
  "utf8"
);
console.log(`✓ Generated ${jsonPath} (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)`);
