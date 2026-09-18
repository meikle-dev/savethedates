import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe test mode is not configured yet.");
  client ??= new Stripe(key);
  return client;
}

export function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is required for payment webhooks.");
  return secret;
}
