import type Stripe from "stripe";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeClient, stripeWebhookSecret } from "@/features/payments/stripe";

export const runtime = "nodejs";

function id(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function POST(request: Request) {
  return withLogging("payment.webhook", "/api/stripe/webhook", () => handleWebhook(request));
}

function rejected(reason: string, body = "Incomplete Stripe event") {
  log.warn("payment.webhook.rejected", { reason });
  return new Response(body, { status: 400 });
}

async function handleWebhook(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return rejected("missing_signature", "Missing Stripe signature");
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, stripeWebhookSecret());
  } catch {
    return rejected("invalid_signature", "Invalid Stripe signature");
  }
  log.info("payment.webhook.received", { stripeEventId: event.id, eventType: event.type });

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const attemptId = session.metadata?.attempt_id;
    if (!attemptId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
      return rejected("missing_attempt");
    }
    const { data, error } = await createAdminClient().rpc("expire_checkout_attempt", {
      requested_attempt_id: attemptId,
      requested_session_id: session.id,
    });
    if (error) {
      log.error("payment.webhook.failed", { stripeEventId: event.id, reason: errorReason(error) });
      return new Response("Checkout expiration could not be recorded", { status: 500 });
    }
    log.info("payment.checkout.expired", { stripeEventId: event.id, reason: data ? "expired" : "unchanged" });
    return Response.json({ received: true, result: data ? "expired" : "unchanged" });
  }

  let eventType: "paid" | "refunded" | "disputed" | null = null;
  let paymentIntentId: string | null = null;
  let weddingId: string | null = null;
  let ownerId: string | null = null;
  let checkoutSessionId: string | null = null;
  let entitlementExpiresAt: string | null = null;

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status !== "paid") return Response.json({ received: true });
    if (session.amount_total !== 2900 || session.currency !== "gbp") return rejected("unexpected_total", "Unexpected checkout total");
    eventType = "paid";
    paymentIntentId = id(session.payment_intent);
    weddingId = session.metadata?.wedding_id ?? null;
    ownerId = session.metadata?.owner_id ?? null;
    entitlementExpiresAt = session.metadata?.entitlement_expires_at ?? null;
    checkoutSessionId = session.id;
  } else if (event.type === "refund.created") {
    eventType = "refunded";
    paymentIntentId = id(event.data.object.payment_intent);
  } else if (event.type === "charge.dispute.created") {
    eventType = "disputed";
    paymentIntentId = id(event.data.object.payment_intent);
  } else {
    return Response.json({ received: true });
  }

  const parsedExpiry = entitlementExpiresAt ? new Date(entitlementExpiresAt) : null;
  if (!paymentIntentId || (eventType === "paid" && (!weddingId || !ownerId || !checkoutSessionId || !parsedExpiry || Number.isNaN(parsedExpiry.valueOf())))) {
    return rejected("incomplete_metadata");
  }
  // Metadata is trusted only after signature verification, and the database rechecks ownership.
  identify({ ownerId: ownerId ?? undefined, weddingId: weddingId ?? undefined });
  const { data, error } = await createAdminClient().rpc("process_stripe_payment_event", {
    requested_event_id: event.id,
    requested_event_created_at: new Date(event.created * 1000).toISOString(),
    requested_event_type: eventType,
    requested_payment_intent_id: paymentIntentId,
    requested_entitlement_expires_at: parsedExpiry?.toISOString() ?? null,
    requested_wedding_id: weddingId,
    requested_owner_id: ownerId,
    requested_checkout_session_id: checkoutSessionId,
  });
  if (error) {
    log.error("payment.webhook.failed", { stripeEventId: event.id, reason: errorReason(error) });
    return new Response("Payment event could not be recorded", { status: 500 });
  }
  if (data === "duplicate") log.info("payment.webhook.duplicate", { stripeEventId: event.id });
  else if (data === "granted") log.info("payment.entitlement.granted", { stripeEventId: event.id });
  else if (data === "revoked") log.info("payment.entitlement.revoked", { stripeEventId: event.id, reason: eventType === "paid" ? "earlier_revocation" : eventType });
  else log.info("payment.webhook.recorded", { stripeEventId: event.id, reason: eventType });
  return Response.json({ received: true, result: data });
}
