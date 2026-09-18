import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
const slug = `paid-${crypto.randomUUID()}`;

beforeAll(async () => {
  for (const [client, assign] of [[owner, (id: string) => { ownerId = id; }], [other, (id: string) => { otherId = id; }]] as const) {
    const email = `payment-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error("Cannot create payment test owner");
    assign(created.data.user.id);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  }
  const inserted = await owner.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath", slug }).select("id").single();
  expect(inserted.error).toBeNull();
  weddingId = inserted.data!.id;
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

async function paymentEvent(input: { id: string; type: "paid" | "refunded" | "disputed"; intent: string; session?: string; wedding?: string; owner?: string }) {
  return local.admin.rpc("process_stripe_payment_event", {
    requested_event_id: input.id,
    requested_event_created_at: new Date().toISOString(),
    requested_event_type: input.type,
    requested_payment_intent_id: input.intent,
    requested_wedding_id: input.wedding ?? null,
    requested_owner_id: input.owner ?? null,
    requested_checkout_session_id: input.session ?? null,
  });
}

it("gates publication and keeps payment data private", async () => {
  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error?.code).toBe("23514");
  for (const caller of [owner, other, local.anonymous()]) {
    expect((await caller.from("stripe_payments").select("*")).data ?? []).toEqual([]);
    expect((await caller.from("stripe_payment_events").select("*")).data ?? []).toEqual([]);
    expect((await caller.rpc("process_stripe_payment_event", {
      requested_event_id: "evt_denied", requested_event_created_at: new Date().toISOString(), requested_event_type: "paid",
      requested_payment_intent_id: "pi_denied", requested_wedding_id: weddingId, requested_owner_id: ownerId, requested_checkout_session_id: "cs_denied",
    })).error).not.toBeNull();
  }
  expect((await other.rpc("owner_entitlement")).data?.[0]?.active).toBe(false);
});

it("handles out-of-order, duplicate, refund and repurchase events", async () => {
  const firstIntent = `pi_${crypto.randomUUID()}`;
  expect((await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "refunded", intent: firstIntent })).data).toBe("recorded");
  const paidId = `evt_${crypto.randomUUID()}`;
  const firstPaid = { id: paidId, type: "paid" as const, intent: firstIntent, session: `cs_${crypto.randomUUID()}`, wedding: weddingId, owner: ownerId };
  expect((await paymentEvent(firstPaid)).data).toBe("revoked");
  expect((await paymentEvent(firstPaid)).data).toBe("duplicate");
  expect((await owner.rpc("owner_entitlement")).data?.[0]?.active).toBe(false);

  const secondIntent = `pi_${crypto.randomUUID()}`;
  expect((await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "paid", intent: secondIntent, session: `cs_${crypto.randomUUID()}`, wedding: weddingId, owner: ownerId })).data).toBe("granted");
  const entitlement = await owner.rpc("owner_entitlement");
  expect(entitlement.data?.[0]).toMatchObject({ active: true, revoked_reason: "refunded" });
  expect(entitlement.data?.[0]?.expires_at).toContain("2028-09-18");
  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error).toBeNull();
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: slug })).data).toHaveLength(1);

  expect((await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "disputed", intent: secondIntent })).data).toBe("revoked");
  expect((await owner.rpc("owner_entitlement")).data?.[0]?.active).toBe(false);
  expect((await owner.from("weddings").select("published").eq("id", weddingId).single()).data?.published).toBe(false);
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: slug })).data).toEqual([]);

  const invalidOwner = await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "paid", intent: `pi_${crypto.randomUUID()}`, session: `cs_${crypto.randomUUID()}`, wedding: weddingId, owner: otherId });
  expect(invalidOwner.error).not.toBeNull();
});
