import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Entitlement } from "@/features/payments/purchase-panel";
import type { OwnerInvitation, SharedResponse } from "@/features/weddings/rsvp";

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

export const loadResponses = cache(async () => {
  const { client, wedding } = await requireWedding();
  const [invitations, shared] = await Promise.all([
    client.from("rsvp_invitations").select("id, invite_name, responding_name, attending, responded_at, revoked_at").eq("wedding_id", wedding.id).order("created_at", { ascending: false }),
    client.from("shared_rsvp_responses").select("id, responding_name, attending, responded_at").eq("wedding_id", wedding.id).order("responded_at", { ascending: false }),
  ]);
  if (invitations.error) throw new Error("Unable to load RSVP responses.");
  if (shared.error) throw new Error("Unable to load shared RSVP responses.");
  return { invitations: (invitations.data ?? []) as OwnerInvitation[], sharedResponses: (shared.data ?? []) as SharedResponse[] };
});
