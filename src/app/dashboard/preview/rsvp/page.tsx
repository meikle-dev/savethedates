import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RsvpPage } from "@/features/weddings/rsvp-page";
import { isWeddingTheme, themes } from "@/features/weddings/themes";
import { ThemeApplyForm } from "@/features/workspace/theme-apply-form";

export default async function RsvpPreview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, theme, details_enabled, rsvp_enabled, published").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load RSVP preview.");
  if (!data) redirect("/dashboard");
  const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
  const params = await searchParams;
  const theme = isWeddingTheme(params.theme) ? params.theme : data.theme;
  const query = `?theme=${theme}`;
  return <>
    <div className="platform px-6 py-5"><nav aria-label="Preview" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm"><span>Private RSVP preview · saved content · no responses are saved</span><Link href="/dashboard#rsvp-title" className="text-link min-h-11 content-center">Back to workspace</Link></nav></div>
    <div className="platform mx-auto max-w-5xl px-6 pb-5">
      <nav aria-label="RSVP designs" className="flex flex-wrap gap-2">
        {themes.map((option) => <Link key={option.id} href={`/dashboard/preview/rsvp?theme=${option.id}`} aria-current={theme === option.id ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded border px-4 text-sm ${theme === option.id ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]"}`}>{option.name}</Link>)}
      </nav>
      <p className="mt-3 text-sm">{theme === data.theme ? "Your current wedding theme." : "Preview only — this theme has not been applied."} Your theme styles Save the Date, Details and RSVP together.</p>
    </div>
    <RsvpPage key={theme} wedding={{ ...data, theme }} guest={null} slug="" token={null} previewHrefs={{ home: `/dashboard/preview${query}`, details: `/dashboard/preview/details${query}`, rsvp: `/dashboard/preview/rsvp${query}` }} />
    <section aria-label="Apply wedding theme" className="platform mx-auto max-w-5xl px-6 pb-8"><ThemeApplyForm key={theme} theme={theme} published={data.published && !!entitlement?.active} /></section>
  </>;
}
