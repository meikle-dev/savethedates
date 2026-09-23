import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Entitlement } from "@/features/payments/purchase-panel";
import type { SharedResponse } from "@/features/weddings/rsvp";
import { filteredCount, guestPagination, namePattern, type GuestQuery } from "./guest-list";
import { collectResponses } from "./workspace-summary";

const weddingColumns = "id, first_name, second_name, wedding_date, location, message, slug, published, first_published_at, photo_path, photo_framing, theme, details_enabled, ceremony_time, ceremony_venue, ceremony_address, ceremony_url, reception_time, reception_venue, reception_address, reception_url, travel, travel_url, accommodation, accommodation_url, dress_code, faqs, rsvp_enabled, rsvp_closes_on, rsvp_share_secret";

const noEntitlement: Entitlement = { active: false, expires_at: null, revoked_reason: null };

// Every workspace layout and page calls this; React's request cache runs the queries once per render.
export const loadWorkspace = cache(async () => {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data: wedding, error } = await client.from("weddings").select(weddingColumns).eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load wedding workspace.");
  if (!wedding) return { client, wedding: null, entitlement: noEntitlement, live: false };
  const { data, error: entitlementError } = await client.rpc("owner_entitlement").maybeSingle<Entitlement>();
  if (entitlementError) throw new Error("Unable to load publication entitlement.");
  const entitlement = data ?? noEntitlement;
  return { client, wedding, entitlement, live: wedding.published && entitlement.active };
});

// Sections other than Basics need a saved wedding; new accounts are sent to Basics to create one.
export async function requireWedding() {
  const workspace = await loadWorkspace();
  if (!workspace.wedding) redirect("/dashboard/basics");
  return { ...workspace, wedding: workspace.wedding };
}

type ResponseCounts = { total: number; attending: number };

async function countSharedResponses(q = ""): Promise<ResponseCounts> {
  const { client, wedding } = await requireWedding();
  const count = (attendingOnly: boolean) => {
    let request = client.from("shared_rsvp_responses").select("id", { count: "exact", head: true }).eq("wedding_id", wedding.id);
    if (q) request = request.ilike("responding_name", namePattern(q));
    return attendingOnly ? request.eq("attending", true) : request;
  };
  const [all, attending] = await Promise.all([count(false), count(true)]);
  if (all.error || attending.error) throw new Error("Unable to count shared RSVP responses.");
  return { total: all.count ?? 0, attending: attending.count ?? 0 };
}

const loadSharedCounts = cache(() => countSharedResponses());

// Totals use aggregate counts without loading every response.
export const loadResponseTotals = cache(async () => {
  const counts = await loadSharedCounts();
  return { ...counts, declined: counts.total - counts.attending };
});

export async function loadLatestResponses(limit = 5) {
  const { client, wedding } = await requireWedding();
  const shared = await client.from("shared_rsvp_responses").select("id, responding_name, attending, responded_at").eq("wedding_id", wedding.id).order("responded_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
  if (shared.error) throw new Error("Unable to load shared RSVP responses.");
  return collectResponses((shared.data ?? []) as SharedResponse[]);
}

// One page of shared responses for the owner's wedding, newest first with a stable tie-break.
export async function loadGuestPage(query: GuestQuery) {
  const { client, wedding } = await requireWedding();
  const [totals, matches] = await Promise.all([loadResponseTotals(), query.q ? countSharedResponses(query.q) : loadSharedCounts()]);
  const count = filteredCount(query.filter, matches);
  const pagination = guestPagination(count, query.page);
  let rows: SharedResponse[] = [];
  if (count > 0 && !pagination.outOfRange) {
    let request = client.from("shared_rsvp_responses").select("id, responding_name, attending, responded_at").eq("wedding_id", wedding.id);
    if (query.filter !== "all") request = request.eq("attending", query.filter === "attending");
    if (query.q) request = request.ilike("responding_name", namePattern(query.q));
    const { data, error } = await request.order("responded_at", { ascending: false }).order("id", { ascending: false }).range(pagination.from, pagination.to);
    if (error) throw new Error("Unable to load shared RSVP responses.");
    rows = (data ?? []) as SharedResponse[];
  }
  return { totals, matches, count, pagination, rows };
}
