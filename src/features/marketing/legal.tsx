import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingFooter, MarketingHeader } from "./chrome";
import { legalPaths } from "./legal-agreement";
import { marketingOrigin, supportEmail } from "./metadata";

const operatorName = "Ross Meikle";
const legalUpdated = "September 2026";

export function legalMetadata(path: string, title: string, description: string): Metadata {
  const url = `${marketingOrigin()}${path}`;
  return { title, description, alternates: { canonical: url }, robots: { index: true, follow: true }, openGraph: { type: "website", locale: "en_GB", siteName: "SaveTheDates", title, description, url } };
}

const Email = () => <a href={`mailto:${supportEmail}`}>{supportEmail}</a>;

/** Legal pages skip the account check so they stay static text that can open without the staging password. */
function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <div className="platform marketing">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <MarketingHeader isAuthenticated={false} sectionBase="/" />
      <div className="marketing-width legal-hero"><p className="marketing-kicker">Last updated {legalUpdated}</p><h1>{title}</h1><p>{intro}</p></div>
    </div>
    <main id="main" className="legal"><div className="marketing-width"><div className="legal-body">{children}</div></div></main>
    <MarketingFooter isAuthenticated={false} sectionBase="/" />
  </div>;
}

export function PrivacyNotice() {
  return <LegalPage title="Privacy notice" intro="What we collect when you use SaveTheDates, why, who helps us run it, and your rights.">
    <section aria-labelledby="who"><h2 id="who">Who we are</h2>
      <p>SaveTheDates (savethedates.co.uk) is run by {operatorName} in the United Kingdom, who is the data controller for the information described here. Contact us about privacy at <Email />.</p></section>
    <section aria-labelledby="couples"><h2 id="couples">If you create an account</h2>
      <ul>
        <li><strong>Account:</strong> your email address and a securely hashed password. We use them to sign you in and to send account emails such as confirmation and password reset links.</li>
        <li><strong>Google sign-in:</strong> if you choose Continue with Google, Google shares your name, email address and profile picture link with us. Our sign-in provider stores these with your account; the app itself uses only your email address.</li>
        <li><strong>Your wedding site:</strong> the names, date, location, message, photo, wedding details, theme and settings you enter. Photos are re-saved when you upload them, which removes hidden data such as camera location.</li>
        <li><strong>Payment:</strong> when you pay, Stripe collects your card details. We never see or store your card number. We keep a record of the payment (amount, date and Stripe references) to know that your site is paid for and to handle refunds.</li>
        <li><strong>Technical data:</strong> like any website, our hosting and sign-in providers record technical details such as your IP address, browser and the pages you request, to keep the service secure and working.</li>
      </ul>
      <p>We use this information to provide the service you asked for (our contract with you), and payment records also to meet tax and accounting law.</p></section>
    <section aria-labelledby="guests"><h2 id="guests">If you are a guest</h2>
      <p>When you reply to an RSVP, we store the name you enter, whether you are attending and when you replied. Our hosting provider also records technical details such as your IP address. Only the couple can see replies. We keep them for the couple, who decide what to do with them. Guests don’t need an account and we don’t ask for contact details.</p>
      <p>Wedding pages open for anyone who has the couple’s link. They are marked not to appear in search results, but they are not password-protected.</p></section>
    <section aria-labelledby="providers"><h2 id="providers">Who helps us run the service</h2>
      <p>We share information only with providers that run parts of the service for us, under their data processing terms:</p>
      <ul>
        <li><strong>Supabase</strong> — database, sign-in and photo storage (Frankfurt, Germany).</li>
        <li><strong>Render</strong> — hosting the website (Frankfurt, Germany).</li>
        <li><strong>Stripe</strong> — payments.</li>
        <li><strong>Resend</strong> — sending account emails (Ireland).</li>
        <li><strong>Sentry</strong> — error reports that help us fix problems (Germany). A report identifies an account only by a random ID. We remove guest links, form contents and passwords first, and Sentry is set not to store IP addresses.</li>
      </ul>
      <p>If you use Continue with Google, Google handles your sign-in under its own privacy policy.</p>
      <p>Some of these providers may handle data outside the UK. Where they do, the transfer is protected by safeguards recognised under UK law, such as the UK International Data Transfer Addendum or the UK–US data bridge. We don’t sell your information or use it for advertising.</p></section>
    <section aria-labelledby="cookies"><h2 id="cookies">Cookies</h2>
      <p>We use only cookies needed for the site to work: a sign-in cookie that keeps you signed in, and a cookie that protects Google sign-in and is removed when sign-in finishes. We don’t use analytics or advertising cookies. Stripe’s checkout page sets its own cookies to prevent fraud.</p></section>
    <section aria-labelledby="keeping"><h2 id="keeping">How long we keep it</h2>
      <ul>
        <li>Your account and wedding site stay until you ask us to delete them. When your published site period ends, guests can no longer open it, but your private draft and replies stay in your account.</li>
        <li>When you ask us to delete your account, we delete your account, wedding site, photos, guest replies and our copy of your payment records. Stripe keeps its own payment records for as long as the law requires.</li>
        <li>Server logs are kept for up to 30 days, and error reports for up to 90 days.</li>
      </ul></section>
    <section aria-labelledby="rights"><h2 id="rights">Your rights</h2>
      <p>You can ask for a copy of your information, or ask us to correct, delete, or stop or limit using it. You can also object to how we use it. Email <Email /> from the address on your account and we will reply within one month.</p>
      <p>If you are unhappy with how we handle your information, please tell us first. You can also complain to the Information Commissioner’s Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.</p></section>
    <section aria-labelledby="security"><h2 id="security">Security and age</h2>
      <p>Connections are encrypted, and each couple can reach only their own site and replies. SaveTheDates is for adults aged 18 or over. If we change this notice, we will update the date at the top.</p></section>
  </LegalPage>;
}

export function TermsOfService() {
  return <LegalPage title="Terms of service" intro="The agreement between you and SaveTheDates when you create an account or buy a wedding site.">
    <section aria-labelledby="about"><h2 id="about">About these terms</h2>
      <p>SaveTheDates (savethedates.co.uk) is run by {operatorName} in the United Kingdom. By creating an account you agree to these terms and to our <Link href={legalPaths.privacy}>privacy notice</Link>. You must be 18 or over. Questions: <Email />.</p></section>
    <section aria-labelledby="service"><h2 id="service">The service</h2>
      <p>You can create an account, draft your wedding site and preview every theme for free. To publish, you pay £29 once for one wedding site. That includes Save the Date, Details and RSVP pages, one guest link and your guest replies.</p>
      <p>A paid site stays published until six months after the wedding date saved when you start checkout. Changing the date later doesn’t change that end date. After it, guests can no longer open the site, but your private draft and replies stay in your account.</p></section>
    <section aria-labelledby="content"><h2 id="content">Your content</h2>
      <p>You keep ownership of everything you add. You allow us to store it and show it to anyone who has your guest link, only to provide the service.</p>
      <p>Only add photos and text you have the right to use, and that don’t break the law or other people’s rights. Anyone with your guest link can see your pages, so share it only with people you trust. You are responsible for the replies you collect from your guests.</p>
      <p>We may unpublish content that breaks these rules. We will tell you why, unless the law stops us.</p></section>
    <section aria-labelledby="account"><h2 id="account">Your account</h2>
      <p>Keep your password safe; you are responsible for what happens in your account. You can unpublish your site at any time and ask us to delete your account by emailing <Email />.</p></section>
    <section aria-labelledby="payment"><h2 id="payment">Payment and refunds</h2>
      <p>Prices are in pounds sterling and paid through Stripe. You can cancel for a full refund within 14 days, and in some other cases; see our <Link href={legalPaths.refunds}>refund policy</Link>. A refunded site is unpublished.</p></section>
    <section aria-labelledby="availability"><h2 id="availability">Availability and liability</h2>
      <p>We work to keep the service running and your content safe, but it may occasionally be unavailable, for example during maintenance. Please keep your own copy of anything important.</p>
      <p>We are responsible for loss you suffer that is a foreseeable result of our breaking these terms or failing to use reasonable care. Otherwise, our total liability to you is limited to the amount you paid us. Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or anything else the law does not allow us to limit, and nothing affects your legal rights as a consumer.</p></section>
    <section aria-labelledby="changes"><h2 id="changes">Changes and the law</h2>
      <p>We may update these terms. Changes don’t affect a site you have already paid for. These terms are governed by the law of the part of the United Kingdom where you live, and you can bring claims in the courts there.</p></section>
  </LegalPage>;
}

export function RefundPolicy() {
  return <LegalPage title="Refund policy" intro="When you can get your £29 back, and what happens to your site.">
    <section aria-labelledby="fourteen"><h2 id="fourteen">Within 14 days</h2>
      <p>You can cancel within 14 days of paying and get a full refund, for any reason. Email <Email /> from the address on your account.</p></section>
    <section aria-labelledby="after"><h2 id="after">After 14 days</h2>
      <p>If your site doesn’t work as described and we can’t fix it within a reasonable time, we will refund you. This doesn’t affect your legal rights as a consumer.</p></section>
    <section aria-labelledby="what-happens"><h2 id="what-happens">What happens next</h2>
      <p>We refund the original payment through Stripe, usually within 5 working days of agreeing. Your bank may take a few more days to show it. When a refund is made, your site is unpublished and guests can no longer open it. Your private draft and guest replies stay in your account, and you can pay again to republish.</p>
      <p>If you dispute the payment with your bank instead, your site is also unpublished, and you can pay again to republish.</p></section>
  </LegalPage>;
}
