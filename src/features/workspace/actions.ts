"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/features/account/validation";
import { draftSchema } from "./validation";

export async function saveDraft(_: FormState, form: FormData): Promise<FormState> {
  const input = draftSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "Please check the highlighted fields. Your changes haven’t been saved.", errors: input.error.flatten().fieldErrors };
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { message: "Your session has ended. Sign in again in another tab, then retry. Your changes are still here." };
    const { error } = await client.from("weddings").upsert({ ...input.data, owner_id: user.id }, { onConflict: "owner_id" });
    if (error) return { message: "We couldn’t save your draft. Your changes are still here; please try again." };
  } catch { return { message: "We couldn’t connect to save your draft. Your changes are still here; please try again." }; }
  revalidatePath("/dashboard");
  return { success: true, message: "Your private draft has been saved." };
}
