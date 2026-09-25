import Link from "next/link";
import { formatInvitationDate, invitationPlace, standardInvitationWording, type InvitationPage } from "./invitation";
import { rsvpDeadline } from "./wedding";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";

type Reply = { href: string; open: boolean; closesOn: string | null };

// A formal card inside each theme's RSVP surround (rsvp-shell, rsvp-main, rsvp-card), so every theme's backdrop and
// paper card apply. `reply` is present only while RSVPs are on; the invitation never opens them.
export function InvitationPageView({ invitation, homeHref, invitationHref, detailsHref, reply }: {
  invitation: InvitationPage; homeHref: string; invitationHref: string; detailsHref?: string; reply?: Reply;
}) {
  const names = [invitation.first_name, invitation.second_name] as const;
  const place = invitationPlace(invitation);
  const deadline = reply?.closesOn ? rsvpDeadline(reply.closesOn) : null;
  return <WeddingFrame theme={invitation.theme} className="details-shell rsvp-shell invitation-shell">
    <WeddingHeader names={names} homeHref={homeHref} invitationHref={invitationHref} detailsHref={detailsHref} rsvpHref={reply?.href} current="invitation" />
    <main id="main" className="rsvp-main">
      <div className="rsvp-intro">
        <div className="rsvp-intro-art" aria-hidden="true"><BotanicalArt /></div>
        <span className="rsvp-ornament" aria-hidden="true">♥</span>
        <p className="details-kicker">You’re invited</p>
      </div>
      <article className="rsvp-card invitation-card" aria-labelledby="invitation-names">
        <div className="rsvp-card-art"><BotanicalArt /></div>
        {invitation.invitation_host_line && <p className="invitation-host">{invitation.invitation_host_line}</p>}
        <h1 id="invitation-names" className="invitation-names"><span>{names[0]}</span><span className="invitation-ampersand">&amp;</span><span>{names[1]}</span></h1>
        <p className="invitation-wording">{invitation.invitation_wording || standardInvitationWording}</p>
        <div className="invitation-rule" aria-hidden="true" />
        <p className="invitation-date"><time dateTime={invitation.wedding_date}>{formatInvitationDate(invitation.wedding_date)}</time></p>
        {invitation.ceremony_time && <p className="invitation-time">{invitation.ceremony_time}</p>}
        {invitation.ceremony_venue && <p className="invitation-venue">{invitation.ceremony_venue}</p>}
        {place && <p className="invitation-place">{place}</p>}
        {invitation.invitation_afterwards && <p className="invitation-afterwards">{invitation.invitation_afterwards}</p>}
        {reply && <div className="invitation-reply">
          {reply.open ? <>
            <p>{deadline ? `Kindly reply by ${deadline.date}` : "Kindly reply online"}</p>
            <Link href={reply.href} className="rsvp-submit">Reply online<span aria-hidden="true">→</span></Link>
          </> : <p>Replies have now closed. Contact the couple if your plans have changed.</p>}
        </div>}
        {/* Inside the card, whose colours every theme sets for reading; the surround can be dark or photographic. */}
        {detailsHref && <p className="invitation-more"><Link href={detailsHref} className="rsvp-next-link">Travel, accommodation and more</Link></p>}
      </article>
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}
