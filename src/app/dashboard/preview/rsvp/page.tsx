import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RsvpPage } from "@/features/weddings/rsvp-page";
import { isWeddingTheme } from "@/features/weddings/themes";
import { PreviewToolbar } from "@/features/workspace/preview-toolbar";

export const metadata: Metadata = { title: "RSVP preview | SaveTheDates" };

export default async function RsvpPreview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, theme, details_enabled, rsvp_enabled, rsvp_closes_on, published").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load RSVP preview.");
  if (!data) redirect("/dashboard");
  const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
  const params = await searchParams;
  const theme = isWeddingTheme(params.theme) ? params.theme : data.theme;
  const query = `?theme=${theme}`;
  return <>
    <PreviewToolbar label="RSVP" note="no responses are saved" path="/dashboard/preview/rsvp" backHref="/dashboard/rsvp" theme={theme} savedTheme={data.theme} published={data.published && !!entitlement?.active} />
    <RsvpPage key={theme} wedding={{ first_name: data.first_name, second_name: data.second_name, details_enabled: data.details_enabled, rsvp_enabled: data.rsvp_enabled, theme }} open closesOn={data.rsvp_enabled ? data.rsvp_closes_on : null} secret={null} hrefs={{ home: `/dashboard/preview${query}`, details: `/dashboard/preview/details${query}`, rsvp: `/dashboard/preview/rsvp${query}` }} />
  </>;
}
