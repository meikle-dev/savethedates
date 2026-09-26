import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

// F065: two guest links per wedding, each with its own secret, and the database enforcing which pages each opens.
const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
const guest = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
let otherWeddingId = "";
let std = "";
let inv = "";
let otherStd = "";
let otherInv = "";

beforeAll(async () => {
  for (const [client, setId] of [[owner, (id: string) => { ownerId = id; }], [other, (id: string) => { otherId = id; }]] as const) {
    const email = `guest-links-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create test user");
    setId(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const wedding = await owner.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug: `links-${crypto.randomUUID()}`, rsvp_enabled: true, details_enabled: true, ceremony_venue: "The Old Hall" }).select("id, rsvp_share_secret, invitation_share_secret").single();
  expect(wedding.error).toBeNull();
  ({ id: weddingId, rsvp_share_secret: std, invitation_share_secret: inv } = wedding.data!);
  const otherWedding = await other.from("weddings").insert({ owner_id: otherId, first_name: "Other", second_name: "Couple", wedding_date: "2027-10-02", location: "York", slug: `links-${crypto.randomUUID()}`, rsvp_enabled: true, invitation_enabled: true }).select("id, rsvp_share_secret, invitation_share_secret").single();
  expect(otherWedding.error).toBeNull();
  ({ id: otherWeddingId, rsvp_share_secret: otherStd, invitation_share_secret: otherInv } = otherWedding.data!);
  for (const [id, userId] of [[weddingId, ownerId], [otherWeddingId, otherId]]) expect((await local.grantEntitlement(id, userId)).error).toBeNull();
  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error).toBeNull();
  expect((await other.from("weddings").update({ published: true }).eq("id", otherWeddingId)).error).toBeNull();
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

const setInvitation = async (on: boolean) => expect((await owner.from("weddings").update({ invitation_enabled: on }).eq("id", weddingId)).error).toBeNull();
const link = async (secret: string) => (await guest.rpc("guest_wedding", { requested_secret: secret }).maybeSingle<{ link: string }>()).data?.link ?? null;
const hasDetails = async (secret: string) => !!(await guest.rpc("guest_wedding_details", { requested_secret: secret }).maybeSingle()).data;
const hasInvitation = async (secret: string) => !!(await guest.rpc("guest_wedding_invitation", { requested_secret: secret }).maybeSingle()).data;
const reply = async (secret: string, name = `Guest ${crypto.randomUUID().slice(0, 8)}`) =>
  (await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: name, requested_attending: false })).data;

it("gives each wedding two distinct, owner-readable secrets", () => {
  for (const secret of [std, inv, otherStd, otherInv]) expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(new Set([std, inv, otherStd, otherInv]).size).toBe(4);
});

it("opens only the table's pages through each link while the Invitation is off", async () => {
  await setInvitation(false);
  expect(await link(std)).toBe("save_the_date");
  expect(await hasDetails(std)).toBe(true);
  expect(await hasInvitation(std)).toBe(false);
  expect(await reply(std)).toBe("saved");
  // The Invitation link is "not found" everywhere while the Invitation is off.
  expect(await link(inv)).toBeNull();
  expect(await hasDetails(inv)).toBe(false);
  expect(await hasInvitation(inv)).toBe(false);
  expect(await reply(inv)).toBe("unavailable");
});

it("moves RSVP to the Invitation link while the Invitation is on, and never shows the Invitation to the Save the Date link", async () => {
  await setInvitation(true);
  expect(await link(std)).toBe("save_the_date");
  expect(await hasDetails(std)).toBe(true);
  expect(await hasInvitation(std)).toBe(false);
  expect(await reply(std)).toBe("unavailable");
  // The menu follows RSVP: with meal choices on, only the Invitation link gets it.
  const main = [{ id: crypto.randomUUID(), label: "Roast beef" }, { id: crypto.randomUUID(), label: "Baked hake" }];
  expect((await owner.from("weddings").update({ meal_choices_enabled: true, meal_menu: { starter: [], main, dessert: [] } }).eq("id", weddingId)).error).toBeNull();
  expect((await guest.rpc("guest_rsvp_menu", { requested_secret: std })).data).toBeNull();
  expect((await guest.rpc("guest_rsvp_menu", { requested_secret: inv })).data).toMatchObject({ main });
  expect((await owner.from("weddings").update({ meal_choices_enabled: false }).eq("id", weddingId)).error).toBeNull();

  expect(await link(inv)).toBe("invitation");
  expect(await hasDetails(inv)).toBe(true);
  expect(await hasInvitation(inv)).toBe(true);
  expect(await reply(inv)).toBe("saved");
});

it("never serves another wedding's pages, or anything for unknown secrets", async () => {
  await setInvitation(true);
  for (const secret of ["A".repeat(43), "short", ""]) {
    expect(await link(secret)).toBeNull();
    expect(await hasInvitation(secret)).toBe(false);
    expect(await reply(secret)).toBe("unavailable");
  }
  // The other wedding's secrets reach only the other wedding.
  const others = await guest.rpc("guest_wedding", { requested_secret: otherInv }).maybeSingle<{ first_name: string }>();
  expect(others.data?.first_name).toBe("Other");
  expect(await reply(otherInv, "Crossed")).toBe("saved");
  expect((await owner.from("shared_rsvp_responses").select("id").eq("responding_name", "Crossed")).data).toEqual([]);
});

it("keeps secrets server-generated: owners can neither choose nor copy one", async () => {
  // A chosen secret on insert is replaced with a fresh one.
  const chosen = "C".repeat(43);
  const email = `guest-links-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  const third = local.anonymous();
  expect((await third.auth.signInWithPassword({ email, password })).error).toBeNull();
  try {
    const inserted = await third.from("weddings").insert({ owner_id: created.data.user!.id, first_name: "Third", second_name: "Couple", wedding_date: "2028-01-01", location: "Leeds", rsvp_share_secret: chosen, invitation_share_secret: otherStd }).select("rsvp_share_secret, invitation_share_secret").single();
    expect(inserted.error).toBeNull();
    expect(inserted.data!.rsvp_share_secret).not.toBe(chosen);
    expect(inserted.data!.invitation_share_secret).not.toBe(otherStd);
  } finally {
    await local.admin.auth.admin.deleteUser(created.data.user!.id);
  }
  // Copying another wedding's secret into either column is refused, and nothing changes.
  for (const column of ["rsvp_share_secret", "invitation_share_secret"] as const) {
    const copied = await owner.from("weddings").update({ [column]: otherStd }).eq("id", weddingId);
    expect(copied.error?.message).toContain("guest_link_secrets_read_only");
  }
  const saved = await local.admin.from("weddings").select("rsvp_share_secret, invitation_share_secret").eq("id", weddingId).single();
  expect(saved.data).toEqual({ rsvp_share_secret: std, invitation_share_secret: inv });
  expect(await link(otherStd)).toBe("save_the_date");
  // Guests can't call the generator; it only ever returns fresh random text anyway.
  expect((await guest.rpc("new_guest_link_secret")).error).not.toBeNull();
});

it("replaces only the chosen link, keeps every reply, and lets only the owner replace", async () => {
  await setInvitation(true);
  const before = (await owner.from("shared_rsvp_responses").select("id").eq("wedding_id", weddingId)).data!.length;
  expect(before).toBeGreaterThan(0);

  const rotated = await owner.rpc("rotate_invitation_share_secret", { requested_wedding_id: weddingId });
  expect(rotated.error).toBeNull();
  const newInv = rotated.data as string;
  expect(newInv).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(newInv).not.toBe(inv);
  expect(await link(inv)).toBeNull();
  expect(await reply(inv)).toBe("unavailable");
  expect(await link(newInv)).toBe("invitation");
  expect(await link(std)).toBe("save_the_date");

  const rotatedStd = await owner.rpc("rotate_shared_rsvp_secret", { requested_wedding_id: weddingId });
  const newStd = rotatedStd.data as string;
  expect(await link(std)).toBeNull();
  expect(await link(newStd)).toBe("save_the_date");
  expect(await link(newInv)).toBe("invitation");
  expect((await owner.from("shared_rsvp_responses").select("id").eq("wedding_id", weddingId)).data).toHaveLength(before);

  // Another owner gets nothing and changes nothing; guests can't call it at all.
  expect((await other.rpc("rotate_invitation_share_secret", { requested_wedding_id: weddingId })).data).toBeNull();
  expect((await guest.rpc("rotate_invitation_share_secret", { requested_wedding_id: weddingId })).error).not.toBeNull();
  expect(await link(newInv)).toBe("invitation");
  inv = newInv;
  std = newStd;
});

it("serves neither link once the site is unpublished", async () => {
  expect((await owner.from("weddings").update({ published: false }).eq("id", weddingId)).error).toBeNull();
  expect(await link(std)).toBeNull();
  expect(await link(inv)).toBeNull();
  expect(await reply(inv)).toBe("unavailable");
});
