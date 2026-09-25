import { formatWeddingDate, type Wedding } from "./wedding";
import { WeddingPhoto } from "./wedding-photo";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { BotanicalArt } from "./wedding-art";
import { resolvePhotoFrame } from "./photo-framing";

export function SaveTheDate({ wedding, homeHref = "/", invitationHref, detailsHref, rsvpHref, photoLabel }: { wedding: Wedding; homeHref?: string; invitationHref?: string; detailsHref?: string; rsvpHref?: string; photoLabel?: string }) {
  const theme = wedding.theme ?? "minimal";
  return <WeddingFrame theme={theme} className="announcement-shell">
    <WeddingHeader names={wedding.names} homeHref={homeHref} invitationHref={invitationHref} detailsHref={detailsHref} rsvpHref={rsvpHref} current="home" />
    <main id="main" className="wedding-hero">
      <WeddingPhoto key={wedding.image?.src} image={wedding.image} frame={resolvePhotoFrame(wedding.photoFraming, theme, "saveTheDate")} label={photoLabel} />
      <div className="wedding-announcement">
        <p className="wedding-kicker">A beautiful beginning</p>
        <h1 className="editorial"><span>Save</span><span><em>the</em> Date</span></h1>
        <div className="announcement-rule" aria-hidden="true" />
        <p className="wedding-date"><time dateTime={wedding.date}>{formatWeddingDate(wedding.date)}</time></p>
        <p className="wedding-location">{wedding.location}</p>
        {wedding.message && <p className="wedding-message">{wedding.message}</p>}
        <BotanicalArt className="announcement-sprig" />
      </div>
    </main>
    <WeddingFooter names={wedding.names} />
  </WeddingFrame>;
}
