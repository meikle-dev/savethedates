import type { GuestHrefs } from "@/features/weddings/guest-link";
import type { WeddingTheme } from "@/features/weddings/themes";
import { SaveTheDate } from "@/features/weddings/save-the-date";
import { InvitationPageView } from "@/features/weddings/invitation-view";
import { WeddingDetailsPageView } from "@/features/weddings/wedding-details";
import { RsvpPage } from "@/features/weddings/rsvp-page";
import { exampleDetails, exampleInvitation, exampleMealMenu, exampleRsvpClosesOn, exampleWedding } from "./example-data";

// The fictional example pages, shared by /examples/<theme> and the phones on /what-we-offer. `base` is the example's
// Save the Date path; the other pages sit under it, as on a real guest link.
export type ExamplePageName = "save-the-date" | "invitation" | "details" | "rsvp";
export const examplePageNames: ExamplePageName[] = ["save-the-date", "invitation", "details", "rsvp"];

export function exampleHrefs(base: string): GuestHrefs {
  return { home: base, invitation: `${base}/invitation`, details: `${base}/details`, rsvp: `${base}/rsvp` };
}

/** Example RSVP note; nothing is sent, because the page has no guest secret. */
export const exampleRsvpNote = "Example only. Nothing you enter here is sent or saved.";

export function ExamplePage({ theme, page, base }: { theme: WeddingTheme; page: ExamplePageName; base: string }) {
  const hrefs = exampleHrefs(base);
  const wedding = exampleWedding(theme);
  if (page === "invitation") return <InvitationPageView invitation={exampleInvitation(theme)} homeHref={hrefs.home} invitationHref={hrefs.invitation} detailsHref={hrefs.details}
    reply={{ href: hrefs.rsvp, open: true, closesOn: exampleRsvpClosesOn }} />;
  if (page === "details") return <WeddingDetailsPageView details={exampleDetails(theme)} image={wedding.image} photoFraming={wedding.photoFraming} homeHref={hrefs.home} invitationHref={hrefs.invitation} detailsHref={hrefs.details} rsvpHref={hrefs.rsvp} photoLabel="Your photo here" />;
  // With no secret the RSVP is in preview mode: the form can be filled in but never submits, and nothing is saved.
  if (page === "rsvp") return <RsvpPage
    wedding={{ first_name: "Olivia", second_name: "James", theme, details_enabled: true, rsvp_enabled: true, invitation_enabled: true }}
    hrefs={hrefs} open closesOn={exampleRsvpClosesOn} secret={null} menu={exampleMealMenu} previewNote={exampleRsvpNote} />;
  return <SaveTheDate wedding={wedding} homeHref={hrefs.home} invitationHref={hrefs.invitation} detailsHref={hrefs.details} rsvpHref={hrefs.rsvp} photoLabel="Your photo here" />;
}
