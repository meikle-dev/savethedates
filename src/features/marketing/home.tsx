import Link from "next/link";
import { themes } from "@/features/weddings/themes";
import { AccountAction, JsonLd, MarketingFooter, MarketingHeader, PricingPanel } from "./chrome";
import { digitalSaveTheDatePath, homeStructuredData } from "./metadata";
import { PhonePreview } from "./phone-preview";

export function MarketingHome({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const accountHref = isAuthenticated ? "/dashboard" : "/account/sign-up";
  const primaryAccountLabel = isAuthenticated ? "Return to your workspace" : "Create your save the date";

  return <div className="platform marketing">
    <JsonLd data={homeStructuredData()} />
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <MarketingHeader isAuthenticated={isAuthenticated} sectionBase="" />
      <main id="main">
        <section className="marketing-hero marketing-width" aria-labelledby="hero-title">
          <div className="hero-copy"><p className="marketing-kicker">A little link. A lovely beginning.</p>
            <h1 id="hero-title">Your wedding website,<br /><em>beautifully done.</em></h1>
            <p className="hero-description">Your digital save the date, wedding details and online RSVP, all in one link. Share it by WhatsApp, text or email.</p>
            <div className="marketing-actions"><AccountAction href={accountHref} label={primaryAccountLabel} /><a className="marketing-button marketing-outline" href="#themes">Find your style</a></div>
            <p className="hero-note">Create &amp; preview for free. £29 when you’re ready to publish.</p>
            <div className="hero-features"><span>Twelve beautiful themes</span><span>One simple payment</span><span>Made for mobile</span></div>
          </div>
          <div className="hero-art"><div className="hero-orbit" /><div className="hero-phone-back"><PhonePreview theme="bold" eager sizes="(max-width: 760px) 156px, 208px" /></div><div className="hero-phone-front"><PhonePreview eager sizes="(max-width: 760px) 175px, 232px" /></div><p className="hero-art-caption">Made for your<br /><em>kind of forever.</em></p></div>
        </section>
        <section id="themes" className="theme-showcase" aria-labelledby="themes-title"><div className="marketing-width">
          <div className="section-intro"><p className="marketing-kicker">TWELVE STYLES. ALL YOU.</p><h2 id="themes-title">Find your kind of beautiful.</h2><p>Twelve save the date designs, each with matching Details and RSVP pages. Same thoughtful features, different ways to tell your story.</p></div>
          <div className="marketing-themes">{themes.map((theme, index) => <Link className={`marketing-theme theme-${theme.id}`} href={`/examples/${theme.id}`} key={theme.id}>
            <div className="theme-visual"><span className="theme-number">{String(index + 1).padStart(2, "0")}</span><PhonePreview theme={theme.id} photoLabel="Your photo here" sizes="(max-width: 760px) 122px, 170px" /></div>
            <div className="theme-caption"><div><h3>{theme.name}</h3><p>{theme.description}</p></div><span className="theme-arrow" aria-hidden="true">↗</span></div><span className="theme-example-link">Explore this example</span>
          </Link>)}</div><p className="example-disclosure">Examples feature fictional names and wedding details.</p>
        </div></section>
        <section id="how-it-works" className="marketing-width marketing-how" aria-labelledby="how-title"><div className="section-intro"><p className="marketing-kicker">FROM YES TO YOU’RE INVITED</p><h2 id="how-title">How your save the date comes together.</h2></div>
          <ol className="marketing-steps"><li><span>01</span><h3>Make it yours</h3><p>Choose a theme, add your names, date and a favourite photo. Preview your site as you go.</p></li><li><span>02</span><h3>Fill in the day</h3><p>Add ceremony details, travel tips and answers to the questions your guests will ask.</p></li><li><span>03</span><h3>Share the excitement</h3><p>Pay once to publish, then send one private link by WhatsApp, text or email. It opens your Save the Date, Details and RSVP.</p></li></ol>
          <PricingPanel id="pricing" accountHref={accountHref} label={primaryAccountLabel} />
        </section>
        <section className="marketing-faq" aria-labelledby="faq-title"><div className="marketing-width faq-layout"><div><p className="marketing-kicker">THE LITTLE DETAILS</p><h2 id="faq-title">Save the date questions, answered.</h2></div><div>
          <details><summary>What is a digital save the date?</summary><p>A save the date you send as a link instead of a card. Yours opens with your names, date and photo, and guests can go straight on to your wedding details and RSVP. <Link className="faq-link" href={digitalSaveTheDatePath}>More about digital save the dates</Link></p></details>
          <details><summary>Can we try it before paying?</summary><p>Yes. Create an account, save your details and preview all twelve themes for free. The one-off £29 payment is required before you publish.</p></details>
          <details><summary>How do guests RSVP?</summary><p>Share your one private guest link with everyone by WhatsApp, text or email. Each guest opens RSVP on their phone or computer and enters their name and answer, without creating an account. Only you can see the responses.</p></details>
          <details><summary>When should we send our save the dates?</summary><p>Many couples send them six to twelve months before the wedding, and earlier for a destination wedding or a popular date. You can publish once your names, date and location are saved and you’ve paid, then add or change the details later.</p></details>
          <details><summary>Who can see our website?</summary><p>Your draft is private. Once published, anyone with your guest link can view your site. Wedding pages are marked not to appear in search results; this does not make them password-protected. Responses are visible only in your account.</p></details>
          <details><summary>Can we make changes after publishing?</summary><p>Yes. Update your details, photo or theme and saved changes appear on your published site. You can unpublish at any time. Your guest link stays the same unless you choose to replace it.</p></details>
          <details><summary>What happens after the wedding?</summary><p>Your site stays published until six months after your wedding date. After that, your guest link stops opening it.</p></details>
        </div></div></section>
      </main>
    </div>
    <MarketingFooter isAuthenticated={isAuthenticated} sectionBase="" />
  </div>;
}
