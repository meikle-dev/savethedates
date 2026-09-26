import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { currentNames, guestUrl } from "@/features/weddings/guest-link";
import type { Entitlement } from "@/features/payments/purchase-panel";
import { responseFoodColumns, type GuestListResponse, type SharedResponse } from "@/features/weddings/rsvp";
import { parseCateringSummary } from "./catering";
import { filteredCount, guestPagination, namePattern, type GuestQuery } from "./guest-list";
import type { GuestLinkShare } from "./guest-link-panel";
import { rsvpShareStatus, shareMessage } from "./share-message";
import { collectResponses, rsvpAvailability, todayUtc } from "./workspace-summary";

const weddingColumns = "id, first_name, second_name, wedding_date, location, message, slug, published, first_published_at, photo_path, photo_framing, theme, details_enabled, ceremony_time, ceremony_venue, ceremony_address, ceremony_url, reception_time, reception_venue, reception_address, reception_url, travel, travel_url, accommodation, accommodation_url, dress_code, faqs, rsvp_enabled, rsvp_closes_on, rsvp_share_secret, invitation_enabled, invitation_host_line, invitation_wording, invitation_afterwards, meal_choices_enabled, meal_menu";

const noEntitlement: Entitlement = { active: false, expires_at: null, revoked_reason: null };

// Every workspace layout and page calls this; React's request cache runs the queries once per render.
export const loadWorkspace = cache(async () => {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data: wedding, error } = await client.from("weddings").select(weddingColumns).eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load wedding workspace.");
  if (!wedding) return { client, user, wedding: null, entitlement: noEntitlement, live: false, offline: false };
  const { data, error: entitlementError } = await client.rpc("owner_entitlement").maybeSingle<Entitlement>();
  if (entitlementError) throw new Error("Unable to load publication entitlement.");
  const entitlement = data ?? noEntitlement;
  // offline: still marked published, but the purchase has expired or ended, so guests get a 404.
  return { client, user, wedding, entitlement, live: wedding.published && entitlement.active, offline: wedding.published && !entitlement.active };
});

// Sections other than Basics need a saved wedding; new accounts are sent to Basics to create one.
export async function requireWedding() {
  const workspace = await loadWorkspace();
  if (!workspace.wedding) redirect("/dashboard/basics");
  return { ...workspace, wedding: workspace.wedding };
}

type ShareableWedding = { slug: string | null; first_name: string; second_name: string; wedding_date: string; location: string; rsvp_enabled: boolean; rsvp_closes_on: string | null; rsvp_share_secret: string; invitation_enabled: boolean };

/** The absolute guest link on the configured origin; shown by the RSVP section in every state. */
export function currentGuestUrl(wedding: ShareableWedding) {
  return guestUrl(appOrigin(), currentNames(wedding), wedding.rsvp_share_secret);
}

/** RSVP readiness in words, from saved data and the current UTC date, for every owner view that states it. */
export function rsvpReadiness(wedding: { rsvp_enabled: boolean; rsvp_closes_on: string | null }, live: boolean, offline: boolean) {
  const availability = rsvpAvailability(wedding.rsvp_enabled, wedding.rsvp_closes_on, todayUtc(), live, offline);
  return { availability, ...rsvpShareStatus(availability, wedding.rsvp_closes_on, live) };
}

export type RsvpReadiness = ReturnType<typeof rsvpReadiness>;

/** F042: the live guest link with its suggested (never stored) message. Null unless the site is live, so drafts,
 * unpublished and expired sites are never offered a link that looks shareable. */
export function guestLinkShare(wedding: ShareableWedding, live: boolean): GuestLinkShare | null {
  if (!live) return null;
  const url = currentGuestUrl(wedding);
  const availability = rsvpAvailability(wedding.rsvp_enabled, wedding.rsvp_closes_on, todayUtc(), live);
  const message = shareMessage({ firstName: wedding.first_name, secondName: wedding.second_name, date: wedding.wedding_date, location: wedding.location, url, rsvpOpen: availability === "open", invitation: wedding.invitation_enabled });
  return { url, message, availability, closesOn: wedding.rsvp_closes_on };
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
  let rows: GuestListResponse[] = [];
  if (count > 0 && !pagination.outOfRange) {
    let request = client.from("shared_rsvp_responses").select(`id, responding_name, attending, responded_at, ${responseFoodColumns}`).eq("wedding_id", wedding.id);
    if (query.filter !== "all") request = request.eq("attending", query.filter === "attending");
    if (query.q) request = request.ilike("responding_name", namePattern(query.q));
    const { data, error } = await request.order("responded_at", { ascending: false }).order("id", { ascending: false }).range(pagination.from, pagination.to);
    if (error) throw new Error("Unable to load shared RSVP responses.");
    rows = (data ?? []) as GuestListResponse[];
  }
  return { totals, matches, count, pagination, rows };
}

/** F068: catering numbers over every attending reply, independent of the Guests filter, search and page. */
export async function loadCateringSummary() {
  const { client, wedding } = await requireWedding();
  const { data, error } = await client.rpc("rsvp_catering_summary", { requested_wedding_id: wedding.id });
  if (error) throw new Error("Unable to load catering numbers.");
  return parseCateringSummary(data);
}
