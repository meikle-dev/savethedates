import Link from "next/link";
import { formatWeddingDate, rsvpDeadline, type Wedding } from "./wedding";
import { WeddingPhoto } from "./wedding-photo";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";
import { resolvePhotoFrame } from "./photo-framing";

// `reply` is passed only while guests can reply (the database's rsvp_open), with the projected closing date if any.
export function SaveTheDate({ wedding, homeHref = "/", detailsHref, rsvpHref, reply, photoLabel }: { wedding: Wedding; homeHref?: string; detailsHref?: string; rsvpHref?: string; reply?: { href: string; closesOn: string | null }; photoLabel?: string }) {
  const theme = wedding.theme ?? "minimal";
  const replyBy = reply?.closesOn ? rsvpDeadline(reply.closesOn).date : null;
  return <WeddingFrame theme={theme} className="announcement-shell">
    <WeddingHeader names={wedding.names} homeHref={homeHref} detailsHref={detailsHref} rsvpHref={rsvpHref} current="home" />
    <main id="main" className="wedding-hero">
      <WeddingPhoto key={wedding.image?.src} image={wedding.image} frame={resolvePhotoFrame(wedding.photoFraming, theme, "saveTheDate")} label={photoLabel} />
      <div className="wedding-announcement">
        <p className="wedding-kicker">A beautiful beginning</p>
        <h1 className="editorial"><span>Save</span><span><em>the</em> Date</span></h1>
        <div className="announcement-rule" aria-hidden="true" />
        <p className="wedding-date"><time dateTime={wedding.date}>{formatWeddingDate(wedding.date)}</time></p>
        <p className="wedding-location">{wedding.location}</p>
        {wedding.message && <p className="wedding-message">{wedding.message}</p>}
        {reply && <p className="announcement-reply"><Link href={reply.href}>RSVP now</Link>{replyBy && <small>Please reply by {replyBy} (23:59 UTC)</small>}</p>}
        <BotanicalArt className="announcement-sprig" />
      </div>
    </main>
    <WeddingFooter names={wedding.names} />
  </WeddingFrame>;
}
