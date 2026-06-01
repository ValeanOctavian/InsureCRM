import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Require authenticated user (broker, admin, or client)
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const query = `%${q}%`;
  const profileId = auth.profileId;

  try {
    const [clients, policies, vehicles, documents] = await Promise.all([
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("broker_id", profileId)
        .or(`first_name.ilike.${query},last_name.ilike.${query},email.ilike.${query},phone.ilike.${query}`)
        .limit(5),

      supabase
        .from("policies")
        .select("id, policy_number, type, clients!inner(first_name, last_name)")
        .eq("broker_id", profileId)
        .or(`policy_number.ilike.${query},insurer_name.ilike.${query}`)
        .limit(5),

      supabase
        .from("vehicles")
        .select("id, registration_number, brand, model, clients!inner(first_name, last_name)")
        .eq("broker_id", profileId)
        .or(`registration_number.ilike.${query},brand.ilike.${query},model.ilike.${query},vin.ilike.${query}`)
        .limit(5),

      supabase
        .from("documents")
        .select("id, type, file_url, clients!inner(first_name, last_name)")
        .eq("broker_id", profileId)
        .ilike("type", query)
        .limit(5),
    ]);

    const results = [
      ...(clients.data ?? []).map((c) => ({
        label: `${c.first_name} ${c.last_name}`,
        href: `/broker/clients/${c.id}`,
        icon: "Users",
        subtitle: "Client",
      })),
      ...(policies.data ?? []).map((p) => ({
        label: `${p.policy_number} — ${p.type}`,
        href: `/broker/policies`,
        icon: "Shield",
        subtitle: `Policy · ${(p.clients as any)?.first_name ?? ""} ${(p.clients as any)?.last_name ?? ""}`,
      })),
      ...(vehicles.data ?? []).map((v) => ({
        label: `${v.registration_number}`,
        href: `/broker/vehicles/${v.id}`,
        icon: "Car",
        subtitle: `${v.brand} ${v.model} · ${(v.clients as any)?.first_name ?? ""} ${(v.clients as any)?.last_name ?? ""}`,
      })),
      ...(documents.data ?? []).map((d) => ({
        label: d.type.replace(/_/g, " "),
        href: `/broker/documents`,
        icon: "FileText",
        subtitle: `${(d.clients as any)?.first_name ?? ""} ${(d.clients as any)?.last_name ?? ""}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
