import { describe, expect, it } from "vitest";
import { checkoutSessionParams, type CheckoutAttempt } from "./checkout-session";

describe("checkoutSessionParams", () => {
  it("pins one card payment to the stored attempt and entitlement snapshot", () => {
    const attempt: CheckoutAttempt = {
      attempt_id: "00000000-0000-4000-8000-000000000001",
      wedding_id: "00000000-0000-4000-8000-000000000002",
      checkout_url: null,
      checkout_expires_at: "2026-09-19T12:31:00.900Z",
      entitlement_expires_at: "2028-03-18T00:00:00.000Z",
    };
    const params = checkoutSessionParams(attempt, "owner-1", "owner@example.test", "https://example.test");
    expect(params).toMatchObject({
      mode: "payment",
      client_reference_id: attempt.wedding_id,
      customer_email: "owner@example.test",
      payment_method_types: ["card"],
      expires_at: 1789821060,
      metadata: { attempt_id: attempt.attempt_id, wedding_id: attempt.wedding_id, owner_id: "owner-1", entitlement_expires_at: attempt.entitlement_expires_at },
      payment_intent_data: { metadata: { attempt_id: attempt.attempt_id } },
      success_url: "https://example.test/dashboard?checkout=success",
      cancel_url: "https://example.test/dashboard?checkout=cancelled",
    });
    expect(params.line_items).toEqual([{ quantity: 1, price_data: { currency: "gbp", unit_amount: 2900, product_data: { name: "SaveTheDates wedding site" } } }]);
  });
});
