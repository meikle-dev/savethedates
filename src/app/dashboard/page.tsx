import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/account/actions";
import { DraftForm } from "@/features/workspace/draft-form";
import { draftSchema } from "@/features/workspace/validation";
import { PublicationForm } from "@/features/workspace/publication-form";

import { ThemePicker } from "@/features/workspace/theme-picker";
import { DetailsForm } from "@/features/workspace/details-form";
import { detailsSchema } from "@/features/weddings/details";
import { RsvpManager } from "@/features/workspace/rsvp-manager";
import type { OwnerInvitation, SharedResponse } from "@/features/weddings/rsvp";
import type { Entitlement } from "@/features/payments/purchase-panel";
import { parsePhotoFraming } from "@/features/weddings/photo-framing";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ signout?: string; checkout?: string }> }) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/account/sign-in");
  const { data, error } = await client.from("weddings").select("id, first_name, second_name, wedding_date, location, message, slug, published, first_published_at, photo_path, photo_framing, theme, details_enabled, ceremony_time, ceremony_venue, ceremony_address, ceremony_url, reception_time, reception_venue, reception_address, reception_url, travel, travel_url, accommodation, accommodation_url, dress_code, faqs, rsvp_enabled, rsvp_closes_on, rsvp_share_secret").eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load wedding workspace.");
  const invitationResult = data
    ? await client.from("rsvp_invitations").select("id, invite_name, responding_name, attending, responded_at, revoked_at").eq("wedding_id", data.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (invitationResult.error) throw new Error("Unable to load RSVP responses.");
  const sharedResult = data
    ? await client.from("shared_rsvp_responses").select("id, responding_name, attending, responded_at").eq("wedding_id", data.id).order("responded_at", { ascending: false })
    : { data: [], error: null };
  if (sharedResult.error) throw new Error("Unable to load shared RSVP responses.");
  const entitlementResult = data
    ? await client.rpc("owner_entitlement").maybeSingle<Entitlement>()
    : { data: null, error: null };
  if (entitlementResult.error) throw new Error("Unable to load publication entitlement.");
  const entitlement = entitlementResult.data ?? { active: false, expires_at: null, revoked_reason: null };
  const publiclyAvailable = !!data?.published && entitlement.active;
  const draft = data ? draftSchema.parse(data) : { first_name: "", second_name: "", wedding_date: "", location: "", message: "" };
  const params = await searchParams;
  return <div className="platform min-h-svh">
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-7 md:px-10">
      <Link href="/" className="brand">SaveTheDates<span aria-hidden="true">.</span></Link>
      <form action={signOut}><button className="text-link min-h-11 px-2 text-sm">Sign out</button></form>
    </header>
    <main className="mx-auto max-w-4xl px-6 pt-8 pb-20 md:pt-14">
      <div className="flex flex-wrap items-center gap-3"><p className="eyebrow">Your wedding workspace</p><span aria-live="polite" className="draft-badge">{publiclyAvailable ? "Published" : "Private draft"}</span></div>
      <h1 className="editorial mt-5 text-4xl leading-tight md:text-6xl">Start with your story.</h1>
      <p className="mt-5 max-w-xl leading-relaxed text-[var(--muted)]">A few details, a date to remember. Save your first chapter here and come back whenever you like.</p>
      {params.signout && <p role="alert" className="form-error mt-5">We couldn’t sign you out. Please try again.</p>}
      <section aria-labelledby="draft-title" className="mt-10 border-t border-[var(--line)] pt-8">
        <h2 id="draft-title" className="text-xl font-medium">The two of you</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{publiclyAvailable ? "Your site is public. Saving details or changing your photo updates it immediately." : "Only you can access this draft. It isn’t shared with guests."}</p>
        <DraftForm initial={draft} published={publiclyAvailable} />
      </section>
      {data && <section aria-labelledby="theme-title" className="mt-10 border-t border-[var(--line)] pt-8"><h2 id="theme-title" className="text-xl font-medium">Your wedding style</h2><p className="mt-2 text-sm leading-relaxed">Try a theme privately before applying it to your site.</p><ThemePicker key={data.theme} selected={data.theme} /></section>}
      {data && <section aria-labelledby="details-title" className="mt-10 border-t border-[var(--line)] pt-8"><h2 id="details-title" className="text-xl font-medium">Wedding Details</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Share only the practical information your guests need. Empty sections won’t appear.</p><DetailsForm initial={detailsSchema.parse(data)} published={publiclyAvailable} /></section>}
      {data && <section aria-labelledby="rsvp-title" className="mt-10 border-t border-[var(--line)] pt-8"><h2 id="rsvp-title" className="text-xl font-medium">RSVP</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Share one private link with all guests, then see their named responses here.</p><RsvpManager enabled={data.rsvp_enabled} closesOn={data.rsvp_closes_on} slug={data.slug} shareSecret={data.rsvp_share_secret} invitations={(invitationResult.data ?? []) as OwnerInvitation[]} sharedResponses={(sharedResult.data ?? []) as SharedResponse[]} /></section>}
      {data ? <PublicationForm slug={data.slug} published={publiclyAvailable} photo={!!data.photo_path} photoFraming={parsePhotoFraming(data.photo_framing)} theme={data.theme} locked={!!data.first_published_at} entitlement={entitlement} checkout={params.checkout} /> : <aside className="mt-12 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold">What comes next?</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">Save your details to add a photo, preview your site and choose a URL to share.</p>
      </aside>}
    </main>
  </div>;
}
