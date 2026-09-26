"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { swatchBackground, themes, type WeddingTheme } from "@/features/weddings/themes";
import { courseCounts, dietaryCounts } from "@/features/workspace/catering";
import { exampleMealMenu } from "./example-data";
import type { ExamplePageName } from "./example-pages";
import { offerPhonePath, whatWeOfferPath } from "./metadata";
import { demoAnnouncement, demoFoodLines, demoReplies, demoReplyFromForm, demoStarted, demoSummary, emptyDemoReply, type DemoReply } from "./offer-demo";

const pagePath = (theme: WeddingTheme, page: ExamplePageName) => page === "save-the-date" ? offerPhonePath(theme) : `${offerPhonePath(theme)}/${page}`;
const exampleHref = (theme: WeddingTheme, page: ExamplePageName) => page === "save-the-date" ? `/examples/${theme}` : `/examples/${theme}/${page}`;
const noSubscription = () => () => {};
const themeName = (theme: WeddingTheme) => themes.find((item) => item.id === theme)!.name;

type Step = { page: ExamplePageName; number: string; when: string; title: string; link: string; optional: boolean; body: string[] };
const steps: Step[] = [
  { page: "save-the-date", number: "01", when: "As soon as the date is set", title: "Save the Date", link: "Save the Date", optional: false,
    body: ["Your names, date, location and a favourite photo, beautifully set in the design you choose.", "Share it by WhatsApp, text or email. Guests open it on their phone, with nothing to download."] },
  { page: "invitation", number: "02", when: "A few months to go", title: "Wedding invitation", link: "Invitation", optional: true,
    body: ["Your own wording, the time and the venue, in the same design as your Save the Date.", "It has its own link, so you can send it when you’re ready. Posting printed invitations instead? Leave this page off."] },
  { page: "details", number: "03", when: "Everything guests ask", title: "Details of the day", link: "Details page", optional: true,
    body: ["Ceremony and reception times and venues, directions, travel, where to stay, dress code and answers to guests’ questions.", "Add only what you need. Change it whenever plans change."] },
];

/** A phone showing a real example page. Decorative phones are inert: the step beside them says what they show. */
function OfferPhone({ theme, page, interactive = false, eager = false, frameRef, onFrameLoad }: {
  theme: WeddingTheme; page: ExamplePageName; interactive?: boolean; eager?: boolean;
  frameRef?: React.Ref<HTMLIFrameElement>; onFrameLoad?: () => void;
}) {
  const src = pagePath(theme, page);
  // Server-rendered frames count as shown; a theme change hides the old page until the new one has loaded.
  const [shown, setShown] = useState(src);
  const surface = themes.find((item) => item.id === theme)!.swatch[0];
  return <div className={`offer-phone${interactive ? " offer-phone-interactive" : ""}`} style={{ background: surface }} inert={!interactive || undefined}>
    <div className="phone-speaker" aria-hidden="true" />
    <div className="offer-phone-screen">
      <iframe key={src} ref={frameRef} src={src} data-shown={shown === src} loading={eager ? "eager" : "lazy"}
        title={interactive ? `Example RSVP in ${themeName(theme)}: try replying as a guest` : `${themeName(theme)} example`}
        onLoad={() => { setShown(src); onFrameLoad?.(); }} />
    </div>
  </div>;
}

function Count({ value }: { value: number }) {
  // Keyed by value, so a change replays the highlight (none under reduced motion).
  return <span key={value} className="offer-count">{value}</span>;
}

function CoupleView({ reply, announcement }: { reply: DemoReply; announcement: string }) {
  const replies = demoStarted(reply) ? [...demoReplies, reply] : demoReplies;
  const summary = demoSummary(replies);
  const declined = replies.filter((item) => item.attending === false).length;
  const newest = [...replies].reverse();
  return <div className="offer-couple">
    <p className="offer-couple-label">The couple’s side · private to them</p>
    <div className="offer-couple-totals"><p><strong><Count value={summary.attending} /></strong> attending</p><p><strong><Count value={declined} /></strong> not attending</p></div>
    <h4>Guest list</h4>
    <ul className="offer-guests">{newest.map((item, index) => {
      const mine = item === reply;
      return <li key={mine ? "you" : item.name} data-new={mine || undefined}>
        <p><span className="offer-guest-name">{item.name || "Your reply"}</span>{mine && <span className="offer-new">New</span>}
          <span className="offer-guest-status">{item.attending === null ? "Replying…" : item.attending ? "Attending" : "Not attending"}</span></p>
        {mine || index < 3 ? demoFoodLines(item).map((line) => <p key={line} className="offer-guest-food">{line}</p>) : null}
      </li>;
    })}</ul>
    <h4>Catering numbers</h4>
    <div className="offer-catering">
      {courseCounts(summary, exampleMealMenu, true).map((block) => <div key={block.course}>
        <h5>{block.title}</h5>
        <dl>{block.options.map((option) => <div key={option.id}><dt>{option.label}</dt><dd><Count value={option.count} /></dd></div>)}</dl>
      </div>)}
      <div>
        <h5>Food preferences</h5>
        <dl>{dietaryCounts(summary).map(({ value, label, count }) => <div key={value}><dt>{label}</dt><dd><Count value={count} /></dd></div>)}</dl>
      </div>
    </div>
    <p className="offer-couple-note">Fictional replies. In your account, every reply is private to you.</p>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </div>;
}

function TryIt({ theme, hydrated }: { theme: WeddingTheme; hydrated: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [reply, setReply] = useState(emptyDemoReply);
  const [announcement, setAnnouncement] = useState("");
  // The example RSVP is same-origin and never submits; its form is read on every change, in the browser only.
  const connect = useCallback(() => {
    const form = frame.current?.contentDocument?.querySelector<HTMLFormElement>(".rsvp-card form");
    if (!form) { setReply(emptyDemoReply()); return; }
    const read = (announce: boolean) => {
      const next = demoReplyFromForm(new FormData(form));
      setReply(next);
      if (announce && demoStarted(next)) setAnnouncement(demoAnnouncement(next));
    };
    form.addEventListener("input", () => read(false));
    form.addEventListener("change", () => read(true));
    read(false);
  }, []);
  // A frame that finished loading before hydration fired its load event unseen.
  useEffect(() => {
    if (frame.current?.contentDocument?.readyState === "complete" && frame.current.contentWindow?.location.href !== "about:blank") connect();
  }, [connect]);
  return <section id="try-it" className="offer-try" aria-labelledby="try-title">
    <div className="offer-try-intro">
      <p className="marketing-kicker">04 · Optional · Try it yourself</p>
      <h3 id="try-title">RSVP, with meal choices</h3>
      <p>Guests reply from your Invitation or a link straight to RSVP, on their phone and without creating an account. Add your menu and attending guests choose a starter, main and dessert. Everyone attending can tell you about food preferences.</p>
      <p className="offer-try-hint">{hydrated ? "Reply to the example as a guest: add a name, accept, and choose your meal. The couple’s side updates as you go." : "Reply to the example as a guest."} Nothing is sent or saved.</p>
    </div>
    <div className="offer-try-grid">
      <div className="offer-try-guest"><p className="offer-couple-label">The guest’s phone</p><OfferPhone theme={theme} page="rsvp" interactive frameRef={frame} onFrameLoad={connect} /></div>
      <div className="offer-try-couple">
        <p className="marketing-kicker">05 · Your side</p>
        <h3>Every reply, in one place</h3>
        <p className="offer-try-couple-intro">Replies arrive in your private guest list, and the catering numbers are counted for you, ready for your caterer.</p>
        <CoupleView reply={reply} announcement={announcement} />
      </div>
    </div>
  </section>;
}

export function OfferShowcase({ initialTheme, accountHref, isAuthenticated }: { initialTheme: WeddingTheme; accountHref: string; isAuthenticated: boolean }) {
  const [theme, setTheme] = useState(initialTheme);
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  return <div className="offer-showcase" data-theme-choice={theme}>
    {/* Without JavaScript the radios submit as ?theme=, so the server renders the chosen design. */}
    <form className="offer-switcher" method="get" action={`${whatWeOfferPath}#showcase`} onSubmit={(event) => event.preventDefault()}>
      <fieldset>
        <legend><span className="offer-switcher-label">Design</span> <strong>{themeName(theme)}</strong></legend>
        <div className="offer-swatches">{themes.map((item) => <label key={item.id} className="offer-swatch">
          <input type="radio" name="theme" value={item.id} checked={theme === item.id} onChange={() => setTheme(item.id)} />
          <span className="offer-swatch-dot" style={{ background: swatchBackground(item.swatch) }} aria-hidden="true" />
          <span className="offer-swatch-name">{item.name}</span>
        </label>)}</div>
        {!hydrated && <button className="offer-switcher-submit">Show this design</button>}
      </fieldset>
      {/* Phones only; kept short so the swatches stay visible. */}
      <Link className="offer-switcher-cta" href={accountHref}>{isAuthenticated ? "Your workspace" : "Start free"}</Link>
    </form>
    <ol className="offer-steps">{steps.map((step, index) => <li key={step.page} className="offer-step">
      <div className="offer-step-copy">
        <p className="marketing-kicker">{step.number} · {step.when}</p>
        <h3>{step.title}</h3>
        {step.optional && <p className="offer-optional">Optional: switch it on if you need it</p>}
        {step.body.map((line) => <p key={line}>{line}</p>)}
        <a className="offer-example-link" href={exampleHref(theme, step.page)}>See the full {step.link} in {themeName(theme)}</a>
      </div>
      <OfferPhone theme={theme} page={step.page} eager={index === 0} />
    </li>)}</ol>
    <TryIt theme={theme} hydrated={hydrated} />
  </div>;
}
