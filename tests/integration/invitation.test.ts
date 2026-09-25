import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
let otherWeddingId = "";
let secret = "";
let otherSecret = "";

beforeAll(async () => {
  for (const [client, assign] of [[owner, (id: string) => { ownerId = id; }], [other, (id: string) => { otherId = id; }]] as const) {
    const email = `invitation-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create invitation test owner");
    assign(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const inserted = await owner.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug: `invitation-${crypto.randomUUID()}` }).select("id, rsvp_share_secret").single();
  expect(inserted.error).toBeNull();
  weddingId = inserted.data!.id;
  secret = inserted.data!.rsvp_share_secret;
  const otherInserted = await other.from("weddings").insert({ owner_id: otherId, first_name: "Other", second_name: "Couple", wedding_date: "2027-10-02", location: "York", slug: `invitation-${crypto.randomUUID()}` }).select("id, rsvp_share_secret").single();
  expect(otherInserted.error).toBeNull();
  otherWeddingId = otherInserted.data!.id;
  otherSecret = otherInserted.data!.rsvp_share_secret;
  for (const [id, userId] of [[weddingId, ownerId], [otherWeddingId, otherId]]) expect((await local.grantEntitlement(id, userId)).error).toBeNull();
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

const invitation = (requested: string, client = local.anonymous()) => client.rpc("guest_wedding_invitation", { requested_secret: requested }).maybeSingle();

it("stores trimmed, bounded invitation wording that only its owner can change", async () => {
  expect((await owner.from("weddings").update({ invitation_host_line: " Padded " }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ invitation_host_line: "x".repeat(161) }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ invitation_wording: "x".repeat(301) }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ invitation_afterwards: "x".repeat(161) }).eq("id", weddingId)).error).not.toBeNull();
  expect((await owner.from("weddings").update({ invitation_wording: "x".repeat(300) }).eq("id", weddingId)).error).toBeNull();

  expect((await owner.from("weddings").update({
    invitation_host_line: "Together with their families",
    invitation_wording: "invite you to celebrate their marriage",
    invitation_afterwards: "followed by dinner and dancing",
    ceremony_time: "2:30 pm",
    ceremony_venue: "The Old Hall",
    ceremony_address: "1 High Street, Bath",
  }).eq("id", weddingId)).error).toBeNull();
  for (const caller of [other, local.anonymous()]) {
    const denied = await caller.from("weddings").update({ invitation_enabled: true, invitation_wording: "Changed" }).eq("id", weddingId).select("id");
    expect(denied.data ?? []).toEqual([]);
  }
  const saved = await local.admin.from("weddings").select("invitation_enabled, invitation_wording").eq("id", weddingId).single();
  expect(saved.data).toEqual({ invitation_enabled: false, invitation_wording: "invite you to celebrate their marriage" });
});

it("shows guests the invitation only while it is on, published and paid for", async () => {
  // Off by default, and hidden while the wedding is a draft.
  expect((await invitation(secret)).data).toBeNull();
  expect((await owner.from("weddings").update({ invitation_enabled: true }).eq("id", weddingId)).error).toBeNull();
  expect((await invitation(secret)).data).toBeNull();

  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error).toBeNull();
  const shown = await invitation(secret);
  expect(shown.error).toBeNull();
  // Only the invitation's own fields: no secret, owner, other Details or response data.
  expect(shown.data).toEqual({
    invitation_host_line: "Together with their families",
    invitation_wording: "invite you to celebrate their marriage",
    invitation_afterwards: "followed by dinner and dancing",
    ceremony_time: "2:30 pm",
    ceremony_venue: "The Old Hall",
    ceremony_address: "1 High Street, Bath",
  });
  const wedding = await local.anonymous().rpc("guest_wedding", { requested_secret: secret }).maybeSingle<{ invitation_enabled: boolean; slug: string }>();
  expect(wedding.data).toMatchObject({ invitation_enabled: true });
  expect(Object.keys(wedding.data!)).not.toContain("rsvp_share_secret");

  // Another wedding's secret never returns this invitation; the other wedding's own page is off.
  expect((await invitation(otherSecret, other)).data).toBeNull();
  expect((await invitation("A".repeat(43))).data).toBeNull();
  expect((await invitation("short")).data).toBeNull();

  expect((await owner.from("weddings").update({ invitation_enabled: false }).eq("id", weddingId)).error).toBeNull();
  expect((await invitation(secret)).data).toBeNull();
  expect((await local.anonymous().rpc("guest_wedding", { requested_secret: secret }).maybeSingle<{ invitation_enabled: boolean }>()).data?.invitation_enabled).toBe(false);

  expect((await owner.from("weddings").update({ invitation_enabled: true }).eq("id", weddingId)).error).toBeNull();
  expect((await local.admin.from("stripe_payments").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("wedding_id", weddingId)).error).toBeNull();
  expect((await invitation(secret)).data).toBeNull();
});

it("keeps an enabled Details page from being emptied through the shared ceremony fields", async () => {
  expect((await other.from("weddings").update({ ceremony_venue: "St Mary’s", details_enabled: true }).eq("id", otherWeddingId)).error).toBeNull();
  const emptied = await other.from("weddings").update({ ceremony_venue: "" }).eq("id", otherWeddingId);
  expect(emptied.error?.message).toContain("enabled_details_have_content");
  expect((await other.from("weddings").update({ ceremony_venue: "", details_enabled: false }).eq("id", otherWeddingId)).error).toBeNull();
});
