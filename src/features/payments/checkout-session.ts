import type Stripe from "stripe";

export type CheckoutAttempt = {
  attempt_id: string;
  wedding_id: string;
  checkout_url: string | null;
  checkout_expires_at: string;
  entitlement_expires_at: string;
};

export function checkoutSessionParams(attempt: CheckoutAttempt, ownerId: string, email: string | undefined, origin: string): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    attempt_id: attempt.attempt_id,
    wedding_id: attempt.wedding_id,
    owner_id: ownerId,
    entitlement_expires_at: attempt.entitlement_expires_at,
  };
  return {
    mode: "payment",
    client_reference_id: attempt.wedding_id,
    customer_email: email,
    payment_method_types: ["card"],
    expires_at: Math.floor(new Date(attempt.checkout_expires_at).getTime() / 1000),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: 2900,
        product_data: { name: "SaveTheDates wedding site" },
      },
    }],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/dashboard/publish?checkout=success`,
    cancel_url: `${origin}/dashboard/publish?checkout=cancelled`,
  };
}
