import type { Metadata } from "next";
import Link from "next/link";
import { GuestResponses } from "@/features/workspace/guest-responses";
import { loadResponses } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";
import { collectResponses, responseTotals } from "@/features/workspace/workspace-summary";

export const metadata: Metadata = { title: "Guests · SaveTheDates" };

export default async function Guests() {
  const { invitations, sharedResponses } = await loadResponses();
  const totals = responseTotals(collectResponses(sharedResponses, invitations));
  return <WorkspacePage id="guests-title" eyebrow="Guests" title="Who’s coming" intro={<>Everyone who has replied, with private corrections if plans change. Share your link from the <Link href="/dashboard/rsvp" className="text-link">RSVP section</Link>.</>}>
    <div className="ws-stack">
      <div className="rsvp-summary" role="group" aria-label="RSVP summary"><div><strong>{totals.total}</strong><span>Responses</span></div><div><strong>{totals.attending}</strong><span>Attending</span></div><div><strong>{totals.declined}</strong><span>Not attending</span></div></div>
      <GuestResponses invitations={invitations} sharedResponses={sharedResponses} />
    </div>
  </WorkspacePage>;
}
