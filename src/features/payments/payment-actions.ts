"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { stripeClient } from "./stripe";
import { checkoutSessionParams, type CheckoutAttempt } from "./checkout-session";
import type { FormState } from "@/features/account/validation";

export async function startCheckout(): Promise<FormState> {
  let checkoutUrl: string;
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { message: "Your session has ended. Sign in again, then retry." };
    const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
    if (entitlement?.active) return { message: "Your wedding already has an active publication entitlement." };
    const { data: attempt, error } = await client.rpc("begin_checkout_attempt").single<CheckoutAttempt>();
    if (error || !attempt) return { message: "Choose a wedding date that leaves enough time to complete checkout before the site period ends, then retry." };
    if (new Date(attempt.checkout_expires_at) <= new Date()) {
      return { message: "Stripe is still confirming the previous checkout. Wait a moment, then retry." };
    } else if (attempt.checkout_url) {
      checkoutUrl = attempt.checkout_url;
    } else {
      const session = await stripeClient().checkout.sessions.create(
        checkoutSessionParams(attempt, user.id, user.email, appOrigin()),
        { idempotencyKey: attempt.attempt_id },
      );
      if (!session.url) return { message: "Stripe did not provide a checkout page. Please retry." };
      const { data: attached, error: attachError } = await client.rpc("attach_checkout_session", {
        requested_attempt_id: attempt.attempt_id,
        requested_session_id: session.id,
        requested_checkout_url: session.url,
      });
      if (attachError || !attached) return { message: "Checkout was created but could not be attached to your draft. Please retry." };
      checkoutUrl = session.url;
    }
  } catch {
    return { message: "We couldn’t start checkout. Your draft is unchanged; please retry." };
  }
  redirect(checkoutUrl);
}
