"use client";

import { useActionState } from "react";
import { startCheckout } from "./payment-actions";
import type { FormState } from "@/features/account/validation";

export type Entitlement = { active: boolean; expires_at: string | null; revoked_reason: string | null };

export function PurchasePanel({ entitlement, checkout }: { entitlement: Entitlement; checkout?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(startCheckout, {});
  const expiry = entitlement.expires_at
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(entitlement.expires_at))
    : null;
  return <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/45 p-5 sm:p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h3 className="text-lg font-medium">One wedding site</h3>
      <p className="editorial text-3xl">£29 <span className="font-sans text-sm text-[var(--muted)]">once</span></p>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">Includes all three themes, one photo, Wedding Details and RSVP. Your site can stay online until 12 months after the wedding date.</p>
    {entitlement.active ? <p className="form-notice mt-4" role="status">Payment confirmed. You can publish and republish{expiry ? ` until ${expiry}` : ""}.</p> : <>
      {checkout === "success" && <p className="form-notice mt-4" role="status">Checkout completed. We’ll enable publishing as soon as Stripe confirms the payment.</p>}
      {checkout === "cancelled" && <p className="form-notice mt-4" role="status">Checkout was cancelled. Your private draft is unchanged.</p>}
      {entitlement.revoked_reason
        ? <p className="form-error mt-4" role="alert">This purchase was {entitlement.revoked_reason === "refunded" ? "refunded" : "disputed"}, so the site is private. Your draft is still saved and you can purchase again.</p>
        : expiry && <p className="form-error mt-4" role="alert">The previous site period ended on {expiry}, so the site is private. Your draft is still saved; update the wedding date if needed before purchasing again.</p>}
      <form action={action} className="mt-5">
        <button className="primary-button" disabled={pending}>{pending ? "Opening secure checkout…" : "Buy and continue to Stripe"}</button>
        {state.message && <p className="form-error mt-4" role="alert">{state.message}</p>}
      </form>
    </>}
  </div>;
}
