import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { toWedding } from "@/features/weddings/published";

import { isWeddingTheme } from "@/features/weddings/themes";
import { PreviewToolbar } from "@/features/workspace/preview-toolbar";
import { todayUtc } from "@/features/workspace/workspace-summary";

export const metadata: Metadata = { title: "Save the Date preview | SaveTheDates" };

export default async function Preview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, wedding_date, location, message, photo_path, photo_framing, theme, published, details_enabled, rsvp_enabled, rsvp_closes_on").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load preview.");
  if (!data) redirect("/dashboard");
  const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
  const params = await searchParams;
  const candidate = isWeddingTheme(params.theme) ? params.theme : data.theme;
  // Show the RSVP action as guests would see it once live: RSVP on and the closing date not passed. It opens the
  // preview RSVP page, which never submits.
  const replyOpen = data.rsvp_enabled && !(data.rsvp_closes_on && todayUtc() > data.rsvp_closes_on);
  return <>
    <PreviewToolbar label="Save the Date" path="/dashboard/preview" backHref="/dashboard" theme={candidate} savedTheme={data.theme} published={data.published && !!entitlement?.active} />
    <SaveTheDate wedding={{ ...toWedding(data, "/dashboard/photo"), theme: candidate }} homeHref={`/dashboard/preview?theme=${candidate}`} detailsHref={data.details_enabled ? `/dashboard/preview/details?theme=${candidate}` : undefined} rsvpHref={`/dashboard/preview/rsvp?theme=${candidate}`} reply={replyOpen ? { href: `/dashboard/preview/rsvp?theme=${candidate}`, closesOn: data.rsvp_closes_on } : undefined} />
  </>;
}
