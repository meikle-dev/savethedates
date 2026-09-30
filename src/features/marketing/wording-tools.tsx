"use client";

import { useState } from "react";
import { copyText } from "@/features/workspace/copy-link-button";
import { formatWeddingDate } from "@/features/weddings/wedding";
import { fillWording, sendingPlan, type SendingPlan, type SendingWindow, type WordingDetails, type WordingGroup } from "./wording";

// F077. The server renders every template with its [placeholders], so the wording is readable and indexable before
// (and without) JavaScript; typing the couple's details only changes what is shown and copied. Nothing is stored or sent.
export function WordingTemplates({ groups }: { groups: WordingGroup[] }) {
  const [details, setDetails] = useState<WordingDetails>({ names: "", date: "", place: "", link: "" });
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null);
  // Editing a detail changes every message, so an earlier "Copied" no longer describes what's on screen.
  const field = (key: keyof WordingDetails) => ({ value: details[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setDetails({ ...details, [key]: event.target.value }); setCopied(null); } });

  async function copy(id: string, title: string, text: string) {
    setStatus("");
    const ok = await copyText(text);
    setCopied({ id, ok });
    setStatus(ok ? `Copied “${title}”. Paste it into WhatsApp, a text or an email.` : "Your browser didn’t allow copying. Select the message and copy it instead.");
  }

  return <>
    <fieldset className="wording-fields">
      <legend>Add your details <span>(optional, and they never leave this page)</span></legend>
      <label>Your names<input type="text" autoComplete="off" placeholder="Olivia & James" maxLength={80} {...field("names")} /></label>
      <label>Wedding date<input type="date" {...field("date")} /></label>
      <label>Town or venue<input type="text" autoComplete="off" placeholder="Lake Como" maxLength={120} {...field("place")} /></label>
      <label>Your link<input type="url" autoComplete="off" inputMode="url" placeholder="https://…" maxLength={300} {...field("link")} /></label>
    </fieldset>
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {groups.map((group) => <section key={group.id} className="wording-group" aria-labelledby={`wording-${group.id}`}>
      <div className="wording-group-intro"><h3 id={`wording-${group.id}`}>{group.heading}</h3><p>{group.intro}</p></div>
      <div className="wording-cards">
        {group.templates.map((template) => {
          const text = fillWording(template.text, details);
          const id = `${group.id}-${template.id}`;
          const result = copied?.id === id ? copied.ok : null;
          return <article key={template.id} className="wording-card">
            <h4>{template.title}</h4>
            <p className="wording-text">{text}</p>
            <button type="button" className="wording-copy" aria-label={`${result ? "Copied" : "Copy message"}: ${template.title}`} onClick={() => copy(id, template.title, text)}>{result ? "Copied" : "Copy message"}</button>
            {result === false && <p className="wording-copy-failed">Copying isn’t allowed here. Select the message and copy it instead.</p>}
          </article>;
        })}
      </div>
    </section>)}
  </>;
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// A window that has opened reads "Now until …"; one that has closed says so instead of showing past dates as advice.
function Window({ label, window }: { label: string; window: SendingWindow }) {
  return <li><strong>{label}</strong>
    {window.late ? <em>The usual time has passed, so send them as soon as you can.</em>
      : <span>{window.started ? `Now until ${formatWeddingDate(window.to)}` : `${formatWeddingDate(window.from)} to ${formatWeddingDate(window.to)}`}</span>}</li>;
}

function summary(plan: SendingPlan) {
  const next = !plan.saveTheDate.late ? "save the dates" : !plan.invitation.late ? "invitations" : null;
  return next ? `Your dates are ready. Next: your ${next}.` : "Your dates are ready. The usual sending times have passed.";
}

export function SendingPlanner() {
  const [date, setDate] = useState("");
  const [destination, setDestination] = useState(false);
  const plan = date ? sendingPlan(date, destination, localToday()) : null;
  return <div className="wording-planner">
    <div className="wording-planner-fields">
      <label>Your wedding date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="wording-check"><input type="checkbox" checked={destination} onChange={(event) => setDestination(event.target.checked)} />A destination wedding or a popular date</label>
    </div>
    {/* Only a short summary is announced; the full plan is read on demand rather than on every keystroke. */}
    <p className="sr-only" aria-live="polite">{plan ? summary(plan) : ""}</p>
    {plan ? <ol className="wording-plan">
      <Window label="Send your save the dates" window={plan.saveTheDate} />
      <Window label="Send your invitations" window={plan.invitation} />
      <li><strong>Ask for replies by</strong>{plan.replyBy.late ? <em>That date has passed, so ask guests to reply as soon as they can.</em> : <span>{formatWeddingDate(plan.replyBy.date)}</span>}</li>
    </ol> : <p className="wording-plan-empty">{date ? "Choose a wedding date in the future." : "Choose your wedding date to see your dates."}</p>}
  </div>;
}
