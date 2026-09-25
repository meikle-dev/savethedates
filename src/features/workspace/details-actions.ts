"use server";

import { revalidatePath } from "next/cache";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { detailsFormValues, parseDetailsForm, type DetailsFormState } from "@/features/weddings/details";

export async function saveDetails(_: DetailsFormState, form: FormData): Promise<DetailsFormState> {
  return withLogging("workspace.save", "/dashboard/details", async () => {
    const values = detailsFormValues(form);
    const parsed = parseDetailsForm(form);
    if (!parsed.success) {
      return {
        message: "Please check the highlighted fields. Your Details changes haven’t been saved.",
        errors: parsed.error.flatten().fieldErrors,
        values,
      };
    }
    try {
      const client = await createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) {
        log.warn("workspace.ownership.denied", { reason: "no_session" });
        return { message: "Your session has ended. Sign in again in another tab, then retry. Your changes are still here.", values: parsed.data };
      }
      identify({ ownerId: user.id });
      const { data, error } = await client.from("weddings").update(parsed.data).eq("owner_id", user.id).select("id, slug, published").single();
      const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
      const isLive = !!data?.published && !!entitlement?.active;
      if (error || !data) {
        log.error("workspace.save.failed", { section: "details", reason: errorReason(error) });
        return { message: "We couldn’t save your Details page. Your changes are still here; please try again.", values: parsed.data };
      }
      identify({ weddingId: data.id });
      revalidatePath("/dashboard", "layout");
      if (data.slug) {
        revalidatePath(`/${data.slug}`);
        revalidatePath(`/${data.slug}/details`);
      }
      log.info("workspace.save.succeeded", { section: "details" });
      const message = parsed.data.details_enabled
        ? isLive ? "Your Details page is saved and shown on your live site." : "Your Details page is saved and ready for guests when you publish."
        : "Your Details page is saved and hidden from guests.";
      return { success: true, message, values: parsed.data };
    } catch (error) {
      log.error("workspace.save.failed", { section: "details", reason: errorReason(error) });
      return { message: "We couldn’t connect to save your Details page. Your changes are still here; please try again.", values: parsed.data };
    }
  });
}
