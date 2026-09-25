import { expect, test } from "@playwright/test";
import Stripe from "stripe";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

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
  const wedding = await local.admin.from("weddings").insert({ owner_id: ownerId, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" }).select("id, rsvp_share_secret").single();
  if (wedding.error || !wedding.data) throw new Error("Cannot create payment browser-test wedding");
  const home = `/${slug}/${wedding.data.rsvp_share_secret}`;
  const guest = await browser.newContext({ baseURL });
  try {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await openWorkspaceSection(page, "Publish");
    await expect(page.getByText("£29", { exact: false })).toBeVisible();
    await expect(page.getByText(/A new purchase keeps your site online until six months after the wedding date/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy and continue to Stripe" })).toBeVisible();
    // The names part of the guest link can be chosen before payment; publishing cannot.
    await expect(page.getByRole("button", { name: "Publish site" })).toHaveCount(0);
    await expect(page.getByText("Works once published")).toBeVisible();
    await page.getByLabel("Names in your guest link").fill(slug);
    await page.getByRole("button", { name: "Save link names" }).click();
    await expect(page.getByRole("status").filter({ hasText: "guest link names are saved" })).toBeVisible();
    await expect(page.getByText(new URL(home, baseURL).href, { exact: true })).toBeVisible();
    await expect(page.locator("#guest-link")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("payment-required.png"), fullPage: true });
    await page.goto("/dashboard/publish?checkout=cancelled");
    await expect(page.getByText("Checkout was cancelled", { exact: false })).toBeVisible();
    expect((await local.admin.from("weddings").select("id").eq("id", wedding.data.id).single()).data?.id).toBe(wedding.data.id);
    expect((await local.admin.from("weddings").update({ published: true }).eq("id", wedding.data.id)).error?.code).toBe("23514");

    const checkoutOwner = local.anonymous();
    expect((await checkoutOwner.auth.signInWithPassword({ email, password })).error).toBeNull();
    const pendingAttempt = await checkoutOwner.rpc("begin_checkout_attempt");
    expect(pendingAttempt.error).toBeNull();
    const attempt = pendingAttempt.data![0];
    expect(new Date(attempt.entitlement_expires_at).toISOString()).toBe("2028-03-18T00:00:00.000Z");
    const expiringSessionId = `cs_test_${crypto.randomUUID()}`;
    expect((await checkoutOwner.rpc("attach_checkout_session", {
      requested_attempt_id: attempt.attempt_id,
      requested_session_id: expiringSessionId,
      requested_checkout_url: "https://checkout.stripe.com/c/pay/expired",
    })).data).toBe(true);
    const expired = signedEvent("checkout.session.expired", {
      id: expiringSessionId,
      object: "checkout.session",
      metadata: { attempt_id: attempt.attempt_id },
    });
    expect((await page.request.post("/api/stripe/webhook", { data: expired.payload, headers: { "content-type": "application/json", "stripe-signature": expired.signature } })).status()).toBe(200);
    const replacementAttempt = await checkoutOwner.rpc("begin_checkout_attempt");
    expect(replacementAttempt.data![0].attempt_id).not.toBe(attempt.attempt_id);

    const paymentIntent = `pi_test_${crypto.randomUUID()}`;
    const paid = signedEvent("checkout.session.completed", {
      id: `cs_test_${crypto.randomUUID()}`,
      object: "checkout.session",
      amount_total: 2900,
      currency: "gbp",
      payment_intent: paymentIntent,
      payment_status: "paid",
      metadata: { wedding_id: wedding.data.id, owner_id: ownerId, entitlement_expires_at: "2028-03-18T00:00:00.000Z" },
    });
    expect((await page.request.post("/api/stripe/webhook", { data: paid.payload, headers: { "content-type": "application/json", "stripe-signature": "invalid" } })).status()).toBe(400);
    const wrongTotal = signedEvent("checkout.session.completed", { ...JSON.parse(paid.payload).data.object, amount_total: 3000 });
    expect((await page.request.post("/api/stripe/webhook", { data: wrongTotal.payload, headers: { "content-type": "application/json", "stripe-signature": wrongTotal.signature } })).status()).toBe(400);
    const paidResponse = await page.request.post("/api/stripe/webhook", { data: paid.payload, headers: { "content-type": "application/json", "stripe-signature": paid.signature } });
    expect(paidResponse.status()).toBe(200);
    await page.reload();
    await expect(page.getByText("Payment confirmed", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Names in your guest link")).toHaveValue(slug);
    await page.getByRole("checkbox", { name: /I understand that anyone with our guest link/ }).check();
    await page.getByRole("button", { name: "Publish site", exact: true }).click();
    await expect(page.getByText("Your site is live for anyone with your guest link.")).toBeVisible();
    await expect(page.locator("#guest-link").getByText(new URL(home, baseURL).href, { exact: true })).toBeVisible();
    expect((await guest.request.get(home)).status()).toBe(200);

    expect((await local.admin.from("stripe_payments").update({ expires_at: "2026-01-01T00:00:00Z" }).eq("payment_intent_id", paymentIntent)).error).toBeNull();
    await page.reload();
    // Expiry keeps the wedding marked published but offline; only a refund or dispute unpublishes it.
    await expect(page.getByText("Your published site is offline because its purchase is no longer active.")).toBeVisible();
    await expect(page.getByText("The previous site period ended", { exact: false })).toBeVisible();
    // Expired: no share panel or share actions, only the future link marked as not working.
    await expect(page.locator("#guest-link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Share on WhatsApp/ })).toHaveCount(0);
    await openWorkspaceSection(page, "Basics");
    await page.locator('[name="location"]').fill("Bristol");
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "private draft has been saved" })).toBeVisible();
    await openWorkspaceSection(page, "Publish");
    await page.getByRole("link", { name: "Preview saved site" }).click();
    // The saved theme needs no applying; preview another one to reach Apply theme.
    await page.getByRole("radio", { checked: false }).first().check();
    await expect(page).toHaveURL(/\/dashboard\/preview\?theme=/);
    await expect(page.getByText("Applying this theme saves it to your private draft", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Apply theme" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Theme saved to your private draft" })).toBeVisible();
    await page.getByRole("link", { name: "Back to workspace" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect((await guest.request.get(home)).status()).toBe(404);

    const refund = signedEvent("refund.created", { id: `re_test_${crypto.randomUUID()}`, object: "refund", payment_intent: paymentIntent });
    const refundResponse = await page.request.post("/api/stripe/webhook", { data: refund.payload, headers: { "content-type": "application/json", "stripe-signature": refund.signature } });
    expect(refundResponse.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("article", { name: "Site status" })).toContainText("Private draft");
    await openWorkspaceSection(page, "Publish");
    await expect(page.getByText("Your site is private until you publish it.")).toBeVisible();
    await expect(page.getByText("This purchase was refunded", { exact: false })).toBeVisible();
    // Revoked: no share panel or share actions.
    await expect(page.locator("#guest-link")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Share|Copy)/ })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("payment-refunded.png"), fullPage: true });
    expect((await guest.request.get(home)).status()).toBe(404);
  } finally {
    await guest.close();
    await local.admin.auth.admin.deleteUser(ownerId);
  }
});
