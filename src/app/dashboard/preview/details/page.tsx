import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { detailsSchema } from "@/features/weddings/details";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";
import { isWeddingTheme } from "@/features/weddings/themes";
import { createClient } from "@/lib/supabase/server";
import { parsePhotoFraming } from "@/features/weddings/photo-framing";
import { PreviewToolbar } from "@/features/workspace/preview-toolbar";
import { linkNavigation, previewHrefs } from "@/features/weddings/guest-link";

export const metadata: Metadata = { title: "Details preview | SaveTheDates" };

export default async function DetailsPreview({ searchParams }: { searchParams: Promise<{ theme?: string; link?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, theme, published, photo_path, photo_framing, details_enabled, invitation_enabled, rsvp_enabled, ceremony_time, ceremony_venue, ceremony_address, ceremony_url, reception_time, reception_venue, reception_address, reception_url, travel, travel_url, accommodation, accommodation_url, dress_code, faqs").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load Details preview.");
  if (!data) redirect("/dashboard");
  const { data: entitlement } = await client.rpc("owner_entitlement").maybeSingle<{ active: boolean }>();
  const params = await searchParams;
  const theme = isWeddingTheme(params.theme) ? params.theme : data.theme;
  // Opened from the Invitation preview, Details keeps the Invitation link's navigation; otherwise the Save the Date link's.
  const link = params.link === "invitation" ? "invitation" : "save_the_date";
  const hrefs = previewHrefs(theme, link);
  const details = { ...detailsSchema.parse(data), first_name: data.first_name, second_name: data.second_name, theme };
  return <>
    <PreviewToolbar label="Details" note={data.details_enabled ? undefined : "hidden from guests"} path="/dashboard/preview/details" backHref="/dashboard/details" link={link} theme={theme} savedTheme={data.theme} published={data.published && !!entitlement?.active} />
    <WeddingDetailsPageView details={details} image={data.photo_path ? { src: "/dashboard/photo", alt: "" } : undefined} photoFraming={parsePhotoFraming(data.photo_framing)} {...linkNavigation(link, { ...data, invitation_enabled: data.invitation_enabled || link === "invitation" }, hrefs)} detailsHref={hrefs.details} previewEmpty />
  </>;
}
