import { createClient } from "@/lib/supabase/server";
import { addDays, startOfDay, endOfMonth, startOfMonth, format } from "date-fns";
import type { PolicyStatus, PolicyType, TaskStatus, OcrStatus, QualityStatus } from "@/types";

// ─── Response Types ───

export interface AssistantResponse {
  summary: string;
  sections: ResponseSection[];
  actions?: { label: string; href: string }[];
}

export interface ResponseSection {
  title: string;
  type: "list" | "table" | "stats" | "alert";
  items?: { label: string; value: string; href?: string }[];
  columns?: string[];
  rows?: string[][];
  stats?: { label: string; value: string; color?: string }[];
  alerts?: { message: string; severity: "info" | "warning" | "danger" }[];
}

// ─── Question Types ───

type QuestionHandler = (profileId: string) => Promise<AssistantResponse>;

interface QuestionPattern {
  keywords: string[];
  handler: QuestionHandler;
  description: string;
}

// ─── Handlers ───

const policiesExpiringNextWeek: QuestionHandler = async (profileId: string) => {
  const supabase = await createClient();
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const { data: policies } = await supabase
    .from("policies")
    .select("*, clients(first_name, last_name)")
    .eq("broker_id", profileId)
    .in("status", ["active", "expiring_soon"])
    .lte("end_date", in7Days.toISOString())
    .gte("end_date", today.toISOString())
    .order("end_date", { ascending: true });

  const items = (policies ?? []).map((p) => ({
    label: `${p.clients?.first_name ?? "?"} ${p.clients?.last_name ?? "?"}`,
    value: `${p.type} · ${p.policy_number} · Exp ${format(new Date(p.end_date), "MMM d")}`,
    href: "/broker/policies",
  }));

  return {
    summary: `Found ${items.length} polic${items.length === 1 ? "y" : "ies"} expiring within the next 7 days.`,
    sections: [
      {
        title: "Policies Expiring This Week",
        type: "list",
        items: items.length > 0 ? items : [{ label: "No policies", value: "All policies are up to date." }],
      },
    ],
    actions: [{ label: "View All Policies", href: "/broker/policies" }],
  };
};

const clientsToCallToday: QuestionHandler = async (profileId: string) => {
  const supabase = await createClient();
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  // Clients with urgent tasks today
  const { data: urgentTasks } = await supabase
    .from("tasks")
    .select("*, clients(first_name, last_name, phone)")
    .eq("broker_id", profileId)
    .in("status", ["todo", "in_progress"])
    .lte("due_date", today.toISOString())
    .order("priority", { ascending: true });

  // Clients with policies expiring within 7 days
  const { data: urgentPolicies } = await supabase
    .from("policies")
    .select("*, clients(first_name, last_name, phone)")
    .eq("broker_id", profileId)
    .in("status", ["active", "expiring_soon"])
    .lte("end_date", in7Days.toISOString())
    .gte("end_date", today.toISOString());

  // Combine unique clients
  const clientMap = new Map<string, { name: string; phone: string | null; reasons: string[] }>();

  for (const t of urgentTasks ?? []) {
    if (!t.clients) continue;
    const key = `${t.clients.first_name} ${t.clients.last_name}`;
    if (!clientMap.has(key)) {
      clientMap.set(key, { name: key, phone: t.clients.phone, reasons: [] });
    }
    clientMap.get(key)!.reasons.push(`Task: ${t.title}`);
  }

  for (const p of urgentPolicies ?? []) {
    if (!p.clients) continue;
    const key = `${p.clients.first_name} ${p.clients.last_name}`;
    if (!clientMap.has(key)) {
      clientMap.set(key, { name: key, phone: p.clients.phone, reasons: [] });
    }
    clientMap.get(key)!.reasons.push(`${p.type} policy expiring ${format(new Date(p.end_date), "MMM d")}`);
  }

  const items = Array.from(clientMap.values()).map((c) => ({
    label: c.name,
    value: c.phone ? `${c.phone} · ${c.reasons[0]}` : `No phone · ${c.reasons[0]}`,
    href: "/broker/clients",
  }));

  return {
    summary: `Found ${items.length} client${items.length === 1 ? "" : "s"} that may need a call today.`,
    sections: [
      {
        title: "Clients to Contact",
        type: "list",
        items: items.length > 0 ? items : [{ label: "All caught up", value: "No clients need attention today." }],
      },
    ],
    actions: [{ label: "View All Clients", href: "/broker/clients" }],
  };
};

const rcaWithoutCasco: QuestionHandler = async (profileId: string) => {
  const supabase = await createClient();

  // Find clients with RCA policies
  const { data: rcaClients } = await supabase
    .from("policies")
    .select("client_id")
    .eq("broker_id", profileId)
    .eq("type", "RCA")
    .in("status", ["active", "expiring_soon"]);

  const rcaClientIds = [...new Set((rcaClients ?? []).map((p) => p.client_id))];

  // Check which of those also have CASCO
  const { data: cascoPolicies } = await supabase
    .from("policies")
    .select("client_id")
    .eq("broker_id", profileId)
    .eq("type", "CASCO")
    .in("status", ["active", "expiring_soon"])
    .in("client_id", rcaClientIds);

  const cascoClientIds = new Set((cascoPolicies ?? []).map((p) => p.client_id));
  const crossSellCandidates = rcaClientIds.filter((id) => !cascoClientIds.has(id));

  if (crossSellCandidates.length === 0) {
    return {
      summary: "No clients with RCA-only policies found. All RCA clients also have CASCO coverage.",
      sections: [{ title: "Cross-sell Opportunities", type: "list", items: [{ label: "All covered", value: "No cross-sell opportunities right now." }] }],
    };
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone")
    .in("id", crossSellCandidates);

  const items = (clients ?? []).map((c) => ({
    label: `${c.first_name} ${c.last_name}`,
    value: c.phone ? `📞 ${c.phone}` : "No phone on file",
    href: "/broker/clients",
  }));

  // Calculate potential revenue
  const avgCascoPremium = 2500;
  const potentialRevenue = crossSellCandidates.length * avgCascoPremium;

  return {
    summary: `Found ${crossSellCandidates.length} client${crossSellCandidates.length === 1 ? "" : "s"} with RCA but no CASCO. Estimated cross-sell potential: ~${potentialRevenue.toLocaleString()} RON.`,
    sections: [
      { title: "Cross-sell Candidates (RCA → add CASCO)", type: "list", items },
      { title: "Estimated Revenue", type: "stats", stats: [{ label: "Potential premium", value: `${potentialRevenue.toLocaleString()} RON`, color: "green" }, { label: "Clients", value: String(crossSellCandidates.length), color: "blue" }] },
    ],
    actions: [{ label: "View Clients", href: "/broker/clients" }],
  };
};

const unclearDocuments: QuestionHandler = async (profileId: string) => {
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*, clients(first_name, last_name)")
    .eq("broker_id", profileId)
    .in("quality_status", ["blurry", "rejected"] as QualityStatus[])
    .order("created_at", { ascending: false });

  const items = (documents ?? []).map((d) => ({
    label: `${d.clients?.first_name ?? "?"} ${d.clients?.last_name ?? "?"}`,
    value: `${d.type.replace(/_/g, " ")} — ${d.quality_status}`,
    href: "/broker/documents",
  }));

  return {
    summary: `Found ${items.length} document${items.length === 1 ? "" : "s"} with poor image quality.`,
    sections: [
      {
        title: "Unclear Documents",
        type: "list",
        items: items.length > 0 ? items : [{ label: "No issues", value: "All documents have clear quality." }],
      },
    ],
    actions: [{ label: "View Documents", href: "/broker/documents" }],
  };
};

const pendingRenewals: QuestionHandler = async (profileId: string) => {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("renewal_requests")
    .select("*, policies(policy_number, type, insurer_name), clients(first_name, last_name)")
    .eq("broker_id", profileId)
    .in("status", ["requested", "documents_needed", "in_progress"])
    .order("created_at", { ascending: false });

  const items = (requests ?? []).map((r) => ({
    label: `${r.clients?.first_name ?? "?"} ${r.clients?.last_name ?? "?"}`,
    value: `${r.policies?.type ?? "?"} · ${r.policies?.policy_number ?? "?"} · ${r.status.replace(/_/g, " ")}`,
    href: "/broker/renewals",
  }));

  return {
    summary: `You have ${items.length} pending renewal request${items.length === 1 ? "" : "s"}.`,
    sections: [
      {
        title: "Pending Renewal Requests",
        type: "list",
        items: items.length > 0 ? items : [{ label: "No pending renewals", value: "All caught up." }],
      },
    ],
    actions: [{ label: "View Renewals", href: "/broker/renewals" }],
  };
};

const estimatedRevenue: QuestionHandler = async (profileId: string) => {
  const supabase = await createClient();
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Policies expiring this month
  const { data: expiringThisMonth } = await supabase
    .from("policies")
    .select("premium_amount, type")
    .eq("broker_id", profileId)
    .in("status", ["active", "expiring_soon"])
    .lte("end_date", monthEnd.toISOString())
    .gte("end_date", today.toISOString());

  // Policies already expired
  const { data: expired } = await supabase
    .from("policies")
    .select("premium_amount, type")
    .eq("broker_id", profileId)
    .eq("status", "expired");

  // Active policies total
  const { data: active } = await supabase
    .from("policies")
    .select("premium_amount")
    .eq("broker_id", profileId)
    .eq("status", "active");

  const expiringTotal = (expiringThisMonth ?? []).reduce((s, p) => s + (p.premium_amount ?? 0), 0);
  const expiredTotal = (expired ?? []).reduce((s, p) => s + (p.premium_amount ?? 0), 0);
  const activeTotal = (active ?? []).reduce((s, p) => s + (p.premium_amount ?? 0), 0);
  const recoveryEstimate = Math.round(expiringTotal * 0.7 + expiredTotal * 0.3); // 70% renewal rate for expiring, 30% for expired

  const stats = [
    { label: "Active premium total", value: `${activeTotal.toLocaleString()} RON`, color: "green" as const },
    { label: "Expiring this month", value: `${expiringTotal.toLocaleString()} RON`, color: "yellow" as const },
    { label: "Expired total", value: `${expiredTotal.toLocaleString()} RON`, color: "red" as const },
    { label: "Est. recoverable this month", value: `${recoveryEstimate.toLocaleString()} RON`, color: "blue" as const },
  ];

  return {
    summary: `Estimated recoverable revenue this month: ${recoveryEstimate.toLocaleString()} RON.`,
    sections: [{ title: "Revenue Overview", type: "stats", stats }],
    actions: [{ label: "View Policies", href: "/broker/policies" }],
  };
};

// ─── Question Patterns Registry ───

const questionPatterns: QuestionPattern[] = [
  {
    keywords: ["expire", "next week", "expiring"],
    handler: policiesExpiringNextWeek,
    description: "What policies expire next week?",
  },
  {
    keywords: ["call", "today", "contact"],
    handler: clientsToCallToday,
    description: "Which clients should I call today?",
  },
  {
    keywords: ["rca", "casco", "cross", "sell", "cross-sell"],
    handler: rcaWithoutCasco,
    description: "Which clients have RCA but no CASCO?",
  },
  {
    keywords: ["unclear", "blurry", "quality", "document", "upload"],
    handler: unclearDocuments,
    description: "Which clients uploaded unclear documents?",
  },
  {
    keywords: ["renewal", "pending", "request"],
    handler: pendingRenewals,
    description: "Which renewal requests are pending?",
  },
  {
    keywords: ["revenue", "recover", "month", "estimated", "premium"],
    handler: estimatedRevenue,
    description: "How much estimated revenue can I recover this month?",
  },
];

export const QUICK_QUESTIONS = questionPatterns.map((p) => p.description);

/**
 * Match a question against known patterns and return the handler.
 * Returns null if no pattern matches.
 */
function matchQuestion(question: string): QuestionHandler | null {
  const lower = question.toLowerCase();

  for (const pattern of questionPatterns) {
    const matches = pattern.keywords.some((kw) => lower.includes(kw));
    if (matches) return pattern.handler;
  }

  return null;
}

/**
 * Process a question and return a structured response.
 * This is the main entry point for the assistant engine.
 *
 * For MVP, uses rule-based matching against known question patterns.
 * Later, this can be replaced with OpenAI function calling where the
 * LLM selects the appropriate function and parameters.
 */
export async function processQuestion(
  question: string,
  profileId: string
): Promise<AssistantResponse> {
  const handler = matchQuestion(question);

  if (!handler) {
    return {
      summary: "I'm not sure how to answer that yet.",
      sections: [
        {
          title: "Try one of these questions",
          type: "list",
          items: QUICK_QUESTIONS.map((q) => ({ label: q, value: "Click to ask" })),
        },
      ],
    };
  }

  try {
    return await handler(profileId);
  } catch (err) {
    return {
      summary: "Sorry, I ran into an error processing your question.",
      sections: [
        {
          title: "Error",
          type: "alert",
          alerts: [
            {
              message: err instanceof Error ? err.message : "Unknown error",
              severity: "danger",
            },
          ],
        },
      ],
    };
  }
}
