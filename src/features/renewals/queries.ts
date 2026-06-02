import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/middleware";
import type {
  RenewalRequest,
  RenewalRequestStatus,
  RenewalOffer,
  RenewalOfferStatus,
  RenewalRequestDocument,
  Client,
  Policy,
  Document,
} from "@/types";

/**
 * Minimal renewal row used by the broker list view.
 */
export interface BrokerRenewalRow {
  id: string;
  status: RenewalRequestStatus;
  payment_status: string;
  created_at: string;
  updated_at: string;
  is_new_policy: boolean;
  policy_type: string | null;
  insurer_name: string | null;
  notes: string | null;
  selected_offer_id: string | null;
  client: Pick<Client, "id" | "first_name" | "last_name" | "email" | "phone"> | null;
  policy: Pick<Policy, "id" | "insurer_name" | "policy_number" | "type" | "end_date"> | null;
  offers: Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type">[];
  document_count: number;
}

export interface BrokerRenewalDetail {
  renewal: RenewalRequest & {
    policy_type: string | null;
    insurer_name: string | null;
    is_new_policy: boolean;
  };
  client: Pick<Client, "id" | "first_name" | "last_name" | "email" | "phone" | "cnp"> | null;
  policy: Policy | null;
  offers: RenewalOffer[];
  documents: (RenewalRequestDocument & { document: Pick<Document, "id" | "type" | "file_url" | "extracted_data" | "quality_status" | "ocr_status" | "created_at"> | null })[];
  confirmed_fields: Record<string, unknown> | null;
}

/**
 * List all renewal requests for the current broker with joined
 * client, policy, and offer summaries.
 */
export async function getBrokerRenewals(filter?: {
  status?: RenewalRequestStatus;
  search?: string;
}): Promise<BrokerRenewalRow[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const supabase = await createClient();

  let query = supabase
    .from("renewal_requests")
    .select(
      `
      id, status, payment_status, created_at, updated_at, is_new_policy,
      policy_type, insurer_name, notes, selected_offer_id,
      client:clients!renewal_requests_client_id_fkey ( id, first_name, last_name, email, phone ),
      policy:policies!renewal_requests_policy_id_fkey ( id, insurer_name, policy_number, type, end_date )
    `
    )
    .eq("broker_id", profile.id)
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Pull offers separately and bucket by renewal id
  const ids = data.map((r) => r.id);
  const offersByRenewal = new Map<string, Pick<RenewalOffer, "id" | "status" | "price" | "currency" | "insurer_name" | "coverage_type">[]>();

  if (ids.length > 0) {
    const { data: offers } = await supabase
      .from("renewal_offers")
      .select("id, renewal_request_id, status, price, currency, insurer_name, coverage_type")
      .in("renewal_request_id", ids);

    for (const o of offers ?? []) {
      const arr = offersByRenewal.get(o.renewal_request_id) ?? [];
      arr.push({
        id: o.id,
        status: o.status,
        price: o.price,
        currency: o.currency,
        insurer_name: o.insurer_name,
        coverage_type: o.coverage_type,
      });
      offersByRenewal.set(o.renewal_request_id, arr);
    }
  }

  // Count linked documents per renewal
  const docCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: links } = await supabase
      .from("renewal_request_documents")
      .select("id, renewal_request_id")
      .in("renewal_request_id", ids);
    for (const l of links ?? []) {
      docCounts.set(l.renewal_request_id, (docCounts.get(l.renewal_request_id) ?? 0) + 1);
    }
  }

  const rows: BrokerRenewalRow[] = data.map((r) => ({
    id: r.id,
    status: r.status as RenewalRequestStatus,
    payment_status: (r.payment_status as string) ?? "not_required",
    created_at: r.created_at,
    updated_at: r.updated_at,
    is_new_policy: Boolean(r.is_new_policy),
    policy_type: r.policy_type,
    insurer_name: r.insurer_name,
    notes: r.notes,
    selected_offer_id: r.selected_offer_id,
    client: (Array.isArray(r.client) ? r.client[0] : r.client) as BrokerRenewalRow["client"],
    policy: (Array.isArray(r.policy) ? r.policy[0] : r.policy) as BrokerRenewalRow["policy"],
    offers: offersByRenewal.get(r.id) ?? [],
    document_count: docCounts.get(r.id) ?? 0,
  }));

  // Apply client-side search
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    return rows.filter((r) => {
      const name = r.client ? `${r.client.first_name} ${r.client.last_name}` : "";
      return (
        name.toLowerCase().includes(q) ||
        (r.policy?.insurer_name ?? "").toLowerCase().includes(q) ||
        (r.policy?.policy_number ?? "").toLowerCase().includes(q) ||
        (r.policy_type ?? "").toLowerCase().includes(q) ||
        (r.insurer_name ?? "").toLowerCase().includes(q)
      );
    });
  }

  return rows;
}

/**
 * Get a single renewal request with full detail (offers, documents, client, policy).
 */
export async function getBrokerRenewalDetail(id: string): Promise<BrokerRenewalDetail | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const { data: renewal, error } = await supabase
    .from("renewal_requests")
    .select("*")
    .eq("id", id)
    .eq("broker_id", profile.id)
    .maybeSingle();

  if (error || !renewal) return null;

  const [clientRes, policyRes, offersRes, docsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone, cnp")
      .eq("id", renewal.client_id)
      .maybeSingle(),
    renewal.policy_id
      ? supabase
          .from("policies")
          .select("*")
          .eq("id", renewal.policy_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("renewal_offers")
      .select("*")
      .eq("renewal_request_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("renewal_request_documents")
      .select("id, renewal_request_id, document_id, required_type, created_at, document:documents(id, type, file_url, extracted_data, quality_status, ocr_status, created_at)")
      .eq("renewal_request_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    renewal: renewal as BrokerRenewalDetail["renewal"],
    client: clientRes.data,
    policy: policyRes.data,
    offers: (offersRes.data ?? []) as RenewalOffer[],
    documents: ((docsRes.data ?? []) as unknown as (RenewalRequestDocument & {
      document: Pick<Document, "id" | "type" | "file_url" | "extracted_data" | "quality_status" | "ocr_status" | "created_at"> | null;
    })[]).map((d) => ({
      ...d,
      document: Array.isArray(d.document) ? d.document[0] ?? null : d.document,
    })),
    confirmed_fields: renewal.confirmed_fields,
  };
}

export const RENEWAL_STATUS_FILTERS: { label: string; value: RenewalRequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Waiting for offer", value: "waiting_for_offer" },
  { label: "Offer available", value: "offer_available" },
  { label: "Waiting for payment", value: "waiting_for_payment" },
  { label: "Waiting for documents", value: "waiting_for_documents" },
  { label: "Renewed", value: "renewed" },
  { label: "Cancelled", value: "cancelled" },
];

export const RENEWAL_OFFER_STATUS_LABELS: Record<RenewalOfferStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};
