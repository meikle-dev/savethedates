import type { WeddingDetailsPage } from "./details";
import { hasVenue } from "./details";
import { WeddingFrame, WeddingHeader, WeddingFooter } from "./wedding-frame";
import { WeddingPhoto } from "./wedding-photo";
import { OliveBranch, WeddingIcon, type WeddingIconKind } from "./wedding-art";
import type { Wedding } from "./wedding";

function Venue({ title, details, kind }: { title: string; details: WeddingDetailsPage; kind: "ceremony" | "reception" }) {
  if (!hasVenue(details, kind)) return null;
  const time = details[`${kind}_time`];
  const venue = details[`${kind}_venue`];
  const address = details[`${kind}_address`];
  const url = details[`${kind}_url`];
  return <section className="details-card">
    <WeddingIcon kind={kind} />
    <h2>{title}</h2>
    {time && <p className="details-emphasis">{time}</p>}
    {venue && <p>{venue}</p>}
    {address && <p className="whitespace-pre-line">{address}</p>}
    {url && <a href={url} className="details-link" rel="noreferrer">Directions</a>}
    <div className="details-card-flourish" aria-hidden="true"><span>{kind === "ceremony" ? "The beginning of forever" : "A little joy. A lot of love."}</span></div>
  </section>;
}

function Guidance({ title, text, url, linkLabel, icon, caption }: { title: string; text: string; url?: string; linkLabel?: string; icon: WeddingIconKind; caption: string }) {
  if (!text && !url) return null;
  return <section className="details-card">
    <WeddingIcon kind={icon} />
    <h2>{title}</h2>
    {text && <p className="whitespace-pre-line">{text}</p>}
    {url && <a href={url} className="details-link" rel="noreferrer">{linkLabel}</a>}
    <div className="details-card-flourish" aria-hidden="true"><span>{caption}</span></div>
  </section>;
}

export function WeddingDetailsPageView({ details, image, homeHref, detailsHref, rsvpHref, previewEmpty = false }: { details: WeddingDetailsPage; image?: Wedding["image"]; homeHref: string; detailsHref: string; rsvpHref?: string; previewEmpty?: boolean }) {
  const hasContent = hasVenue(details, "ceremony") || hasVenue(details, "reception") || details.travel || details.travel_url || details.accommodation || details.accommodation_url || details.dress_code || details.faqs.length;
  const names = [details.first_name, details.second_name] as const;
  return <WeddingFrame theme={details.theme} className="details-shell">
    <WeddingHeader names={names} homeHref={homeHref} detailsHref={detailsHref} rsvpHref={rsvpHref} current="details" />
    <main id="main" className="details-layout">
      <div className="details-photo"><WeddingPhoto key={image?.src} image={image} /></div>
      <div className="details-content">
      <div className="details-intro">
        <OliveBranch />
        <p className="details-kicker">Everything you need to know</p>
        <h1 className="editorial">Wedding <em>details</em></h1>
        <p>We can’t wait to celebrate with you.</p>
      </div>
      {!hasContent && previewEmpty && <p className="details-empty">No details have been saved yet. Return to your workspace to add the information your guests will need.</p>}
      <div className="details-grid">
        <Venue title="Ceremony" details={details} kind="ceremony" />
        <Venue title="Reception" details={details} kind="reception" />
        <Guidance title="Travel & transport" text={details.travel} url={details.travel_url} linkLabel="Travel information" icon="travel" caption="The journey together" />
        <Guidance title="Accommodation" text={details.accommodation} url={details.accommodation_url} linkLabel="Accommodation information" icon="accommodation" caption="Stay a little longer" />
        <Guidance title="Dress code" text={details.dress_code} icon="dress" caption="Come as your wonderful self" />
        {details.faqs.length > 0 && <section className="details-card details-faqs">
          <WeddingIcon kind="questions" />
          <h2>Questions & answers</h2>
          <dl>{details.faqs.map((faq, index) => <div key={index}><dt>{faq.question}</dt><dd className="whitespace-pre-line">{faq.answer}</dd></div>)}</dl>
        </section>}
      </div>
      </div>
    </main>
    <WeddingFooter names={names} />
  </WeddingFrame>;
}
