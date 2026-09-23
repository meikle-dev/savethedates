import { afterAll, beforeAll, expect, it } from "vitest";
import { localSupabase } from "../helpers/local-supabase";

const local = localSupabase();
const authenticated = local.anonymous();
let userId = "";

beforeAll(async () => {
  const email = `retired-rsvp-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create RSVP test user");
  userId = created.data.user.id;
  expect((await authenticated.auth.signInWithPassword({ email, password })).error).toBeNull();
});

afterAll(async () => {
  if (userId) await local.admin.auth.admin.deleteUser(userId);
});

it("removes every individual-invitation RPC and table for all roles", async () => {
  const calls = [
    ["guest_rsvp", { requested_slug: "retired", requested_token_hash: "0".repeat(64) }],
    ["record_invalid_rsvp_attempt", { requested_slug: "retired", requested_token_hash: "0".repeat(64) }],
    ["submit_guest_rsvp", { requested_slug: "retired", requested_token_hash: "0".repeat(64), requested_name: "Guest", requested_attending: true }],
    ["revoke_rsvp_invitation", { requested_id: crypto.randomUUID() }],
    ["consume_rsvp_attempt", { requested_invitation_id: crypto.randomUUID() }],
    ["limit_rsvp_invitations", {}],
  ] as const;

  for (const client of [local.anonymous(), authenticated, local.admin]) {
    for (const [name, args] of calls) {
      const { error } = await client.rpc(name, args);
      expect(error?.code, `${name} must be absent`).toBe("PGRST202");
    }
    for (const table of ["rsvp_invitations", "rsvp_attempts"]) {
      const { error } = await client.from(table).select("id").limit(1);
      expect(error?.code, `${table} must be absent`).toBe("PGRST205");
    }
  }
});
