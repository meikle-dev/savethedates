"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { stripeClient } from "./stripe";
import { checkoutSessionParams, type CheckoutAttempt } from "./checkout-session";
import type { FormState } from "@/features/account/validation";

export async function startCheckout(): Promise<FormState> {
  return withLogging("payment.checkout", "/dashboard/publish", async () => {
    let checkoutUrl: string;
    try {
      const client = await createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) {
        log.warn("workspace.ownership.denied", { reason: "no_session" });
        return { message: "Your session has ended. Sign in again, then retry." };
      }
      identify({ ownerId: user.id });
      const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
      if (entitlement?.active) {
        log.warn("payment.checkout.rejected", { reason: "already_entitled" });
        return { message: "Your wedding already has an active publication entitlement." };
      }
      const { data: attempt, error } = await client.rpc("begin_checkout_attempt").single<CheckoutAttempt>();
      if (error || !attempt) {
        log.warn("payment.checkout.rejected", { reason: error ? errorReason(error) : "no_attempt" });
        return { message: "Choose a wedding date that leaves enough time to complete checkout before the site period ends, then retry." };
      }
      identify({ weddingId: attempt.wedding_id });
      if (new Date(attempt.checkout_expires_at) <= new Date()) {
        log.warn("payment.checkout.conflicted", { reason: "previous_attempt_pending" });
        return { message: "Stripe is still confirming the previous checkout. Wait a moment, then retry." };
      } else if (attempt.checkout_url) {
        log.info("payment.checkout.reused");
        checkoutUrl = attempt.checkout_url;
      } else {
        const session = await stripeClient().checkout.sessions.create(
          checkoutSessionParams(attempt, user.id, user.email, appOrigin()),
          { idempotencyKey: attempt.attempt_id },
        );
        if (!session.url) {
          log.error("payment.stripe.failed", { reason: "missing_checkout_url" });
          return { message: "Stripe did not provide a checkout page. Please retry." };
        }
        const { data: attached, error: attachError } = await client.rpc("attach_checkout_session", {
          requested_attempt_id: attempt.attempt_id,
          requested_session_id: session.id,
          requested_checkout_url: session.url,
        });
        if (attachError || !attached) {
          log.error("payment.checkout.failed", { reason: attachError ? errorReason(attachError) : "not_attached" });
          return { message: "Checkout was created but could not be attached to your draft. Please retry." };
        }
        log.info("payment.checkout.created");
        checkoutUrl = session.url;
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) log.error("payment.stripe.failed", { reason: error.type });
      else log.error("payment.checkout.failed", { reason: errorReason(error) });
      return { message: "We couldn’t start checkout. Your draft is unchanged; please retry." };
    }
    redirect(checkoutUrl);
  });
}
