import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeClient, stripeWebhookSecret } from "@/features/payments/stripe";

export const runtime = "nodejs";

function id(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, stripeWebhookSecret());
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const attemptId = session.metadata?.attempt_id;
    if (!attemptId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
      return new Response("Incomplete Stripe event", { status: 400 });
    }
    const { data, error } = await createAdminClient().rpc("expire_checkout_attempt", {
      requested_attempt_id: attemptId,
      requested_session_id: session.id,
    });
    if (error) return new Response("Checkout expiration could not be recorded", { status: 500 });
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
    if (session.amount_total !== 2900 || session.currency !== "gbp") return new Response("Unexpected checkout total", { status: 400 });
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
    return new Response("Incomplete Stripe event", { status: 400 });
  }
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
  if (error) return new Response("Payment event could not be recorded", { status: 500 });
  return Response.json({ received: true, result: data });
}
