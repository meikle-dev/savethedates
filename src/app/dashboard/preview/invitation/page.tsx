import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { invitationSchema } from "@/features/weddings/invitation";
import { InvitationPageView } from "@/features/weddings/invitation-view";
import { isWeddingTheme } from "@/features/weddings/themes";
import { PreviewToolbar } from "@/features/workspace/preview-toolbar";
import { todayUtc } from "@/features/workspace/workspace-summary";

export const metadata: Metadata = { title: "Invitation preview | SaveTheDates" };

export default async function InvitationPreview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, wedding_date, location, theme, published, details_enabled, rsvp_enabled, rsvp_closes_on, invitation_enabled, invitation_host_line, invitation_wording, invitation_afterwards, ceremony_time, ceremony_venue, ceremony_address").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load Invitation preview.");
  if (!data) redirect("/dashboard");
  const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
  const params = await searchParams;
  const theme = isWeddingTheme(params.theme) ? params.theme : data.theme;
  const query = `?theme=${theme}`;
  const { invitation_enabled, ...invitation } = invitationSchema.parse(data);
  // Mirror the guest page: the reply section follows RSVP settings, and closes after the closing date (UTC).
  const reply = data.rsvp_enabled
    ? { href: `/dashboard/preview/rsvp${query}`, open: !(data.rsvp_closes_on && todayUtc() > data.rsvp_closes_on), closesOn: data.rsvp_closes_on }
    : undefined;
  return <>
    <PreviewToolbar label="Invitation" note={invitation_enabled ? undefined : "hidden from guests"} path="/dashboard/preview/invitation" backHref="/dashboard/invitation" theme={theme} savedTheme={data.theme} published={data.published && !!entitlement?.active} />
    <InvitationPageView
      invitation={{ ...invitation, first_name: data.first_name, second_name: data.second_name, wedding_date: data.wedding_date, location: data.location, theme }}
      homeHref={`/dashboard/preview${query}`} invitationHref={`/dashboard/preview/invitation${query}`}
      detailsHref={data.details_enabled ? `/dashboard/preview/details${query}` : undefined} reply={reply} rsvpHref={`/dashboard/preview/rsvp${query}`} />
  </>;
}
