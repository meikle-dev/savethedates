"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/features/account/validation";
import { isWeddingTheme } from "@/features/weddings/themes";

export async function applyTheme(_: FormState, form: FormData): Promise<FormState> {
  const theme = form.get("theme");
  if (!isWeddingTheme(theme)) return { message: "Choose one of the available themes." };
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { message: "Your session has ended. Sign in again, then retry." };
    const { data, error } = await client.from("weddings").update({ theme }).eq("owner_id", user.id).select("slug, published").single();
    const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
    const isLive = !!data?.published && !!entitlement?.active;
    if (error || !data) return { message: "We couldn't apply your theme. Your saved theme is unchanged; please retry." };
    revalidatePath("/dashboard", "layout");
    if (data.slug) revalidatePath(`/${data.slug}`);
    return { success: true, message: isLive ? "Theme applied to your live wedding site." : "Theme saved to your private draft." };
  } catch { return { message: "We couldn't apply your theme. Check your connection and sign-in, then retry." }; }
}
