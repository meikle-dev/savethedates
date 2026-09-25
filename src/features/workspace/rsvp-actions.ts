"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { publicClient } from "@/lib/supabase/public";
import { currentNames, guestHrefs, guestPagesRoute } from "@/features/weddings/guest-link";
import {
  closeDateSchema,
  guestSecretSchema,
  rsvpNameSchema,
  type RsvpState,
} from "@/features/weddings/rsvp";
import { denyWorkspace, WorkspaceAccessError } from "./workspace-access";

async function ownerWorkspace() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) denyWorkspace("no_session", "Your session has ended. Sign in again, then retry.");
  identify({ ownerId: user.id });
  const { data, error } = await client.from("weddings").select("id, slug, first_name, second_name, published").eq("owner_id", user.id).single();
  if (error || !data) denyWorkspace("no_wedding", "Save your wedding details first, then retry.");
  identify({ weddingId: data.id });
  return { client, wedding: data };
}

function refreshRsvp() {
  revalidatePath("/dashboard", "layout");
  revalidatePath(guestPagesRoute, "layout");
}

export async function saveRsvpSettings(_: RsvpState, form: FormData): Promise<RsvpState> {
  return withLogging("workspace.save", "/dashboard/rsvp", async () => {
    const close = closeDateSchema.safeParse(String(form.get("rsvp_closes_on") ?? ""));
    if (!close.success) return { message: "Enter a valid closing date.", errors: { rsvp_closes_on: ["Enter a valid closing date."] } };
    try {
      const { client, wedding } = await ownerWorkspace();
      const enabled = form.get("rsvp_enabled") === "on";
      const { error } = await client.from("weddings").update({ rsvp_enabled: enabled, rsvp_closes_on: close.data }).eq("id", wedding.id);
      if (error) {
        log.error("workspace.save.failed", { section: "rsvp_settings", reason: errorReason(error) });
        return { message: "We couldn’t save your RSVP settings. Please retry." };
      }
      refreshRsvp();
      log.info("workspace.save.succeeded", { section: "rsvp_settings" });
      return { success: true, message: enabled ? "RSVP is enabled. Share your one private RSVP link below." : "RSVP is closed. Existing responses remain in your workspace." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("workspace.save.failed", { section: "rsvp_settings", reason: errorReason(error) });
      return { message: error instanceof Error ? error.message : "We couldn’t save your RSVP settings." };
    }
  });
}

export async function rotateSharedRsvp(_: RsvpState, form: FormData): Promise<RsvpState> {
  return withLogging("rsvp.link", "/dashboard/rsvp", async () => {
    if (form.get("confirm_rotate") !== "yes") return { message: "Confirm that you want to replace your guest link." };
    try {
      const { client, wedding } = await ownerWorkspace();
      const { data, error } = await client.rpc("rotate_shared_rsvp_secret", { requested_wedding_id: wedding.id });
      if (error || !data) {
        log.error("rsvp.link.failed", { reason: error ? errorReason(error) : "no_secret" });
        return { message: "We couldn’t replace your guest link. Please retry." };
      }
      refreshRsvp();
      log.info("rsvp.link.rotated");
      return { success: true, message: "Guest link replaced. Every link you shared before, including your Save the Date, no longer works.", shareUrl: guestHrefs(currentNames(wedding), data).rsvp };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("rsvp.link.failed", { reason: errorReason(error) });
      return { message: "We couldn’t replace your guest link. Please retry." };
    }
  });
}

export async function manageSharedResponse(_: RsvpState, form: FormData): Promise<RsvpState> {
  return withLogging("rsvp.response", "/dashboard/guests", async () => {
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
      if (result.error) {
        log.error("rsvp.response.failed", { reason: errorReason(result.error) });
        return { message: "We couldn’t change this response. Reload and retry." };
      }
      if (!result.data) {
        log.warn("rsvp.response.rejected", { reason: "not_found" });
        return { message: "We couldn’t change this response. Reload and retry." };
      }
      refreshRsvp();
      log.info(intent.data === "remove" ? "rsvp.response.removed" : "rsvp.response.corrected");
      return { success: true, message: intent.data === "remove" ? "Response removed." : "Response corrected." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("rsvp.response.failed", { reason: errorReason(error) });
      return { message: "We couldn’t change this response. Check your connection and retry." };
    }
  });
}

const rsvpRejections: Record<string, string> = { unavailable: "invalid_link", rate_limited: "rate_limited", full: "capacity", closed: "closed" };

export async function submitSharedRsvp(_: RsvpState, form: FormData): Promise<RsvpState> {
  return withLogging("rsvp.submit", "/[names]/[secret]/rsvp", async () => {
    const unavailable = { message: "This RSVP link is unavailable. Ask the couple for a current link." };
    const secret = guestSecretSchema.safeParse(form.get("secret"));
    if (!secret.success) {
      log.warn("rsvp.submit.rejected", { reason: "invalid_link" });
      return unavailable;
    }
    const name = rsvpNameSchema.safeParse(form.get("responding_name"));
    const attendance = z.enum(["yes", "no"]).safeParse(form.get("attending"));
    const { data, error } = await publicClient().rpc("submit_shared_rsvp", {
      requested_secret: secret.data,
      requested_name: name.success ? name.data : null,
      requested_attending: attendance.success ? attendance.data === "yes" : null,
    });
    if (error) {
      log.error("rsvp.submit.failed", { reason: errorReason(error) });
      return unavailable;
    }
    if (data !== "saved") log.warn("rsvp.submit.rejected", { reason: rsvpRejections[data] ?? "invalid_input" });
    if (data === "unavailable") return unavailable;
    if (data === "rate_limited") return { message: "This link is busy. Wait ten minutes, then try again." };
    if (data === "full") return { message: "RSVP is temporarily unavailable. Please contact the couple." };
    if (data === "closed") return { message: "RSVP is now closed. Contact the couple if your plans have changed." };
    if (data !== "saved") return { message: "Check the highlighted fields.", errors: {
      responding_name: name.success ? undefined : name.error.issues.map((issue) => issue.message),
      attending: attendance.success ? undefined : ["Choose attending or not attending."],
    } };
    log.info("rsvp.submit.accepted");
    return { success: true, message: `Your RSVP for ${name.data} has been saved. Contact the couple if you need to change it.` };
  });
}
