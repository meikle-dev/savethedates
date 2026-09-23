"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicClient } from "@/lib/supabase/public";
import { sharedRsvpHref } from "@/features/weddings/invitation-context";
import {
  closeDateSchema,
  hashInvitationToken,
  invitationTokenSchema,
  inviteNameSchema,
  rsvpNameSchema,
  type RsvpState,
} from "@/features/weddings/rsvp";

async function ownerWorkspace() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Your session has ended. Sign in again, then retry.");
  const { data, error } = await client.from("weddings").select("id, slug, published").eq("owner_id", user.id).single();
  if (error || !data) throw new Error("Save your wedding details first, then retry.");
  return { client, wedding: data };
}

function refreshRsvp(slug?: string | null) {
  revalidatePath("/dashboard", "layout");
  if (slug) {
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/details`);
    revalidatePath(`/${slug}/rsvp`);
  }
}

export async function saveRsvpSettings(_: RsvpState, form: FormData): Promise<RsvpState> {
  const close = closeDateSchema.safeParse(String(form.get("rsvp_closes_on") ?? ""));
  if (!close.success) return { message: "Enter a valid closing date.", errors: { rsvp_closes_on: ["Enter a valid closing date."] } };
  try {
    const { client, wedding } = await ownerWorkspace();
    const enabled = form.get("rsvp_enabled") === "on";
    const { error } = await client.from("weddings").update({ rsvp_enabled: enabled, rsvp_closes_on: close.data }).eq("id", wedding.id);
    if (error) return { message: "We couldn’t save your RSVP settings. Please retry." };
    refreshRsvp(wedding.slug);
    return { success: true, message: enabled ? "RSVP is enabled. Share your one private RSVP link below." : "RSVP is closed. Existing responses remain in your workspace." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "We couldn’t save your RSVP settings." };
  }
}

export async function rotateSharedRsvp(_: RsvpState, form: FormData): Promise<RsvpState> {
  if (form.get("confirm_rotate") !== "yes") return { message: "Confirm that you want to replace the shared link." };
  try {
    const { client, wedding } = await ownerWorkspace();
    const { data, error } = await client.rpc("rotate_shared_rsvp_secret", { requested_wedding_id: wedding.id });
    if (error || !data) return { message: "We couldn’t replace the shared link. Please retry." };
    refreshRsvp(wedding.slug);
    return { success: true, message: "Shared link replaced. Previously shared copies no longer work.", inviteUrl: wedding.slug ? sharedRsvpHref(wedding.slug, data) : undefined };
  } catch { return { message: "We couldn’t replace the shared link. Please retry." }; }
}

export async function manageSharedResponse(_: RsvpState, form: FormData): Promise<RsvpState> {
  const id = z.string().uuid().safeParse(form.get("response_id"));
  const intent = z.enum(["correct", "remove"]).safeParse(form.get("intent"));
  if (!id.success || !intent.success) return { message: "This response could not be identified. Reload and retry." };
  if (intent.data === "remove" && form.get("confirm_remove") !== "yes") return { message: "Confirm that you want to remove this response." };
  const name = rsvpNameSchema.safeParse(form.get("responding_name"));
  const attendance = z.enum(["yes", "no"]).safeParse(form.get("attending"));
  if (intent.data === "correct" && (!name.success || !attendance.success)) return {
    message: "Check the name and attendance choice.",
    errors: { responding_name: name.success ? undefined : name.error.issues.map((issue) => issue.message), attending: attendance.success ? undefined : ["Choose attending or not attending."] },
  };
  try {
    const { client, wedding } = await ownerWorkspace();
    const request = client.from("shared_rsvp_responses");
    const result = intent.data === "remove"
      ? await request.delete().eq("id", id.data).eq("wedding_id", wedding.id).select("id").maybeSingle()
      : await request.update({ responding_name: name.data, attending: attendance.data === "yes" }).eq("id", id.data).eq("wedding_id", wedding.id).select("id").maybeSingle();
    if (result.error || !result.data) return { message: "We couldn’t change this response. Reload and retry." };
    refreshRsvp(wedding.slug);
    return { success: true, message: intent.data === "remove" ? "Response removed." : "Response corrected." };
  } catch { return { message: "We couldn’t change this response. Check your connection and retry." }; }
}

export async function submitSharedRsvp(_: RsvpState, form: FormData): Promise<RsvpState> {
  const slug = z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).safeParse(form.get("slug"));
  const secret = invitationTokenSchema.safeParse(form.get("secret"));
  if (!slug.success || !secret.success) return { message: "This RSVP link is unavailable. Ask the couple for a current link." };
  const name = rsvpNameSchema.safeParse(form.get("responding_name"));
  const attendance = z.enum(["yes", "no"]).safeParse(form.get("attending"));
  const { data, error } = await publicClient().rpc("submit_shared_rsvp", {
    requested_slug: slug.data, requested_secret: secret.data,
    requested_name: name.success ? name.data : null,
    requested_attending: attendance.success ? attendance.data === "yes" : null,
  });
  if (error || data === "unavailable") return { message: "This RSVP link is unavailable. Ask the couple for a current link." };
  if (data === "rate_limited") return { message: "This link is busy. Wait ten minutes, then try again." };
  if (data === "full") return { message: "RSVP is temporarily unavailable. Please contact the couple." };
  if (data === "closed") return { message: "RSVP is now closed. Contact the couple if your plans have changed." };
  if (data !== "saved") return { message: "Check the highlighted fields.", errors: {
    responding_name: name.success ? undefined : name.error.issues.map((issue) => issue.message),
    attending: attendance.success ? undefined : ["Choose attending or not attending."],
  } };
  revalidatePath(sharedRsvpHref(slug.data, secret.data));
  return { success: true, message: `Your RSVP for ${name.data} has been saved. Contact the couple if you need to change it.`, respondingName: name.data, attending: attendance.data === "yes" };
}

export async function createInvitation(_: RsvpState, form: FormData): Promise<RsvpState> {
  const name = inviteNameSchema.safeParse(form.get("invite_name"));
  if (!name.success) return { message: name.error.issues[0]?.message, errors: { invite_name: name.error.issues.map((issue) => issue.message) } };
  try {
    const { client, wedding } = await ownerWorkspace();
    if (!wedding.slug) return { message: "Publish your wedding site before creating invitation links." };
    const token = randomBytes(32).toString("base64url");
    const { error } = await client.from("rsvp_invitations").insert({ wedding_id: wedding.id, invite_name: name.data, token_hash: hashInvitationToken(token) });
    if (error) return { message: error.code === "23514" ? "You can create up to 100 invitations." : "We couldn’t create this invitation. Please retry." };
    refreshRsvp(wedding.slug);
    return {
      success: true,
      message: "Invitation created. Copy this private link now; it won’t be shown again.",
      inviteUrl: `/${wedding.slug}/rsvp?invite=${token}`,
      inviteName: name.data,
      weddingUrl: `/${wedding.slug}`,
    };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "We couldn’t create this invitation." };
  }
}

export async function revokeInvitation(_: RsvpState, form: FormData): Promise<RsvpState> {
  const id = z.string().uuid().safeParse(form.get("invitation_id"));
  if (!id.success) return { message: "This invitation could not be identified. Reload and retry." };
  try {
    const { client, wedding } = await ownerWorkspace();
    const { data, error } = await client.rpc("revoke_rsvp_invitation", { requested_id: id.data });
    if (error || !data) return { message: "We couldn’t revoke this invitation. Reload and retry." };
    refreshRsvp(wedding.slug);
    return { success: true, message: "Invitation link revoked. Its saved response remains below." };
  } catch {
    return { message: "We couldn’t revoke this invitation. Check your connection and retry." };
  }
}

export async function submitRsvp(_: RsvpState, form: FormData): Promise<RsvpState> {
  const slug = z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).safeParse(form.get("slug"));
  const token = invitationTokenSchema.safeParse(form.get("token"));
  if (!slug.success || !token.success) return { message: "This RSVP link is unavailable. Ask the couple for a current private link." };
  const name = rsvpNameSchema.safeParse(form.get("responding_name"));
  const attendance = z.enum(["yes", "no"]).safeParse(form.get("attending"));
  const client = publicClient();
  if (!name.success || !attendance.success) {
    const attempt = await client.rpc("record_invalid_rsvp_attempt", { requested_slug: slug.data, requested_token_hash: hashInvitationToken(token.data) });
    if (attempt.data === "rate_limited") return { message: "Too many attempts. Wait ten minutes, then try again." };
    return {
      message: "Check the highlighted fields.",
      errors: {
        responding_name: name.success ? undefined : name.error.issues.map((issue) => issue.message),
        attending: attendance.success ? undefined : ["Choose attending or not attending."],
      },
    };
  }
  const { data, error } = await client.rpc("submit_guest_rsvp", {
    requested_slug: slug.data,
    requested_token_hash: hashInvitationToken(token.data),
    requested_name: name.data,
    requested_attending: attendance.data === "yes",
  });
  if (error || data === "unavailable") return { message: "This RSVP link is unavailable. Ask the couple for a current private link." };
  if (data === "rate_limited") return { message: "Too many attempts. Wait ten minutes, then try again." };
  if (data === "closed") return { message: "RSVP is now closed. Contact the couple if your plans have changed." };
  if (data !== "saved") return { message: "We couldn’t save your response. Check your answers and retry." };
  revalidatePath(`/${slug.data}/rsvp`);
  return { success: true, message: "Your RSVP has been saved. You can return with this same private link to update it while RSVP is open.", respondingName: name.data, attending: attendance.data === "yes" };
}
