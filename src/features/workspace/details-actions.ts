"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/features/account/validation";
import { createClient } from "@/lib/supabase/server";
import { parseDetailsForm } from "@/features/weddings/details";

export async function saveDetails(_: FormState, form: FormData): Promise<FormState> {
  const parsed = parseDetailsForm(form);
  if (!parsed.success) {
    return {
      message: "Please check the highlighted fields. Your Details changes haven’t been saved.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { message: "Your session has ended. Sign in again in another tab, then retry. Your changes are still here." };
    const { data, error } = await client.from("weddings").update(parsed.data).eq("owner_id", user.id).select("slug, published").single();
    if (error || !data) return { message: "We couldn’t save your Details page. Your changes are still here; please try again." };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/preview");
    revalidatePath("/dashboard/preview/details");
    if (data.slug) {
      revalidatePath(`/${data.slug}`);
      revalidatePath(`/${data.slug}/details`);
    }
    const message = parsed.data.details_enabled
      ? data.published ? "Your Details page is saved and shown on your live site." : "Your Details page is saved and ready for guests when you publish."
      : "Your Details page is saved and hidden from guests.";
    return { success: true, message };
  } catch {
    return { message: "We couldn’t connect to save your Details page. Your changes are still here; please try again." };
  }
}
