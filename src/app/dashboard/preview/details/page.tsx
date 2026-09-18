import Link from "next/link";
import { redirect } from "next/navigation";
import { detailsSchema } from "@/features/weddings/details";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";
import { isWeddingTheme } from "@/features/weddings/themes";
import { createClient } from "@/lib/supabase/server";

export default async function DetailsPreview({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("first_name, second_name, theme, details_enabled, ceremony_time, ceremony_venue, ceremony_address, ceremony_url, reception_time, reception_venue, reception_address, reception_url, travel, travel_url, accommodation, accommodation_url, dress_code, faqs").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load Details preview.");
  if (!data) redirect("/dashboard");
  const params = await searchParams;
  const theme = isWeddingTheme(params.theme) ? params.theme : data.theme;
  const query = `?theme=${theme}`;
  const details = { ...detailsSchema.parse(data), first_name: data.first_name, second_name: data.second_name, theme };
  return <>
    <div className="platform px-6 py-5"><nav aria-label="Preview" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm"><span>Private Details preview · saved content{data.details_enabled ? "" : " · hidden from guests"}</span><Link href="/dashboard" className="text-link min-h-11 content-center">Back to workspace</Link></nav></div>
    <WeddingDetailsPageView details={details} homeHref={`/dashboard/preview${query}`} detailsHref={`/dashboard/preview/details${query}`} previewEmpty />
  </>;
}
