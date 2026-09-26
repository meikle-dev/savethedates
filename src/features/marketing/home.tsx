import Link from "next/link";
import { themes } from "@/features/weddings/themes";
import { AccountAction, JsonLd, MarketingFooter, MarketingHeader, PricingPanel } from "./chrome";
import { digitalSaveTheDatePath, homeStructuredData, whatWeOfferPath } from "./metadata";
import { PhonePreview } from "./phone-preview";

const rsvpExample = {
  attending: 86,
  declined: 12,
  mains: [["Roast sirloin of beef", 41], ["Pan-roasted hake with lemon butter", 29], ["Wild mushroom risotto", 16]],
  dietary: [["Vegetarian", 11], ["Vegan", 3], ["Gluten-free", 4]],
} as const;

export function MarketingHome({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const accountHref = isAuthenticated ? "/dashboard" : "/account/sign-up";
  const primaryAccountLabel = isAuthenticated ? "Return to your workspace" : "Start building for free";

  return <div className="platform marketing">
    <JsonLd data={homeStructuredData()} />
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <MarketingHeader isAuthenticated={isAuthenticated} sectionBase="" />
      <main id="main">
        <section className="marketing-hero marketing-width" aria-labelledby="hero-title">
          <div className="hero-copy"><p className="marketing-kicker">From Save the Date to final RSVP</p>
            <h1 id="hero-title">Your wedding website,<br /><em>beautifully done.</em></h1>
            <p className="hero-description">Your Save the Date, wedding invitation, details and RSVPs, including meal choices and dietary requirements, on one private wedding website. Send each by WhatsApp, text or email, when the time is right.</p>
            <div className="marketing-actions"><AccountAction href={accountHref} label={primaryAccountLabel} /><a className="marketing-button marketing-outline" href="#themes">Explore the designs</a></div>
            <Link className="hero-offer-link" href={whatWeOfferPath}>See everything we offer <span aria-hidden="true">→</span></Link>
            <p className="hero-note">Free to build and preview. £29 once when you’re ready to publish.</p>
            <div className="hero-features"><span>No subscription</span><span>No app or login for guests</span><span>Twelve designs</span></div>
          </div>
          <div className="hero-art"><div className="hero-orbit" /><div className="hero-phone-back"><PhonePreview theme="bold" eager sizes="(max-width: 760px) 156px, 208px" /></div><div className="hero-phone-front"><PhonePreview eager sizes="(max-width: 760px) 175px, 232px" /></div><p className="hero-art-caption">Made for your<br /><em>kind of forever.</em></p></div>
        </section>
        <section id="themes" className="theme-showcase" aria-labelledby="themes-title"><div className="marketing-width">
          <div className="section-intro"><p className="marketing-kicker">TWELVE STYLES. ALL YOU.</p><h2 id="themes-title">Find your kind of beautiful.</h2><p>Twelve wedding website designs, each with a matching Save the Date, Invitation, Details and RSVP. Every design carries through from your first announcement to your final guest responses.</p></div>
          <div className="marketing-themes">{themes.map((theme, index) => <Link className={`marketing-theme theme-${theme.id}`} href={`/examples/${theme.id}`} key={theme.id}>
            <div className="theme-visual"><span className="theme-number">{String(index + 1).padStart(2, "0")}</span><PhonePreview theme={theme.id} photoLabel="Your photo here" sizes="(max-width: 760px) 122px, 170px" /></div>
            <div className="theme-caption"><div><h3>{theme.name}</h3><p>{theme.description}</p></div><span className="theme-arrow" aria-hidden="true">↗</span></div><span className="theme-example-link">Preview this design</span>
          </Link>)}</div><p className="example-disclosure">Examples feature fictional names and wedding details.</p>
        </div></section>
        <section id="how-it-works" className="marketing-width marketing-how" aria-labelledby="how-title"><div className="section-intro"><p className="marketing-kicker">FROM SAVE THE DATE TO RSVP</p><h2 id="how-title">Everything your guests need, in one place.</h2></div>
          <ol className="marketing-steps marketing-steps-four"><li><span>01</span><h3>Make it yours</h3><p>Choose your design, add your names, wedding date and a favourite photo. Preview everything as you build.</p></li><li><span>02</span><h3>Tell them everything</h3><p>Word your invitation, then add ceremony and reception times, travel, where to stay, dress code and answers to the questions guests always ask.</p></li><li><span>03</span><h3>Collect your RSVPs</h3><p>Guests reply online, choose their meal and tell you about dietary requirements. Every response is kept privately for you.</p></li><li><span>04</span><h3>Publish and share</h3><p>Pay £29 once, then send your Save the Date by WhatsApp, text or email. When you’re ready, your Invitation goes on its own link. Change anything later and guests see the latest.</p></li></ol>
          <p className="marketing-how-more"><Link className="marketing-button marketing-outline" href={whatWeOfferPath}>See everything we offer</Link></p>
        </section>
        <section className="marketing-whole" aria-labelledby="whole-title"><div className="marketing-width">
          <div className="section-intro"><p className="marketing-kicker">MADE FOR WEDDINGS, NOT WEBSITE BUILDING</p><h2 id="whole-title">One website. Your whole wedding.</h2><p>No layouts to design and nothing to configure. Start with your Save the Date, then switch on your invitation, wedding details and RSVP as your plans come together. Your guests always know where to look.</p></div>
          <ul className="whole-parts"><li><h3>Save the Date</h3><p>Announce your day beautifully, as soon as the date is set.</p></li><li><h3>Invitation &amp; details</h3><p>Your own wording, then times, venues, travel and everything guests need to know.</p></li><li><h3>RSVP &amp; meal choices</h3><p>Attendance, meal selections and dietary requirements, collected in one place.</p></li></ul>
        </div></section>
        <section className="marketing-width marketing-rsvp" aria-labelledby="rsvp-title">
          <div><p className="marketing-kicker">GUEST RSVPS, MEALS &amp; DIETARY NEEDS</p><h2 id="rsvp-title">RSVPs without the spreadsheet chaos.</h2>
            <p>Guests confirm whether they’re coming, choose their starter, main and dessert, and tell you about dietary requirements, all online and without creating an account. Every reply lands privately in your guest list.</p>
            <ul><li>Attendance totals, updated as replies arrive</li><li>Meal numbers ready to send to your caterer</li><li>Vegetarian, vegan, gluten-free and other needs, counted for you</li><li>Only you can see the responses</li></ul>
          </div>
          <figure className="rsvp-example" aria-labelledby="rsvp-example-caption">
            <div className="rsvp-example-totals"><p><strong>{rsvpExample.attending}</strong> attending</p><p><strong>{rsvpExample.declined}</strong> not attending</p></div>
            <h3>Main course</h3><dl>{rsvpExample.mains.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
            <h3>Food preferences</h3><dl>{rsvpExample.dietary.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
            <figcaption id="rsvp-example-caption">Example of the catering numbers in your account, with fictional replies.</figcaption>
          </figure>
        </section>
        <div className="marketing-width marketing-pricing-wrap"><PricingPanel id="pricing" accountHref={accountHref} label={primaryAccountLabel} /></div>
        <section className="marketing-faq" aria-labelledby="faq-title"><div className="marketing-width faq-layout"><div><p className="marketing-kicker">THE LITTLE DETAILS</p><h2 id="faq-title">Wedding website questions, answered.</h2></div><div>
          <details><summary>What is a digital save the date?</summary><p>A save the date you send as a link instead of a card. Yours opens with your names, date and photo, and when you’re ready, your wedding website adds your invitation, wedding details and RSVP. <Link className="faq-link" href={digitalSaveTheDatePath}>More about digital save the dates</Link></p></details>
          <details><summary>Can we try it before paying?</summary><p>Yes. Create an account, save your details and preview all twelve designs for free. The one-off £29 payment is required before you publish. There’s no subscription.</p></details>
          <details><summary>We’ve already sent our save the dates. Is this still for us?</summary><p>Yes. Switch on your Invitation, Details and RSVP, and send your Invitation on its own link. Guests don’t need to have seen a Save the Date from us first.</p></details>
          <details><summary>Can we still send printed invitations?</summary><p>Yes. Every page apart from your Save the Date is optional. If you’re posting printed invitations, leave the Invitation page off and use your Save the Date link for the Save the Date, Details and RSVP. Or switch the Invitation on when you’re ready to invite everyone digitally, and send its own link.</p></details>
          <details><summary>How do guests RSVP?</summary><p>Send your RSVP link by WhatsApp, text or email, or let guests reply from your Invitation (or your Save the Date, if you don’t use the Invitation). Each guest opens RSVP on their phone or computer and enters their name and answer, without creating an account. Only you can see the responses.</p></details>
          <details><summary>Can guests choose their meal and tell us about dietary requirements?</summary><p>Yes. Add your menu in your account and switch on meal choices, and attending guests choose one option for each course you offer: starter, main and dessert. Every attending guest can also tell you if they’re vegetarian, vegan, gluten-free or have another food preference. Your account totals the numbers for your caterer.</p></details>
          <details><summary>When should we send our save the dates?</summary><p>Many couples send them six to twelve months before the wedding, and earlier for a destination wedding or a popular date. You can publish once your names, date and location are saved and you’ve paid, then add or change the details later.</p></details>
          <details><summary>Who can see our website?</summary><p>Your draft is private. Once published, anyone with one of your guest links can view the pages it opens. Wedding pages are marked not to appear in search results; this does not make them password-protected. Responses are visible only in your account.</p></details>
          <details><summary>Can we make changes after publishing?</summary><p>Yes. Update your invitation, details, photo or design and saved changes appear on your published site. You can unpublish at any time. Your guest links stay the same unless you choose to replace one.</p></details>
          <details><summary>What happens after the wedding?</summary><p>Your site stays published until six months after your wedding date. After that, your guest links stop opening it.</p></details>
        </div></div></section>
      </main>
    </div>
    <MarketingFooter isAuthenticated={isAuthenticated} sectionBase="" />
  </div>;
}
