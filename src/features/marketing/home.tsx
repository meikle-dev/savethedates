import Link from "next/link";
import { themes } from "@/features/weddings/themes";
import { PhonePreview } from "./phone-preview";

function AccountAction({ href, label }: { href: string; label: string }) {
  return <Link className="marketing-button marketing-button-primary" href={href}>
    <span className="marketing-button-label">{label}</span>
    <span className="marketing-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5 19 19 5M7 5h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  </Link>;
}

export function MarketingHome({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const accountHref = isAuthenticated ? "/dashboard" : "/account/sign-up";
  const primaryAccountLabel = isAuthenticated ? "Return to your workspace" : "Create your save the date";
  const navigationAccountLabel = isAuthenticated ? "Your workspace" : "Sign in";

  return <div className="platform marketing">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <header className="marketing-nav marketing-width">
        <Link className="marketing-brand" href="/" aria-label="SaveTheDates home">SaveTheDates<span>FOR YOUR NEXT CHAPTER</span></Link>
        <nav aria-label="Main navigation"><a href="#themes">Themes</a><a href="#pricing">Pricing</a><Link className="nav-signin" href={isAuthenticated ? "/dashboard" : "/account/sign-in"}>{navigationAccountLabel} <span aria-hidden="true">↗</span></Link></nav>
      </header>
      <main id="main">
        <section className="marketing-hero marketing-width" aria-labelledby="hero-title">
          <div className="hero-copy"><p className="marketing-kicker">A little link. A lovely beginning.</p>
            <h1 id="hero-title">Your wedding website,<br /><em>beautifully done.</em></h1>
            <p className="hero-description">Your date, the details, their RSVPs. Bring it all together in a beautiful place that feels like you.</p>
            <div className="marketing-actions"><AccountAction href={accountHref} label={primaryAccountLabel} /><a className="marketing-button marketing-outline" href="#themes">Find your style</a></div>
            <p className="hero-note">Create &amp; preview for free. £29 when you’re ready to publish.</p>
            <div className="hero-features"><span>Three beautiful themes</span><span>One simple payment</span><span>Made for mobile</span></div>
          </div>
          <div className="hero-art"><div className="hero-orbit" /><div className="hero-phone-back"><PhonePreview theme="bold" eager /></div><div className="hero-phone-front"><PhonePreview eager /></div><p className="hero-art-caption">Made for your<br /><em>kind of forever.</em></p></div>
        </section>
        <section id="themes" className="theme-showcase" aria-labelledby="themes-title"><div className="marketing-width">
          <div className="section-intro"><p className="marketing-kicker">THREE STYLES. ALL YOU.</p><h2 id="themes-title">Find your kind of beautiful.</h2><p>Same thoughtful features. Three different ways to tell your story.</p></div>
          <div className="marketing-themes">{themes.map((theme, index) => <Link className={`marketing-theme theme-${theme.id}`} href={`/examples/${theme.id}`} key={theme.id}>
            <div className="theme-visual"><span className="theme-number">0{index + 1}</span><PhonePreview theme={theme.id} /></div>
            <div className="theme-caption"><div><h3>{theme.name}</h3><p>{theme.description}</p></div><span className="theme-arrow" aria-hidden="true">↗</span></div><span className="theme-example-link">Explore this example</span>
          </Link>)}</div><p className="example-disclosure">Examples feature fictional names and wedding details.</p>
        </div></section>
        <section id="how-it-works" className="marketing-width marketing-how" aria-labelledby="how-title"><div className="section-intro"><p className="marketing-kicker">FROM YES TO YOU’RE INVITED</p><h2 id="how-title">A few details. A lovely hello.</h2></div>
          <ol className="marketing-steps"><li><span>01</span><h3>Make it yours</h3><p>Choose a theme, add your names, date and a favourite photo. Preview your site as you go.</p></li><li><span>02</span><h3>Fill in the day</h3><p>Add ceremony details, travel tips and answers to the questions your guests will ask.</p></li><li><span>03</span><h3>Share the excitement</h3><p>Pay once to publish, share your wedding URL and send private RSVP links to your guests.</p></li></ol>
          <div id="pricing" className="marketing-pricing"><div><p className="marketing-kicker">ONE WEDDING. ONE SIMPLE PRICE.</p><h2>Everything for your day.</h2><p className="price">£29 <span>GBP · one time</span></p><p>No subscription. Draft and preview for free.</p></div><ul><li>All three themes, with a photo of your choice</li><li>Your own wedding URL and Details page</li><li>Up to 100 private RSVP invitations</li><li>A private response list and attendance totals</li><li>Published until six months after your wedding date*</li></ul><div className="pricing-action"><AccountAction href={accountHref} label={primaryAccountLabel} /><p>Make something worth sharing.</p></div><p className="pricing-footnote">*Based on the wedding date at checkout. Your expiry date is fixed when you start checkout.</p></div>
        </section>
        <section className="marketing-faq" aria-labelledby="faq-title"><div className="marketing-width faq-layout"><div><p className="marketing-kicker">THE LITTLE DETAILS</p><h2 id="faq-title">Good to know.</h2></div><div>
          <details><summary>Can we try it before paying?</summary><p>Yes. Create an account, save your details and preview all three themes for free. The one-off £29 payment is required before you publish.</p></details>
          <details><summary>How do guests RSVP?</summary><p>Create up to 100 invitations and send each guest their private RSVP link. Each invitation holds one response. Guests can reply or update their answer while RSVP is open, without creating an account.</p></details>
          <details><summary>Who can see our website?</summary><p>Your draft is private. Once published, anyone with your wedding URL can view your site. Wedding pages are marked not to appear in search results; this does not make them password-protected. Responses are visible only in your account.</p></details>
          <details><summary>Can we make changes after publishing?</summary><p>Yes. Update your details, photo or theme and saved changes appear on your published site. You can unpublish at any time. Your wedding URL stays the same.</p></details>
        </div></div></section>
      </main>
    </div>
    <footer className="marketing-footer marketing-width"><Link className="marketing-brand" href="/">SaveTheDates</Link><p>A beautiful beginning, shared.</p><nav aria-label="Footer navigation"><a href="#themes">Themes</a><a href="#pricing">Pricing</a><Link href={isAuthenticated ? "/dashboard" : "/account/sign-in"}>{navigationAccountLabel}</Link></nav></footer>
  </div>;
}
