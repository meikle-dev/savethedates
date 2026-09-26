import type { Metadata } from "next";
import { invitationSchema } from "@/features/weddings/invitation";
import { InvitationForm } from "@/features/workspace/invitation-form";
import { requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Invitation · SaveTheDates" };

export default async function Invitation() {
  const { wedding, live } = await requireWedding();
  return <WorkspacePage id="invitation-title" eyebrow="Invitation" title="Wedding Invitation" intro="An optional invitation page with its own link, sent separately from your Save the Date. Switch it on when you’re ready to invite them.">
    <div className="ws-panel"><InvitationForm initial={invitationSchema.parse(wedding)} published={live} rsvpOn={wedding.rsvp_enabled} /></div>
  </WorkspacePage>;
}
