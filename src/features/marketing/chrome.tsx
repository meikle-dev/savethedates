import Link from "next/link";
import { digitalSaveTheDatePath, supportEmail, whatWeOfferPath } from "./metadata";

export function AccountAction({ href, label }: { href: string; label: string }) {
  return <Link className="marketing-button marketing-button-primary" href={href}>
    <span className="marketing-button-label">{label}</span>
    <span className="marketing-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5 19 19 5M7 5h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  </Link>;
}

export function PricingPanel({ id, accountHref, label }: { id?: string; accountHref: string; label: string }) {
  return <div id={id} className="marketing-pricing"><div><p className="marketing-kicker">EVERYTHING YOU NEED. ONE SIMPLE PRICE.</p><h2>Your whole wedding website.</h2><p className="price">£19 <span>GBP · one time</span></p><p>Build and preview for free. Pay once when you’re ready to publish. No subscription.</p></div><ul><li>All twelve wedding website designs, with a photo of your choice</li><li>Save the Date and wedding invitation</li><li>Wedding details: times, venues, travel, where to stay and FAQs</li><li>Online RSVPs with meal choices</li><li>Dietary requirements collected with each RSVP</li><li>Private links for your Save the Date and Invitation</li><li>Private guest list, attendance totals and catering numbers</li><li>Published until six months after your wedding date*</li></ul><div className="pricing-action"><AccountAction href={accountHref} label={label} /><p>Make something worth sharing.</p></div><p className="pricing-footnote">*Based on the wedding date at checkout. Your expiry date is fixed when you start checkout.</p></div>;
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** `sectionBase` is "" on the homepage (in-page anchors) and "/" elsewhere. */
export function MarketingHeader({ isAuthenticated, sectionBase }: { isAuthenticated: boolean; sectionBase: "" | "/" }) {
  return <header className="marketing-nav marketing-width">
    <Link className="marketing-brand" href="/">SaveTheDates<span aria-hidden="true">FOR YOUR NEXT CHAPTER</span></Link>
    <nav aria-label="Main navigation"><Link href={whatWeOfferPath}>What we offer</Link><a href={`${sectionBase}#themes`}>Designs</a><a href={`${sectionBase}#pricing`}>Pricing</a><Link className="nav-signin" href={isAuthenticated ? "/dashboard" : "/account/sign-in"}>{isAuthenticated ? "Your workspace" : "Sign in"} <span aria-hidden="true">↗</span></Link></nav>
  </header>;
}

export function MarketingFooter({ isAuthenticated, sectionBase }: { isAuthenticated: boolean; sectionBase: "" | "/" }) {
  return <footer className="marketing-footer marketing-width"><Link className="marketing-brand" href="/">SaveTheDates</Link><p>A beautiful beginning, shared.</p><nav aria-label="Footer navigation"><Link href={whatWeOfferPath}>What we offer</Link><a href={`${sectionBase}#themes`}>Designs</a><a href={`${sectionBase}#pricing`}>Pricing</a><Link href={digitalSaveTheDatePath}>Digital save the dates</Link><Link href={isAuthenticated ? "/dashboard" : "/account/sign-in"}>{isAuthenticated ? "Your workspace" : "Sign in"}</Link></nav>
    <nav className="marketing-legal-nav" aria-label="Legal and contact"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refunds">Refunds</Link><a href={`mailto:${supportEmail}`}>Contact: {supportEmail}</a></nav></footer>;
}
