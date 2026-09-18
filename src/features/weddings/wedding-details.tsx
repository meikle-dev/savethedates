import type { WeddingDetailsPage } from "./details";
import { hasVenue } from "./details";
import { WeddingNavigation } from "./wedding-navigation";

function Venue({ title, details, kind }: { title: string; details: WeddingDetailsPage; kind: "ceremony" | "reception" }) {
  if (!hasVenue(details, kind)) return null;
  const time = details[`${kind}_time`];
  const venue = details[`${kind}_venue`];
  const address = details[`${kind}_address`];
  const url = details[`${kind}_url`];
  return <section className="details-card">
    <p className="details-kicker">The day</p>
    <h2>{title}</h2>
    {time && <p className="details-emphasis">{time}</p>}
    {venue && <p>{venue}</p>}
    {address && <p className="whitespace-pre-line">{address}</p>}
    {url && <a href={url} className="details-link" rel="noreferrer">Directions</a>}
  </section>;
}

function Guidance({ title, text, url, linkLabel }: { title: string; text: string; url?: string; linkLabel?: string }) {
  if (!text && !url) return null;
  return <section className="details-card">
    <h2>{title}</h2>
    {text && <p className="whitespace-pre-line">{text}</p>}
    {url && <a href={url} className="details-link" rel="noreferrer">{linkLabel}</a>}
  </section>;
}

export function WeddingDetailsPageView({ details, homeHref, detailsHref, previewEmpty = false }: { details: WeddingDetailsPage; homeHref: string; detailsHref: string; previewEmpty?: boolean }) {
  const hasContent = hasVenue(details, "ceremony") || hasVenue(details, "reception") || details.travel || details.travel_url || details.accommodation || details.accommodation_url || details.dress_code || details.faqs.length;
  return <div data-theme={details.theme} className="wedding-shell details-shell mx-auto min-h-svh max-w-[1100px]">
    <header className="details-header px-6 pt-8 md:px-12 md:pt-11">
      <p className="couple-names text-xs leading-loose font-medium uppercase md:text-sm">{details.first_name} <span aria-hidden="true">&amp;</span> {details.second_name}</p>
      <WeddingNavigation homeHref={homeHref} detailsHref={detailsHref} current="details" />
    </header>
    <main id="main" className="px-6 py-14 md:px-12 md:py-20">
      <div className="details-intro">
        <p className="details-kicker">Everything you need to know</p>
        <h1 className="editorial">Wedding details</h1>
        <p>We can’t wait to celebrate with you.</p>
      </div>
      {!hasContent && previewEmpty && <p className="details-empty">No details have been saved yet. Return to your workspace to add the information your guests will need.</p>}
      <div className="details-grid">
        <Venue title="Ceremony" details={details} kind="ceremony" />
        <Venue title="Reception" details={details} kind="reception" />
        <Guidance title="Travel & transport" text={details.travel} url={details.travel_url} linkLabel="Travel information" />
        <Guidance title="Accommodation" text={details.accommodation} url={details.accommodation_url} linkLabel="Accommodation information" />
        <Guidance title="Dress code" text={details.dress_code} />
        {details.faqs.length > 0 && <section className="details-card details-faqs">
          <h2>Questions & answers</h2>
          <dl>{details.faqs.map((faq, index) => <div key={index}><dt>{faq.question}</dt><dd className="whitespace-pre-line">{faq.answer}</dd></div>)}</dl>
        </section>}
      </div>
    </main>
    <footer className="details-footer px-6 py-9 text-center"><p className="editorial text-lg">{details.first_name} &amp; {details.second_name}</p></footer>
  </div>;
}
