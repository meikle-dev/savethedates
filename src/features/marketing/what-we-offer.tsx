import type { WeddingTheme } from "@/features/weddings/themes";
import { AccountAction, MarketingFooter, MarketingHeader, PricingPanel } from "./chrome";
import { OfferShowcase } from "./offer-showcase";

const extras = [
  ["Private links, ready to share", "Your Save the Date and your Invitation each get their own private link and a ready-written message, so you can send them months apart. There’s a link straight to RSVP too. Share on WhatsApp, copy into a text or email, or use your phone’s share menu."],
  ["Kept out of search results", "Your wedding pages are marked not to appear in search engines. Anyone with one of your links can open the pages it opens, so share them only with your guests."],
  ["Change anything, any time", "Saved changes appear on your published site straight away, so guests always see the latest. Close RSVPs or unpublish whenever you like."],
  ["One payment. No subscription.", "Build and preview for free. Pay £29 once to publish, and your site stays online until six months after your wedding."],
] as const;

// F070: one fictional wedding told in order, in the visitor's choice of design. All text is server-rendered; the
// theme switcher and the guest-to-couple demo add to it.
export function WhatWeOffer({ isAuthenticated = false, theme }: { isAuthenticated?: boolean; theme: WeddingTheme }) {
  const accountHref = isAuthenticated ? "/dashboard" : "/account/sign-up";
  const primaryAccountLabel = isAuthenticated ? "Return to your workspace" : "Start building for free";

  return <div className="platform marketing">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <MarketingHeader isAuthenticated={isAuthenticated} sectionBase="/" />
      <main id="main">
        <section className="marketing-width offer-hero" aria-labelledby="hero-title">
          <p className="marketing-kicker">What we offer</p>
          <h1 id="hero-title">Everything your guests need,<br /><em>in the design you love.</em></h1>
          <p className="hero-description">Follow one fictional wedding from Save the Date to final RSVP. Pick any of our twelve designs and every page changes with it. Then reply as a guest and watch the couple’s side update.</p>
          <div className="marketing-actions"><AccountAction href={accountHref} label={primaryAccountLabel} /><a className="marketing-button marketing-outline" href="#try-it">Try the RSVP</a></div>
          <p className="hero-note">Free to build and preview. £29 once when you’re ready to publish.</p>
        </section>
        <section id="showcase" className="offer-story" aria-labelledby="story-title">
          <div className="marketing-width">
            <div className="section-intro"><p className="marketing-kicker">OLIVIA &amp; JAMES · A FICTIONAL WEDDING</p><h2 id="story-title">One wedding, from first announcement to final reply.</h2><p>Every page below is the real thing, in the design you choose. Examples feature fictional names and wedding details.</p></div>
            <OfferShowcase initialTheme={theme} accountHref={accountHref} isAuthenticated={isAuthenticated} />
          </div>
        </section>
        <section className="offer-extras" aria-labelledby="extras-title"><div className="marketing-width">
          <div className="section-intro"><p className="marketing-kicker">THE LITTLE THINGS</p><h2 id="extras-title">Simple to share. Private to you.</h2></div>
          <ul className="offer-extras-grid">{extras.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ul>
        </div></section>
        <div className="marketing-width marketing-pricing-wrap"><PricingPanel id="pricing" accountHref={accountHref} label={primaryAccountLabel} /></div>
      </main>
    </div>
    <MarketingFooter isAuthenticated={isAuthenticated} sectionBase="/" />
  </div>;
}
