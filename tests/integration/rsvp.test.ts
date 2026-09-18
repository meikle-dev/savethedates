import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
const slug = `rsvp-${crypto.randomUUID()}`;
const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");

beforeAll(async () => {
  for (const [client, assign] of [[owner, (id: string) => { ownerId = id; }], [other, (id: string) => { otherId = id; }]] as const) {
    const email = `rsvp-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create RSVP test owner");
    assign(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const inserted = await owner.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, rsvp_enabled: true }).select("id").single();
  expect(inserted.error).toBeNull();
  weddingId = inserted.data!.id;
  expect((await local.grantEntitlement(weddingId, ownerId)).error).toBeNull();
  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error).toBeNull();
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

it("keeps invitations private and scopes owner creation and revocation", async () => {
  const invitation = await owner.from("rsvp_invitations").insert({ wedding_id: weddingId, invite_name: "Sam Taylor", token_hash: tokenHash }).select("id").single();
  expect(invitation.error).toBeNull();
  expect((await local.anonymous().from("rsvp_invitations").select("id")).error).not.toBeNull();
  expect((await other.from("rsvp_invitations").select("id")).data).toEqual([]);
  expect((await other.from("rsvp_invitations").insert({ wedding_id: weddingId, invite_name: "Intruder", token_hash: createHash("sha256").update("x").digest("hex") })).error).not.toBeNull();
  expect((await owner.from("rsvp_invitations").update({ responding_name: "Fabricated", attending: true, responded_at: new Date().toISOString() }).eq("id", invitation.data!.id)).error).not.toBeNull();
  expect((await other.rpc("revoke_rsvp_invitation", { requested_id: invitation.data!.id })).data).toBe(false);
});

it("lets one bearer token submit and correct only its own response", async () => {
  const guest = local.anonymous();
  const initial = await guest.rpc("guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash });
  expect(initial.error).toBeNull();
  expect(initial.data![0]).toMatchObject({ invite_name: "Sam Taylor", responding_name: null, attending: null, is_open: true });
  expect(initial.data![0]).not.toHaveProperty("token_hash");
  expect((await guest.rpc("guest_rsvp", { requested_slug: slug, requested_token_hash: "0".repeat(64) })).data).toEqual([]);

  expect((await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash, requested_name: "Sam Taylor", requested_attending: true })).data).toBe("saved");
  expect((await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash, requested_name: "Sam T.", requested_attending: false })).data).toBe("saved");
  const saved = await owner.from("rsvp_invitations").select("responding_name, attending, responded_at").eq("token_hash", tokenHash).single();
  expect(saved.data).toMatchObject({ responding_name: "Sam T.", attending: false });
  expect(saved.data!.responded_at).toBeTruthy();

  expect((await owner.from("weddings").update({ rsvp_enabled: false }).eq("id", weddingId)).error).toBeNull();
  expect((await guest.rpc("guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash })).data![0].is_open).toBe(false);
  expect((await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash, requested_name: "Sam", requested_attending: true })).data).toBe("closed");
  expect((await owner.from("weddings").update({ rsvp_enabled: true }).eq("id", weddingId)).error).toBeNull();
});

it("throttles each invitation and makes revoked links generically unavailable", async () => {
  const throttleToken = randomBytes(32).toString("base64url");
  const throttleHash = createHash("sha256").update(throttleToken).digest("hex");
  const created = await owner.from("rsvp_invitations").insert({ wedding_id: weddingId, invite_name: "Rate Test", token_hash: throttleHash });
  expect(created.error).toBeNull();
  const guest = local.anonymous();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    expect((await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: throttleHash, requested_name: "", requested_attending: true })).data).toBe("invalid");
  }
  expect((await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: throttleHash, requested_name: "Rate Test", requested_attending: true })).data).toBe("rate_limited");

  const nullToken = randomBytes(32).toString("base64url");
  const nullHash = createHash("sha256").update(nullToken).digest("hex");
  const nullInvite = await owner.from("rsvp_invitations").insert({ wedding_id: weddingId, invite_name: "Null Test", token_hash: nullHash }).select("id").single();
  expect(nullInvite.error).toBeNull();
  const nullResult = await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: nullHash, requested_name: "Null Test", requested_attending: null });
  expect(nullResult.error).toBeNull();
  expect(nullResult.data).toBe("invalid");
  expect((await local.admin.from("rsvp_attempts").select("id", { count: "exact", head: true }).eq("invitation_id", nullInvite.data!.id)).count).toBe(1);

  const invitation = await owner.from("rsvp_invitations").select("id, responding_name").eq("token_hash", tokenHash).single();
  expect((await owner.rpc("revoke_rsvp_invitation", { requested_id: invitation.data!.id })).data).toBe(true);
  expect((await guest.rpc("guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash })).data).toEqual([]);
  expect((await guest.rpc("submit_guest_rsvp", { requested_slug: slug, requested_token_hash: tokenHash, requested_name: "Sam", requested_attending: true })).data).toBe("unavailable");
  expect((await owner.from("rsvp_invitations").select("responding_name").eq("id", invitation.data!.id).single()).data!.responding_name).toBe("Sam T.");
});
