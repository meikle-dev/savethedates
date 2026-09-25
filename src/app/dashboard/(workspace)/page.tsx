import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { detailsSchema } from "@/features/weddings/details";
import { formatWeddingDate } from "@/features/weddings/wedding";
import { AttendanceBadge } from "@/features/workspace/attendance-badge";
import { GuestLinkPanel } from "@/features/workspace/guest-link-panel";
import { Icon } from "@/features/workspace/workspace-icons";
import { guestLinkShare, loadLatestResponses, loadResponseTotals, loadWorkspace, rsvpReadiness } from "@/features/workspace/workspace-data";
import { daysUntil, guestPageStatuses, setupSteps, todayUtc, type RsvpAvailability } from "@/features/workspace/workspace-summary";

export const metadata: Metadata = { title: "Overview · SaveTheDates" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const rsvpLabels: Record<RsvpAvailability, string> = { open: "open", closed: "closed", off: "not accepting", "not-live": "opens when published", offline: "site offline" };
const emptyResponses: Record<RsvpAvailability, string> = {
  open: "No responses yet. Share your guest link to start collecting replies.",
  closed: "No responses yet, and RSVPs are closed.",
  off: "No responses yet. Open RSVPs when you’re ready to collect replies.",
  "not-live": "No responses yet. Guests can reply once your site is published.",
  offline: "No responses yet, and your site is no longer online.",
};

export default async function Overview() {
  const { wedding, entitlement, live, offline } = await loadWorkspace();
  // New accounts begin by saving the basics, which unlocks the other sections.
  if (!wedding) redirect("/dashboard/basics");

  const [totals, responses] = await Promise.all([loadResponseTotals(), loadLatestResponses(5)]);
  const today = todayUtc();
  const days = daysUntil(wedding.wedding_date, today);
  const rsvp = rsvpReadiness(wedding, live, offline);
  const availability = rsvp.availability;
  const steps = setupSteps({ ...detailsSchema.parse(wedding), photo_path: wedding.photo_path, rsvp_enabled: wedding.rsvp_enabled, invitation_enabled: wedding.invitation_enabled }, entitlement.active, live);
  const pages = guestPageStatuses(wedding, availability, live);
  const completed = steps.filter((step) => step.done).length;
  const setupComplete = steps.every((step) => step.done || step.optional);
  // The guest link only works while the site is live, so drafts and expired sites get no share panel.
  const share = guestLinkShare(wedding, live);
  const expiry = live && entitlement.expires_at ? formatWeddingDate(entitlement.expires_at.slice(0, 10)) : null;

  return <section aria-labelledby="overview-title">
    <header className="ws-page-head">
      <p className="eyebrow">Your wedding workspace</p>
      <h1 id="overview-title">{wedding.first_name} &amp; {wedding.second_name}</h1>
      <p>{live ? "Your wedding site is live. Changes you save appear to guests straight away." : offline ? "Your site is no longer online. Guests can’t open your guest link." : "Your site is a private draft. Only you can see it until you publish."}</p>
    </header>

    <div className="ws-stats">
      <article className="ws-stat" data-tone={live ? "live" : offline ? undefined : "draft"} aria-labelledby="stat-site">
        <span className="ws-stat-icon"><Icon name={live ? "globe" : "lock"} /></span>
        <h2 id="stat-site" className="ws-stat-label">Site status</h2>
        <p className="ws-stat-value">{live ? "Published" : offline ? "Offline" : "Private draft"}</p>
        <p className="ws-stat-note">{share
          ? <><a href="#guest-link">Share your guest link</a>{expiry && <> · online until {expiry}</>}</>
          : <Link href="/dashboard/publish">{entitlement.active ? "Ready to publish" : "Purchase and publish"}</Link>}</p>
      </article>
      <article className="ws-stat" aria-labelledby="stat-countdown">
        <span className="ws-stat-icon"><Icon name="details" /></span>
        <h2 id="stat-countdown" className="ws-stat-label">Countdown</h2>
        <p className="ws-stat-value">{days > 0 ? `${days.toLocaleString("en-GB")} ${days === 1 ? "day" : "days"}` : days === 0 ? "Today" : "Married"}</p>
        <p className="ws-stat-note">{days > 0 ? "until" : days === 0 ? "Your wedding day," : "on"} {formatWeddingDate(wedding.wedding_date)}</p>
      </article>
      <article className="ws-stat" aria-labelledby="stat-rsvp">
        <span className="ws-stat-icon"><Icon name="guests" /></span>
        <h2 id="stat-rsvp" className="ws-stat-label">RSVPs · {rsvpLabels[availability]}</h2>
        <p className="ws-stat-value">{totals.total} {totals.total === 1 ? "response" : "responses"}</p>
        <div>
          {totals.total > 0 && <div className="ws-meter" aria-hidden="true"><span className="is-attending" style={{ width: `${(totals.attending / totals.total) * 100}%` }} /><span className="is-declined" style={{ width: `${(totals.declined / totals.total) * 100}%` }} /></div>}
          <p className="ws-stat-note mt-2">{totals.attending} attending · {totals.declined} not attending</p>
          {/* Live sites state this in the guest link panel below; otherwise say it here so a closed RSVP is never missed. */}
          {!share && (availability === "off" || availability === "closed") && <p className="ws-stat-note mt-2">{rsvp.note} <Link href="/dashboard/rsvp">RSVP settings</Link></p>}
        </div>
      </article>
    </div>

    {share && <div className="mt-5"><GuestLinkPanel {...share} /></div>}

    <div className="ws-overview-grid">
      <div className="ws-stack">
        {!setupComplete && <section aria-labelledby="setup-title" className="ws-panel">
          <h2 id="setup-title">Setup checklist</h2>
          <p className="ws-panel-intro">{completed} of {steps.length} complete</p>
          <div className="ws-meter" aria-hidden="true"><span className="is-done" style={{ width: `${(completed / steps.length) * 100}%` }} /></div>
          <ul className="ws-checklist">
            {steps.map((step) => <li key={step.id}>
              <Link href={step.href} className="ws-row-link">
                <span className="ws-check" data-done={step.done}>{step.done && <Icon name="check" className="size-4" />}</span>
                <span>{step.label}{step.optional && <small>Optional</small>}<span className="sr-only">{step.done ? " (done)" : " (to do)"}</span></span>
                <Icon name="chevron" className="size-4" />
              </Link>
            </li>)}
          </ul>
        </section>}
        <section aria-labelledby="latest-title" className="ws-panel">
          <div className="ws-panel-head"><h2 id="latest-title">Latest responses</h2><Link href="/dashboard/guests" className="button button-quiet button-flush">View all guests<Icon name="arrowRight" /></Link></div>
          {responses.length === 0
            ? <p className="ws-empty">{emptyResponses[availability]}</p>
            : <ul className="ws-responses">{responses.map((response) => <li key={response.id}>
              <strong>{response.name}</strong>
              <AttendanceBadge attending={response.attending} />
              {response.respondedAt && <time dateTime={response.respondedAt}>{dateFormat.format(new Date(response.respondedAt))}</time>}
            </li>)}</ul>}
        </section>
      </div>
      <div className="ws-stack">
        <section aria-labelledby="pages-title" className="ws-panel">
          <h2 id="pages-title">Guest pages</h2>
          <p className="ws-panel-intro">Your guest link opens every page that’s on. Only Save the Date is required.</p>
          <ul className="ws-checklist">
            {pages.map((page) => <li key={page.id}>
              <Link href={page.href} className="ws-row-link">
                <span className="ws-page-dot" data-on={page.on} aria-hidden="true" />
                <span>{page.label}</span>
                <span className="ws-page-status">{page.status}</span>
                <Icon name="chevron" className="size-4" />
              </Link>
            </li>)}
          </ul>
        </section>
        <section aria-labelledby="actions-title" className="ws-panel">
          <h2 id="actions-title">Quick actions</h2>
          <div className="ws-actions">
            <Link href="/dashboard/preview" prefetch={false} className="button button-secondary"><Icon name="eye" />Preview your site</Link>
          </div>
        </section>
      </div>
    </div>
  </section>;
}
