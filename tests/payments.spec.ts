import { expect, test } from "@playwright/test";
import Stripe from "stripe";
import { localSupabase } from "./helpers/local-supabase";

const local = localSupabase();
const webhookSecret = "whsec_local_webhook_test_secret";

function signedEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({
    id: `evt_test_${crypto.randomUUID()}`,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  });
  return {
    payload,
    signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret }),
  };
}

test("verified payment enables publication and a refund revokes it", async ({ page, browser, baseURL }) => {
  const email = `payment-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create payment browser-test owner");
  const ownerId = created.data.user.id;
  const slug = `paid-${crypto.randomUUID()}`;
  const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" }).select("id").single();
  if (wedding.error || !wedding.data) throw new Error("Cannot create payment browser-test wedding");
  const guest = await browser.newContext({ baseURL });
  try {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("£29", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy and continue to Stripe" })).toBeVisible();
    await expect(page.getByLabel("Your wedding URL")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("payment-required.png"), fullPage: true });
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data.id)).error?.code).toBe("23514");

    const paymentIntent = `pi_test_${crypto.randomUUID()}`;
    const paid = signedEvent("checkout.session.completed", {
      id: `cs_test_${crypto.randomUUID()}`,
      object: "checkout.session",
      amount_total: 2900,
      currency: "gbp",
      payment_intent: paymentIntent,
      payment_status: "paid",
      metadata: { wedding_id: wedding.data.id, owner_id: ownerId },
    });
    expect((await page.request.post("/api/stripe/webhook", { data: paid.payload, headers: { "content-type": "application/json", "stripe-signature": "invalid" } })).status()).toBe(400);
    const paidResponse = await page.request.post("/api/stripe/webhook", { data: paid.payload, headers: { "content-type": "application/json", "stripe-signature": paid.signature } });
    expect(paidResponse.status()).toBe(200);
    await page.reload();
    await expect(page.getByText("Payment confirmed", { exact: false })).toBeVisible();
    await page.getByLabel("Your wedding URL").fill(slug);
    await page.getByRole("checkbox", { name: /I understand that anyone with the URL/ }).check();
    await page.getByRole("button", { name: "Publish site", exact: true }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    expect((await guest.request.get(`/${slug}`)).status()).toBe(200);

    const refund = signedEvent("refund.created", { id: `re_test_${crypto.randomUUID()}`, object: "refund", payment_intent: paymentIntent });
    const refundResponse = await page.request.post("/api/stripe/webhook", { data: refund.payload, headers: { "content-type": "application/json", "stripe-signature": refund.signature } });
    expect(refundResponse.status()).toBe(200);
    await page.reload();
    await expect(page.getByText("Private draft", { exact: true })).toBeVisible();
    await expect(page.getByText("This purchase was refunded", { exact: false })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("payment-refunded.png"), fullPage: true });
    expect((await guest.request.get(`/${slug}`)).status()).toBe(404);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
