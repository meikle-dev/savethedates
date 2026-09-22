import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { toWedding } from "@/features/weddings/published";

import { themes, isWeddingTheme } from "@/features/weddings/themes";
import { ThemePicker } from "@/features/workspace/theme-picker";
import { ThemeApplyForm } from "@/features/workspace/theme-apply-form";

export default async function Preview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, wedding_date, location, message, photo_path, photo_framing, theme, published, details_enabled, rsvp_enabled").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load preview.");
  if (!data) redirect("/dashboard");
  const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
  const params = await searchParams;
  const candidate = isWeddingTheme(params.theme) ? params.theme : data.theme;
  const name = themes.find((theme) => theme.id === candidate)!.name;
  return <>
    <div className="platform px-6 py-5">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Preview" className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Private preview · saved content</span><Link href="/dashboard" className="text-link min-h-11 content-center">Back to workspace</Link></nav>
        <p className="mt-3 font-semibold">Previewing {name}{candidate === data.theme ? " · current theme" : " · not applied"}</p>
        <ThemePicker key={`picker-${candidate}`} selected={candidate} />
        <ThemeApplyForm key={`apply-${candidate}`} theme={candidate} published={data.published && !!entitlement?.active} />
      </div>
    </div>
    <SaveTheDate wedding={{ ...toWedding(data, "/dashboard/photo"), theme: candidate }} homeHref={`/dashboard/preview?theme=${candidate}`} detailsHref={data.details_enabled ? `/dashboard/preview/details?theme=${candidate}` : undefined} />
  </>;
}
