import { AccountAction, MarketingFooter, MarketingHeader, PricingPanel } from "./chrome";
import { PhonePreview } from "./phone-preview";

const questions = [
  ["Do guests need to download anything?", "No. The link opens in their phone’s browser. There is no app and no guest account."],
  ["When should we send our digital save the dates?", "Many couples send them six to twelve months before the wedding, and earlier for a destination wedding or a popular date. You can publish once your names, date and location are saved and you’ve paid, then add or change the details later."],
  ["Can guests see each other’s replies?", "No. Responses are visible only in your account."],
  ["Who can see our save the date?", "Anyone with your guest link. Wedding pages are marked not to appear in search results, but that does not make them password-protected, so share the link only with your guests."],
  ["How long does it stay online?", "Until six months after your wedding date. After that, your guest link stops opening it."],
  ["Can we try it first?", "Yes. Create an account, add your details and preview all twelve designs for free. You pay £29 once, when you’re ready to publish."],
] as const;

export function DigitalSaveTheDate({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const accountHref = isAuthenticated ? "/dashboard" : "/account/sign-up";
  const primaryAccountLabel = isAuthenticated ? "Return to your workspace" : "Create your save the date";

  return <div className="platform marketing">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <MarketingHeader isAuthenticated={isAuthenticated} sectionBase="/" />
      <main id="main">
        <section className="marketing-hero marketing-width" aria-labelledby="hero-title">
          <div className="hero-copy"><p className="marketing-kicker">Digital save the dates</p>
            <h1 id="hero-title">Digital save the dates,<br /><em>with RSVP built in.</em></h1>
            <p className="hero-description">Send one link by WhatsApp, text or email. Guests open your names, date and photo, then your wedding details and an RSVP they can answer without an account.</p>
            {/* Native navigation, as in the example banner, avoids a production router hash duplication. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <div className="marketing-actions"><AccountAction href={accountHref} label={primaryAccountLabel} /><a className="marketing-button marketing-outline" href="/#themes">See the twelve designs</a></div>
            <p className="hero-note">Create &amp; preview for free. £29 when you’re ready to publish.</p>
          </div>
          <div className="hero-art"><div className="hero-orbit" /><div className="hero-phone-back"><PhonePreview theme="evening-gold" eager sizes="(max-width: 760px) 156px, 208px" /></div><div className="hero-phone-front"><PhonePreview theme="romantic" eager sizes="(max-width: 760px) 175px, 232px" /></div><p className="hero-art-caption">One link.<br /><em>Three lovely pages.</em></p></div>
        </section>
        <section className="marketing-width marketing-how" aria-labelledby="pages-title"><div className="section-intro"><p className="marketing-kicker">ONE LINK. THREE PAGES.</p><h2 id="pages-title">Everything guests need, from one message.</h2></div>
          <ol className="marketing-steps"><li><span>01</span><h3>Save the Date</h3><p>Your names, date, location and photo, in one of twelve designs made for phones.</p></li><li><span>02</span><h3>Details</h3><p>Ceremony and reception, timings, travel, where to stay, dress code and answers to guests’ questions. Add only what you need.</p></li><li><span>03</span><h3>RSVP</h3><p>Guests reply with their name and answer, with no account or app. You see every response and the totals in your account.</p></li></ol>
          <PricingPanel accountHref={accountHref} label={primaryAccountLabel} />
        </section>
        <section className="landing-notes" aria-label="Sending your save the date"><div className="marketing-width landing-notes-grid">
          <article><h2>Send it the way you already talk.</h2><p>When you publish, you get one private guest link and a ready-written message. Share it on WhatsApp, copy it into a text or email, or use your phone’s share menu. Everyone gets the same link, so there are no envelopes, stamps or postal addresses to collect.</p></article>
          <article><h2>Change of plan? Same link.</h2><p>Saved changes to your details, photo or theme show on your published site, so guests always see the latest version. You can close RSVPs, replace the link or unpublish at any time.</p></article>
          <article><h2>Digital or printed?</h2><p>A digital save the date costs nothing to post and can go out as soon as your date is set. If you’d like printed invitations later, your link works alongside them.</p></article>
        </div></section>
        <section className="marketing-faq" aria-labelledby="faq-title"><div className="marketing-width faq-layout"><div><p className="marketing-kicker">GOOD TO KNOW</p><h2 id="faq-title">Digital save the date questions.</h2></div><div>
          {questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div></div></section>
      </main>
    </div>
    <MarketingFooter isAuthenticated={isAuthenticated} sectionBase="/" />
  </div>;
}
