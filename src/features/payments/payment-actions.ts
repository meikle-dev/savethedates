"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
import { stripeClient } from "./stripe";
import type { FormState } from "@/features/account/validation";

export async function startCheckout(): Promise<FormState> {
  let checkoutUrl: string;
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { message: "Your session has ended. Sign in again, then retry." };
    const { data: wedding, error } = await client.from("weddings")
      .select("id, wedding_date")
      .eq("owner_id", user.id)
      .single();
    if (error || !wedding) return { message: "Save your wedding details before purchasing." };
    const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
    if (entitlement?.active) return { message: "Your wedding already has an active publication entitlement." };
    const expiry = new Date(`${wedding.wedding_date}T00:00:00Z`);
    expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
    if (expiry <= new Date()) return { message: "Choose a wedding date whose 12-month site period has not already ended." };

    const metadata = { wedding_id: wedding.id, owner_id: user.id };
    const origin = appOrigin();
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      client_reference_id: wedding.id,
      customer_email: user.email,
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
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
    });
    if (!session.url) return { message: "Stripe did not provide a checkout page. Please retry." };
    checkoutUrl = session.url;
  } catch {
    return { message: "We couldn’t start checkout. Your draft is unchanged; please retry." };
  }
  redirect(checkoutUrl);
}
