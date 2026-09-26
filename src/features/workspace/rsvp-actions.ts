"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { publicClient } from "@/lib/supabase/public";
import { guestPagesRoute } from "@/features/weddings/guest-link";
import {
  closeDateSchema,
  guestSecretSchema,
  responseFoodColumns,
  rsvpNameSchema,
  type ResponseFood,
  type RsvpState,
} from "@/features/weddings/rsvp";
import {
  assignOptionIds,
  choiceSummary,
  mealChoicesIntro,
  mealMenuDraftFromForm,
  parseMealMenu,
  validateMealMenu,
  type MealMenuDraft,
  type MealMenuErrors,
  foodArguments,
  guestFoodErrors,
  guestFoodFromForm,
  hasFood,
  maxDietaryOtherLength,
  menuUpdated,
  noFood,
  notAttendingCleared,
  reconcileMeals,
  seenMenuFromForm,
  type GuestFood,
  type MealMenu,
} from "@/features/weddings/meal-menu";
import { guestRsvpMenu } from "@/features/weddings/published";
import { responseHasFood } from "./catering";
import { denyWorkspace, WorkspaceAccessError } from "./workspace-access";

async function ownerWorkspace() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) denyWorkspace("no_session", "Your session has ended. Sign in again, then retry.");
  identify({ ownerId: user.id });
  const { data, error } = await client.from("weddings").select("id").eq("owner_id", user.id).single();
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
      // The section adds the refreshed RSVP status to this notice, so it is accurate before and after publishing.
      return { success: true, message: enabled ? "RSVP settings saved." : "RSVP settings saved. Existing responses remain in Guests." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("workspace.save.failed", { section: "rsvp_settings", reason: errorReason(error) });
      return { message: error instanceof Error ? error.message : "We couldn’t save your RSVP settings." };
    }
  });
}

export type MealChoicesState = {
  success?: boolean;
  message?: string;
  errors?: MealMenuErrors;
  /** The saved menu after a successful save (with ids for new options), or the owner's rejected draft to refill. */
  values?: MealMenuDraft;
};

export async function saveMealChoices(_: MealChoicesState, form: FormData): Promise<MealChoicesState> {
  return withLogging("workspace.save", "/dashboard/rsvp", async () => {
    const draft = mealMenuDraftFromForm(form);
    const { menu, errors } = validateMealMenu(draft);
    if (Object.keys(errors).length) return { message: "Check the meal choices marked below.", errors, values: draft };
    const failed = { message: "We couldn’t save your meal choices. Please retry.", values: draft };
    try {
      const { client, wedding } = await ownerWorkspace();
      const saved = await client.from("weddings").select("meal_menu").eq("id", wedding.id).single();
      if (saved.error) {
        log.error("workspace.save.failed", { section: "meal_choices", reason: errorReason(saved.error) });
        return failed;
      }
      const meal_menu = assignOptionIds(menu, parseMealMenu(saved.data.meal_menu), () => crypto.randomUUID());
      const { error } = await client.from("weddings").update({ meal_choices_enabled: draft.enabled, meal_menu }).eq("id", wedding.id);
      if (error) {
        log.error("workspace.save.failed", { section: "meal_choices", reason: errorReason(error) });
        return failed;
      }
      refreshRsvp();
      log.info("workspace.save.succeeded", { section: "meal_choices" });
      return { success: true, message: `Meal choices saved. ${mealChoicesIntro(draft.enabled, meal_menu)}`, values: { enabled: draft.enabled, menu: meal_menu } };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("workspace.save.failed", { section: "meal_choices", reason: errorReason(error) });
      return error instanceof WorkspaceAccessError ? { message: error.message, values: draft } : failed;
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
      // The refreshed pages show the new link everywhere; the secret is not returned or logged here.
      return { success: true, message: "Guest link replaced. Every link you shared before, including your Save the Date, no longer works." };
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
      // A change to not attending also removes food answers (a database trigger); say so when there were any.
      let hadFood = false;
      if (intent.data === "correct" && attendance.data === "no") {
        const before = await client.from("shared_rsvp_responses").select(`attending, ${responseFoodColumns}`).eq("id", id.data).eq("wedding_id", wedding.id).maybeSingle<{ attending: boolean } & ResponseFood>();
        hadFood = !!before.data?.attending && responseHasFood(before.data);
      }
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
      if (intent.data === "remove") return { success: true, message: "Response removed." };
      return hadFood
        ? { success: true, message: "Response corrected. Their meal choices and food preferences were removed." }
        : { success: true, message: "Response corrected." };
    } catch (error) {
      if (!(error instanceof WorkspaceAccessError)) log.error("rsvp.response.failed", { reason: errorReason(error) });
      return { message: "We couldn’t change this response. Check your connection and retry." };
    }
  });
}

const rsvpRejections: Record<string, string> = { unavailable: "invalid_link", rate_limited: "rate_limited", full: "capacity", closed: "closed",
  // F068: a choice that no longer matches the menu, versus a course guests are shown left unanswered.
  invalid_meals: "menu_mismatch", meal_missing: "meal_missing" };

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
    const food = guestFoodFromForm(form);
    const seen = seenMenuFromForm(form);
    // Refill only this guest's own unsaved entry after a rejection; nothing saved is ever read back. Food answers are
    // never logged or reported; they reach only the database and this guest's own form.
    const values = (answers: GuestFood): NonNullable<RsvpState["values"]> => ({
      responding_name: String(form.get("responding_name") ?? "").slice(0, 80),
      attending: attendance.success ? attendance.data : undefined,
      meals: answers.meals, dietary: answers.dietary, dietary_other: answers.other.slice(0, maxDietaryOtherLength),
    });
    // Food is sent as given, so the database refuses answers sent with a "No" instead of silently dropping them.
    const { data, error } = await publicClient().rpc("submit_shared_rsvp", {
      requested_secret: secret.data,
      requested_name: name.success ? name.data : null,
      requested_attending: attendance.success ? attendance.data === "yes" : null,
      ...foodArguments(food, seen),
    });
    if (error) {
      log.error("rsvp.submit.failed", { reason: errorReason(error) });
      return { ...unavailable, values: values(food) };
    }
    if (data !== "saved") log.warn("rsvp.submit.rejected", { reason: rsvpRejections[data] ?? "invalid_input" });
    if (data === "unavailable") return { ...unavailable, values: values(food) };
    if (data === "rate_limited") return { message: "This link is busy. Wait ten minutes, then try again.", values: values(food) };
    if (data === "full") return { message: "RSVP is temporarily unavailable. Please contact the couple.", values: values(food) };
    if (data === "closed") return { message: "RSVP is now closed. Contact the couple if your plans have changed.", values: values(food) };
    if (data !== "saved") {
      const errors: Record<string, string[] | undefined> = {
        responding_name: name.success ? undefined : name.error.issues.map((issue) => issue.message),
        attending: attendance.success ? undefined : ["Choose attending or not attending."],
      };
      // No-JS edge: a guest who chose meals and then switched to "No". Keep the "No", clear the food answers.
      if (attendance.success && attendance.data === "no" && hasFood(food)) return { message: notAttendingCleared, values: values(noFood()), errors };
      if (attendance.success && attendance.data === "yes" && (data === "invalid_meals" || data === "meal_missing")) {
        // Re-read the current menu to explain the rejection. If that fails, fall back to checking against the menu the
        // guest's page showed rather than turning a validation refusal into an error page.
        let current: MealMenu | null;
        try {
          current = await guestRsvpMenu(secret.data);
        } catch (menuError) {
          log.error("rsvp.submit.failed", { reason: errorReason(menuError) });
          return { message: "Check the highlighted fields.", values: values(food), errors: { ...errors, ...guestFoodErrors(food, seen) } };
        }
        const reconciled = reconcileMeals(food, seen, current);
        return {
          message: reconciled.changed ? menuUpdated : "Check the highlighted fields.",
          values: values({ ...food, meals: reconciled.meals }),
          errors: { ...errors, ...guestFoodErrors({ ...food, meals: {} }, null), ...reconciled.errors },
          menuUpdate: { menu: current },
        };
      }
      return { message: "Check the highlighted fields.", values: values(food), errors: attendance.success && attendance.data === "yes" ? { ...errors, ...guestFoodErrors(food, seen) } : errors };
    }
    log.info("rsvp.submit.accepted");
    const accepted = attendance.data === "yes";
    return {
      success: true,
      message: `We’ve saved ${name.data}’s reply: ${accepted ? "joyfully accepts" : "regretfully declines"}.`,
      choices: accepted ? choiceSummary(food, seen) : undefined,
    };
  });
}
