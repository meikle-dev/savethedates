import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
const guest = local.anonymous();
const slug = `shared-rsvp-${crypto.randomUUID()}`;
let ownerId = "";
let otherId = "";
let weddingId = "";
let secret = "";

beforeAll(async () => {
  for (const [client, setId] of [[owner, (id: string) => { ownerId = id; }], [other, (id: string) => { otherId = id; }]] as const) {
    const email = `shared-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create test user");
    setId(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const wedding = await owner.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug, rsvp_enabled: true }).select("id, rsvp_share_secret").single();
  expect(wedding.error).toBeNull();
  weddingId = wedding.data!.id;
  secret = wedding.data!.rsvp_share_secret;
  expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect((await local.grantEntitlement(weddingId, ownerId)).error).toBeNull();
  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error).toBeNull();
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

it("accepts multiple named responses through one secret without revealing them", async () => {
  expect((await guest.rpc("guest_wedding", { requested_secret: secret })).data).toEqual([expect.objectContaining({ rsvp_open: true })]);
  expect((await guest.rpc("guest_wedding", { requested_secret: "x".repeat(43) })).data).toEqual([]);
  // The names part alone never finds the wedding.
  expect((await guest.rpc("guest_wedding", { requested_secret: slug })).data).toEqual([]);
  for (const [name, attending] of [["Sam Taylor", true], ["Jordan Lee", false], ["Sam Taylor", false]] as const) {
    const result = await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: name, requested_attending: attending });
    expect(result.error).toBeNull();
    expect(result.data).toBe("saved");
  }
  expect((await guest.from("shared_rsvp_responses").select("id")).error).not.toBeNull();
  expect((await other.from("shared_rsvp_responses").select("id")).data).toEqual([]);
  expect((await other.from("shared_rsvp_responses").insert({ wedding_id: weddingId, responding_name: "Forged", attending: true })).error).not.toBeNull();
  const saved = await owner.from("shared_rsvp_responses").select("responding_name, attending").eq("wedding_id", weddingId);
  expect(saved.error).toBeNull();
  expect(saved.data).toHaveLength(3);
  expect(saved.data!.filter((row) => row.responding_name === "Sam Taylor")).toHaveLength(2);
  expect((await other.rpc("rotate_shared_rsvp_secret", { requested_wedding_id: weddingId })).data).toBeNull();
  expect((await guest.rpc("rotate_shared_rsvp_secret", { requested_wedding_id: weddingId })).error).not.toBeNull();
});

it("lets only the owner correct or remove a response and isolates name limits", async () => {
  const rows = await owner.from("shared_rsvp_responses").select("id").eq("wedding_id", weddingId);
  expect(rows.data).toHaveLength(3);
  const id = rows.data![0].id;
  expect((await other.from("shared_rsvp_responses").update({ responding_name: "Intruder" }).eq("id", id).select("id")).data).toEqual([]);
  expect((await other.from("shared_rsvp_responses").delete().eq("id", id).select("id")).data).toEqual([]);
  const corrected = await owner.from("shared_rsvp_responses").update({ responding_name: "Corrected", attending: true }).eq("id", id).select("responding_name, attending").single();
  expect(corrected.error).toBeNull();
  expect(corrected.data).toMatchObject({ responding_name: "Corrected", attending: true });
  expect((await owner.from("shared_rsvp_responses").delete().eq("id", id)).error).toBeNull();
  expect((await owner.from("shared_rsvp_responses").select("id").eq("wedding_id", weddingId)).data).toHaveLength(2);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Busy Name", requested_attending: true })).data).toBe("saved");
  }
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "busy name", requested_attending: true })).data).toBe("rate_limited");
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Another Guest", requested_attending: true })).data).toBe("saved");
});

it("keeps a high emergency cap on a wedding without affecting the owner list", async () => {
  const current = await local.admin.from("shared_rsvp_attempts").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
  expect(current.error).toBeNull();
  const remaining = 1000 - (current.count ?? 0);
  expect(remaining).toBeGreaterThan(0);
  const added = await local.admin.from("shared_rsvp_attempts").insert(Array.from({ length: remaining }, (_, index) => ({ wedding_id: weddingId, name_key: `load-${index}` })));
  expect(added.error).toBeNull();
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "New Guest", requested_attending: true })).data).toBe("rate_limited");
  expect((await local.admin.from("shared_rsvp_attempts").delete().eq("wedding_id", weddingId)).error).toBeNull();
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "New Guest", requested_attending: true })).data).toBe("saved");
});

it("projects the closing date only while RSVP is on and closes at the UTC date boundary", async () => {
  const utcDate = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  const project = async () => (await guest.rpc("guest_wedding", { requested_secret: secret })).data![0] as { rsvp_open: boolean; rsvp_closes_on: string | null };
  const submit = () => guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Boundary Guest", requested_attending: true });
  // No date: nothing is invented.
  expect(await project()).toMatchObject({ rsvp_open: true, rsvp_closes_on: null });
  // Closing today (UTC) is still open; the database's current_date is the UTC date.
  expect((await owner.from("weddings").update({ rsvp_closes_on: utcDate(0) }).eq("id", weddingId)).error).toBeNull();
  expect(await project()).toMatchObject({ rsvp_open: true, rsvp_closes_on: utcDate(0) });
  expect((await submit()).data).toBe("saved");
  // Closed yesterday (UTC): the guest sees the date and closed state, and submission is refused.
  expect((await owner.from("weddings").update({ rsvp_closes_on: utcDate(-1) }).eq("id", weddingId)).error).toBeNull();
  expect(await project()).toMatchObject({ rsvp_open: false, rsvp_closes_on: utcDate(-1) });
  expect((await submit()).data).toBe("closed");
  // RSVP off: the saved date is kept for the owner but never projected to guests.
  expect((await owner.from("weddings").update({ rsvp_enabled: false, rsvp_closes_on: utcDate(30) }).eq("id", weddingId)).error).toBeNull();
  expect(await project()).toMatchObject({ rsvp_open: false, rsvp_closes_on: null });
  expect((await owner.from("weddings").select("rsvp_closes_on").eq("id", weddingId).single()).data?.rsvp_closes_on).toBe(utcDate(30));
  expect((await owner.from("weddings").update({ rsvp_enabled: true, rsvp_closes_on: null }).eq("id", weddingId)).error).toBeNull();
  expect(await project()).toMatchObject({ rsvp_open: true, rsvp_closes_on: null });
});

it("validates input, respects closure, and invalidates the old link on rotation", async () => {
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "", requested_attending: true })).data).toBe("invalid");
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Sam", requested_attending: null })).data).toBe("invalid");
  expect((await owner.from("weddings").update({ rsvp_enabled: false }).eq("id", weddingId)).error).toBeNull();
  expect((await guest.rpc("guest_wedding", { requested_secret: secret })).data).toEqual([expect.objectContaining({ rsvp_open: false })]);
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Sam", requested_attending: true })).data).toBe("closed");
  const rotated = await owner.rpc("rotate_shared_rsvp_secret", { requested_wedding_id: weddingId });
  expect(rotated.error).toBeNull();
  expect(rotated.data).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(rotated.data).not.toBe(secret);
  expect((await guest.rpc("guest_wedding", { requested_secret: secret })).data).toEqual([]);
  expect((await guest.rpc("submit_shared_rsvp", { requested_secret: secret, requested_name: "Sam", requested_attending: true })).data).toBe("unavailable");
  expect((await guest.rpc("guest_wedding", { requested_secret: rotated.data })).data).toEqual([expect.objectContaining({ rsvp_open: false })]);
});
