"use server";

import { revalidatePath } from "next/cache";
import { guestPagesRoute } from "@/features/weddings/guest-link";
import { errorReason, identify, log, withLogging } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/features/account/validation";
import { draftSchema } from "./validation";

export async function saveDraft(_: FormState, form: FormData): Promise<FormState> {
  return withLogging("workspace.save", "/dashboard/basics", async () => {
    const input = draftSchema.safeParse(Object.fromEntries(form));
    if (!input.success) return { message: "Please check the highlighted fields. Your changes haven’t been saved.", errors: input.error.flatten().fieldErrors };
    try {
      const client = await createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) {
        log.warn("workspace.ownership.denied", { reason: "no_session" });
        return { message: "Your session has ended. Sign in again in another tab, then retry. Your changes are still here." };
      }
      identify({ ownerId: user.id });
      const { data, error } = await client.from("weddings").upsert({ ...input.data, owner_id: user.id }, { onConflict: "owner_id" }).select("id, published").single();
      const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
      const isLive = !!data?.published && !!entitlement?.active;
      if (error) {
        log.error("workspace.save.failed", { section: "basics", reason: errorReason(error) });
        return { message: "We couldn’t save your draft. Your changes are still here; please try again." };
      }
      identify({ weddingId: data.id });
      revalidatePath("/dashboard", "layout");
      revalidatePath(guestPagesRoute, "layout");
      log.info("workspace.save.succeeded", { section: "basics" });
      return { success: true, message: isLive ? "Your live wedding site has been updated." : "Your private draft has been saved." };
    } catch (error) {
      log.error("workspace.save.failed", { section: "basics", reason: errorReason(error) });
      return { message: "We couldn’t connect to save your draft. Your changes are still here; please try again." };
    }
  });
}
