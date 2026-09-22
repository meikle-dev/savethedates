import { formatWeddingDate, type Wedding } from "./wedding";
import { WeddingPhoto } from "./wedding-photo";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { OliveBranch } from "./wedding-art";
import { resolvePhotoFrame } from "./photo-framing";

export function SaveTheDate({ wedding, homeHref = "/", detailsHref, rsvpHref }: { wedding: Wedding; homeHref?: string; detailsHref?: string; rsvpHref?: string }) {
  const theme = wedding.theme ?? "minimal";
  return <WeddingFrame theme={theme} className="announcement-shell">
    <WeddingHeader names={wedding.names} homeHref={homeHref} detailsHref={detailsHref} rsvpHref={rsvpHref} current="home" />
    <main id="main" className="wedding-hero">
      <WeddingPhoto key={wedding.image?.src} image={wedding.image} frame={resolvePhotoFrame(wedding.photoFraming, theme, "saveTheDate")} />
      <div className="wedding-announcement">
        <p className="wedding-kicker">A beautiful beginning</p>
        <h1 className="editorial"><span>Save</span><span><em>the</em> Date</span></h1>
        <div className="announcement-rule" aria-hidden="true" />
        <p className="wedding-date"><time dateTime={wedding.date}>{formatWeddingDate(wedding.date)}</time></p>
        <p className="wedding-location">{wedding.location}</p>
        {wedding.message && <p className="wedding-message">{wedding.message}</p>}
        <OliveBranch className="announcement-sprig" />
      </div>
    </main>
    <WeddingFooter names={wedding.names} />
  </WeddingFrame>;
}
