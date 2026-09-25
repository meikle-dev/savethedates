"use server";

import { revalidatePath } from "next/cache";
import { guestPagesRoute } from "@/features/weddings/guest-link";
import { invitationFormValues, invitationSchema, type InvitationFormState } from "@/features/weddings/invitation";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function saveInvitation(_: InvitationFormState, form: FormData): Promise<InvitationFormState> {
  return withLogging("workspace.save", "/dashboard/invitation", async () => {
    const values = invitationFormValues(form);
    const parsed = invitationSchema.safeParse(values);
    if (!parsed.success) {
      return { message: "Please check the highlighted fields. Your Invitation changes haven’t been saved.", errors: parsed.error.flatten().fieldErrors, values };
    }
    try {
      const client = await createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) {
        log.warn("workspace.ownership.denied", { reason: "no_session" });
        return { message: "Your session has ended. Sign in again in another tab, then retry. Your changes are still here.", values: parsed.data };
      }
      identify({ ownerId: user.id });
      const { data, error } = await client.from("weddings").update(parsed.data).eq("owner_id", user.id).select("id, published").single();
      // Ceremony fields are shared with Details, and an enabled Details page must keep at least one section.
      if (error?.message.includes("enabled_details_have_content")) {
        log.warn("workspace.save.rejected", { section: "invitation", reason: "details_would_be_empty" });
        return { message: "Your Details page is switched on and would be left empty. Keep a ceremony time, venue or address, or switch Details off first.", values: parsed.data };
      }
      if (error || !data) {
        log.error("workspace.save.failed", { section: "invitation", reason: errorReason(error) });
        return { message: "We couldn’t save your Invitation. Your changes are still here; please try again.", values: parsed.data };
      }
      identify({ weddingId: data.id });
      const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
      const isLive = data.published && !!entitlement?.active;
      revalidatePath("/dashboard", "layout");
      revalidatePath(guestPagesRoute, "layout");
      log.info("workspace.save.succeeded", { section: "invitation" });
      const message = parsed.data.invitation_enabled
        ? isLive ? "Your Invitation is saved and shown on your live site." : "Your Invitation is saved and ready for guests when you publish."
        : "Your Invitation is saved and hidden from guests.";
      return { success: true, message, values: parsed.data };
    } catch (error) {
      log.error("workspace.save.failed", { section: "invitation", reason: errorReason(error) });
      return { message: "We couldn’t connect to save your Invitation. Your changes are still here; please try again.", values: parsed.data };
    }
  });
}
