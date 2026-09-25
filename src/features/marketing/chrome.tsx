import Link from "next/link";
import { digitalSaveTheDatePath, supportEmail } from "./metadata";

export function AccountAction({ href, label }: { href: string; label: string }) {
  return <Link className="marketing-button marketing-button-primary" href={href}>
    <span className="marketing-button-label">{label}</span>
    <span className="marketing-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5 19 19 5M7 5h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  </Link>;
}

export function PricingPanel({ id, accountHref, label }: { id?: string; accountHref: string; label: string }) {
  return <div id={id} className="marketing-pricing"><div><p className="marketing-kicker">ONE WEDDING. ONE SIMPLE PRICE.</p><h2>Everything for your day.</h2><p className="price">£29 <span>GBP · one time</span></p><p>No subscription. Draft and preview for free.</p></div><ul><li>All twelve themes, with a photo of your choice</li><li>Save the Date, Details and RSVP pages</li><li>One private guest link for all your guests</li><li>A private response list and attendance totals</li><li>Published until six months after your wedding date*</li></ul><div className="pricing-action"><AccountAction href={accountHref} label={label} /><p>Make something worth sharing.</p></div><p className="pricing-footnote">*Based on the wedding date at checkout. Your expiry date is fixed when you start checkout.</p></div>;
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** `sectionBase` is "" on the homepage (in-page anchors) and "/" elsewhere. */
export function MarketingHeader({ isAuthenticated, sectionBase }: { isAuthenticated: boolean; sectionBase: "" | "/" }) {
  return <header className="marketing-nav marketing-width">
    <Link className="marketing-brand" href="/">SaveTheDates<span aria-hidden="true">FOR YOUR NEXT CHAPTER</span></Link>
    <nav aria-label="Main navigation"><a href={`${sectionBase}#themes`}>Themes</a><a href={`${sectionBase}#pricing`}>Pricing</a><Link className="nav-signin" href={isAuthenticated ? "/dashboard" : "/account/sign-in"}>{isAuthenticated ? "Your workspace" : "Sign in"} <span aria-hidden="true">↗</span></Link></nav>
  </header>;
}

export function MarketingFooter({ isAuthenticated, sectionBase }: { isAuthenticated: boolean; sectionBase: "" | "/" }) {
  return <footer className="marketing-footer marketing-width"><Link className="marketing-brand" href="/">SaveTheDates</Link><p>A beautiful beginning, shared.</p><nav aria-label="Footer navigation"><a href={`${sectionBase}#themes`}>Themes</a><a href={`${sectionBase}#pricing`}>Pricing</a><Link href={digitalSaveTheDatePath}>Digital save the dates</Link><Link href={isAuthenticated ? "/dashboard" : "/account/sign-in"}>{isAuthenticated ? "Your workspace" : "Sign in"}</Link></nav>
    <nav className="marketing-legal-nav" aria-label="Legal and contact"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refunds">Refunds</Link><a href={`mailto:${supportEmail}`}>Contact: {supportEmail}</a></nav></footer>;
}
