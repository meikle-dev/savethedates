import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RsvpPage } from "@/features/weddings/rsvp-page";
import { isWeddingTheme } from "@/features/weddings/themes";

export default async function RsvpPreview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, theme, details_enabled, rsvp_enabled").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load RSVP preview.");
  if (!data) redirect("/dashboard");
  const params = await searchParams;
  const theme = isWeddingTheme(params.theme) ? params.theme : data.theme;
  const query = `?theme=${theme}`;
  return <>
    <div className="platform px-6 py-5"><nav aria-label="Preview" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm"><span>Private RSVP preview · saved content · no responses are saved</span><Link href="/dashboard#rsvp-title" className="text-link min-h-11 content-center">Back to workspace</Link></nav></div>
    <RsvpPage wedding={{ ...data, theme }} guest={null} slug="" token={null} previewHrefs={{ home: `/dashboard/preview${query}`, details: `/dashboard/preview/details${query}`, rsvp: `/dashboard/preview/rsvp${query}` }} />
  </>;
}
