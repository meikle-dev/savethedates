import { AccountAction, MarketingFooter, MarketingHeader } from "./chrome";
import { SendingPlanner, WordingTemplates } from "./wording-tools";
import { wordingGroups } from "./wording";

// F077: an indexable guide that answers what couples search for ("save the date wording", "when to send save the
// dates"). Advice only; product claims stay within the approved features guide.
const questions = [
  ["What should a save the date say?", "Your names, the date, and the town or venue. Add that an invitation will follow, and a link if you have one, so guests know where to find the details later."],
  ["Is it OK to send a save the date by WhatsApp?", "Yes. It reaches guests straight away and costs nothing to send. A link that opens a proper save the date page, in your wedding’s design, feels more special than a plain message."],
  ["When should we send our save the dates?", "Many couples send them six to twelve months before the wedding, and earlier for a destination wedding or a popular date. Use the planner above to see the dates for your wedding."],
  ["Do evening guests get a save the date?", "If they’re invited, yes. Make it clear the invitation is for the evening celebration, so nobody is unsure later."],
  ["Do we still need to send invitations?", "Yes. A save the date only asks guests to keep the day free. The invitation follows with the times, the venue and how to reply."],
] as const;

export function SaveTheDateWording({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const accountHref = isAuthenticated ? "/dashboard" : "/account/sign-up";
  const primaryAccountLabel = isAuthenticated ? "Return to your workspace" : "Create your save the date";

  return <div className="platform marketing">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="marketing-dark">
      <MarketingHeader isAuthenticated={isAuthenticated} sectionBase="/" />
      <main id="main">
      <section className="legal-hero marketing-width" aria-labelledby="hero-title">
        <p className="marketing-kicker">Save the date wording</p>
        <h1 id="hero-title">Save the date wording, ready to send.</h1>
        <p>Messages for WhatsApp, text and email, from relaxed to formal. Add your names, date and place, then copy. Free, with nothing to sign up for.</p>
      </section>
      <section className="wording" aria-labelledby="wording-title"><div className="marketing-width">
        <div className="section-intro"><p className="marketing-kicker">Copy and paste</p><h2 id="wording-title">Save the date messages.</h2></div>
        <WordingTemplates groups={wordingGroups} />
      </div></section>
      <section className="wording-timing" aria-labelledby="timing-title"><div className="marketing-width wording-timing-grid">
        <div>
          <p className="marketing-kicker">When to send</p>
          <h2 id="timing-title">When to send your save the dates.</h2>
          <ul className="wording-rules">
            <li><strong>Save the dates:</strong> six to twelve months before the wedding. Nine to twelve for a destination wedding or a popular date.</li>
            <li><strong>Invitations:</strong> eight to twelve weeks before. Three to four months for a destination wedding.</li>
            <li><strong>Replies:</strong> ask for them about six weeks before, so there’s time to chase late ones before your final numbers are due.</li>
          </ul>
        </div>
        <SendingPlanner />
      </div></section>
      <section className="landing-notes" aria-label="Writing your save the date"><div className="marketing-width landing-notes-grid">
        <article><h2>What to include.</h2><p>Your names, the date, and the town or venue. Say that an invitation will follow, so guests know the times and venue are still to come. A link to your wedding website saves you answering the same questions.</p></article>
        <article><h2>What to leave out.</h2><p>Times, menus and dress code can wait for the invitation and your wedding details. Guests only need enough to keep the day free. If someone is invited to the evening only, say so now.</p></article>
        <article><h2>Digital or printed?</h2><p>A message can go out the day your date is set, with no envelopes, stamps or postal addresses to collect. If you post printed save the dates, the same wording works on a card.</p></article>
      </div></section>
      <section className="wording-cta" aria-labelledby="cta-title"><div className="marketing-width">
        <p className="marketing-kicker">Save the date first. Invite them later.</p>
        <h2 id="cta-title">Send a Save the Date page with your message.</h2>
        <p>Your names, date, location and photo, in one of twelve designs made for phones, with your invitation, details and RSVP to follow on the same wedding website. Free to build and preview. £19 once when you’re ready to publish.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <div className="marketing-actions"><AccountAction href={accountHref} label={primaryAccountLabel} /><a className="marketing-button marketing-outline" href="/#themes">See the twelve designs</a></div>
      </div></section>
      <section className="marketing-faq" aria-labelledby="faq-title"><div className="marketing-width faq-layout"><div><p className="marketing-kicker">GOOD TO KNOW</p><h2 id="faq-title">Save the date questions.</h2></div><div>
        {questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      </div></div></section>
      </main>
    </div>
    <MarketingFooter isAuthenticated={isAuthenticated} sectionBase="/" />
  </div>;
}
