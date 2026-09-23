import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const owner = local.anonymous();
const other = local.anonymous();
let ownerId = "";
let otherId = "";
let weddingId = "";
let otherWeddingId = "";
const slug = `paid-${crypto.randomUUID()}`;

function dateSixMonthsBefore(value: string) {
  const source = new Date(`${value}T00:00:00.000Z`);
  const monthStart = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() - 6, 1));
  const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), Math.min(source.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}

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
  const otherWedding = await other.from("weddings").insert({ owner_id: otherId, first_name: "Taylor", second_name: "Jordan", wedding_date: "2027-09-18", location: "York" }).select("id").single();
  expect(otherWedding.error).toBeNull();
  otherWeddingId = otherWedding.data!.id;
});

afterAll(async () => {
  await local.admin.auth.admin.deleteUser(ownerId);
  await local.admin.auth.admin.deleteUser(otherId);
});

async function paymentEvent(input: { id: string; type: "paid" | "refunded" | "disputed"; intent: string; session?: string; wedding?: string; owner?: string; expiry?: string; createdAt?: string }) {
  return local.admin.rpc("process_stripe_payment_event", {
    requested_event_id: input.id,
    requested_event_created_at: input.createdAt ?? new Date().toISOString(),
    requested_event_type: input.type,
    requested_payment_intent_id: input.intent,
    requested_entitlement_expires_at: input.type === "paid" ? input.expiry ?? "2028-03-18T00:00:00.000Z" : null,
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
  expect((await local.anonymous().rpc("owner_entitlement")).error).not.toBeNull();
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
  const secondSession = `cs_${crypto.randomUUID()}`;
  expect((await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "paid", intent: secondIntent, session: secondSession, wedding: weddingId, owner: ownerId })).data).toBe("granted");
  expect((await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "paid", intent: secondIntent, session: secondSession, wedding: weddingId, owner: ownerId })).data).toBe("granted");
  expect((await local.admin.from("stripe_payments").select("payment_intent_id").eq("payment_intent_id", secondIntent)).data).toHaveLength(1);
  const entitlement = await owner.rpc("owner_entitlement");
  expect(entitlement.data?.[0]).toMatchObject({ active: true, revoked_reason: null });
  expect(entitlement.data?.[0]?.expires_at).toContain("2028-03-18");
  expect((await owner.from("weddings").update({ published: true }).eq("id", weddingId)).error).toBeNull();
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: slug })).data).toHaveLength(1);

  expect((await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "disputed", intent: secondIntent })).data).toBe("revoked");
  expect((await owner.rpc("owner_entitlement")).data?.[0]?.active).toBe(false);
  expect((await owner.from("weddings").select("published").eq("id", weddingId).single()).data?.published).toBe(false);
  expect((await local.anonymous().rpc("published_wedding", { requested_slug: slug })).data).toEqual([]);

  const invalidOwner = await paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "paid", intent: `pi_${crypto.randomUUID()}`, session: `cs_${crypto.randomUUID()}`, wedding: weddingId, owner: otherId });
  expect(invalidOwner.error).not.toBeNull();
});

it("serializes concurrent success and revocation events per payment intent", async () => {
  const intents = Array.from({ length: 12 }, () => `pi_${crypto.randomUUID()}`);
  await Promise.all(intents.flatMap((intent) => [
    paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "paid", intent, session: `cs_${crypto.randomUUID()}`, wedding: weddingId, owner: ownerId }),
    paymentEvent({ id: `evt_${crypto.randomUUID()}`, type: "refunded", intent }),
  ]));
  const payments = await local.admin.from("stripe_payments").select("payment_intent_id, revoked_at").in("payment_intent_id", intents);
  expect(payments.error).toBeNull();
  expect(payments.data).toHaveLength(intents.length);
  expect(payments.data!.every((payment) => payment.revoked_at)).toBe(true);
  expect((await owner.rpc("owner_entitlement")).data?.[0]?.active).toBe(false);
});

it("reuses one pending checkout and freezes the entitlement expiry snapshot", async () => {
  const [first, second] = await Promise.all([owner.rpc("begin_checkout_attempt"), owner.rpc("begin_checkout_attempt")]);
  expect(first.error).toBeNull();
  expect(second.error).toBeNull();
  expect(first.data![0].attempt_id).toBe(second.data![0].attempt_id);
  expect(new Date(first.data![0].entitlement_expires_at).toISOString()).toBe("2028-03-18T00:00:00.000Z");
  expect((await owner.rpc("attach_checkout_session", {
    requested_attempt_id: first.data![0].attempt_id,
    requested_session_id: "cs_test_pending",
    requested_checkout_url: "https://checkout.stripe.com/c/pay/test",
  })).data).toBe(true);
  const retry = await owner.rpc("begin_checkout_attempt");
  expect(retry.data![0]).toMatchObject({ attempt_id: first.data![0].attempt_id, checkout_url: "https://checkout.stripe.com/c/pay/test" });
  expect((await other.rpc("attach_checkout_session", {
    requested_attempt_id: first.data![0].attempt_id,
    requested_session_id: "cs_test_other",
    requested_checkout_url: "https://checkout.stripe.com/c/pay/other",
  })).data).toBe(false);

  expect((await local.admin.rpc("expire_checkout_attempt", {
    requested_attempt_id: first.data![0].attempt_id,
    requested_session_id: "cs_wrong",
  })).data).toBe(false);
  expect((await owner.rpc("expire_checkout_attempt", {
    requested_attempt_id: first.data![0].attempt_id,
    requested_session_id: "cs_test_pending",
  })).error).not.toBeNull();
  expect((await local.admin.rpc("expire_checkout_attempt", {
    requested_attempt_id: first.data![0].attempt_id,
    requested_session_id: "cs_test_pending",
  })).data).toBe(true);
  const afterVerifiedExpiry = await owner.rpc("begin_checkout_attempt");
  expect(afterVerifiedExpiry.error).toBeNull();
  expect(afterVerifiedExpiry.data![0].attempt_id).not.toBe(first.data![0].attempt_id);
});

it("uses six calendar months for new attempts and keeps an existing expiry snapshot", async () => {
  expect((await local.admin.from("weddings").update({ wedding_date: "2027-08-31" }).eq("id", otherWeddingId)).error).toBeNull();
  const created = await other.rpc("begin_checkout_attempt");
  expect(created.error).toBeNull();
  expect(new Date(created.data![0].entitlement_expires_at).toISOString()).toBe("2028-02-29T00:00:00.000Z");

  const existingExpiry = "2028-08-31T00:00:00.000Z";
  expect((await local.admin.from("stripe_checkout_attempts").update({ entitlement_expires_at: existingExpiry }).eq("wedding_id", otherWeddingId)).error).toBeNull();
  expect((await local.admin.from("weddings").update({ wedding_date: "2027-01-01" }).eq("id", otherWeddingId)).error).toBeNull();
  const retry = await other.rpc("begin_checkout_attempt");
  expect(retry.error).toBeNull();
  expect(retry.data![0].attempt_id).toBe(created.data![0].attempt_id);
  expect(new Date(retry.data![0].entitlement_expires_at).toISOString()).toBe(existingExpiry);

  expect((await local.admin.rpc("expire_checkout_attempt", {
    requested_attempt_id: created.data![0].attempt_id,
    requested_session_id: null,
  })).data).toBe(true);
  const today = new Date().toISOString().slice(0, 10);
  const nearCutoffWeddingDate = dateSixMonthsBefore(today);
  expect((await local.admin.from("weddings").update({ wedding_date: nearCutoffWeddingDate }).eq("id", otherWeddingId)).error).toBeNull();
  expect((await other.rpc("begin_checkout_attempt")).error).not.toBeNull();
});

it("reports the latest purchase outcome after an older entitlement expires", async () => {
  const oldIntent = `pi_${crypto.randomUUID()}`;
  await paymentEvent({
    id: `evt_${crypto.randomUUID()}`,
    type: "paid",
    intent: oldIntent,
    session: `cs_${crypto.randomUUID()}`,
    wedding: otherWeddingId,
    owner: otherId,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  expect((await local.admin.from("stripe_payments").update({ expires_at: "2026-01-02T00:00:00.000Z" }).eq("payment_intent_id", oldIntent)).error).toBeNull();

  const latestIntent = `pi_${crypto.randomUUID()}`;
  await paymentEvent({
    id: `evt_${crypto.randomUUID()}`,
    type: "paid",
    intent: latestIntent,
    session: `cs_${crypto.randomUUID()}`,
    wedding: otherWeddingId,
    owner: otherId,
    createdAt: "2026-02-01T00:00:00.000Z",
  });
  await paymentEvent({
    id: `evt_${crypto.randomUUID()}`,
    type: "refunded",
    intent: latestIntent,
    createdAt: "2026-02-02T00:00:00.000Z",
  });
  expect((await other.rpc("owner_entitlement")).data?.[0]).toMatchObject({ active: false, revoked_reason: "refunded" });
});

it("retains a twelve-month expiry snapshot from a checkout started before the policy change", async () => {
  const intent = `pi_${crypto.randomUUID()}`;
  const legacyExpiry = "2028-09-18T00:00:00.000Z";
  const result = await paymentEvent({
    id: `evt_${crypto.randomUUID()}`,
    type: "paid",
    intent,
    session: `cs_${crypto.randomUUID()}`,
    wedding: weddingId,
    owner: ownerId,
    expiry: legacyExpiry,
    createdAt: "2027-09-18T12:00:00.000Z",
  });
  expect(result.data).toBe("granted");
  const stored = await local.admin.from("stripe_payments").select("expires_at").eq("payment_intent_id", intent).single();
  expect(new Date(stored.data!.expires_at).toISOString()).toBe(legacyExpiry);
});
