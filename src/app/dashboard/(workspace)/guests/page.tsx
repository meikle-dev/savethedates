import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { guestHref, guestPageSize, parseGuestQuery, filteredCount, type GuestFilter, type GuestQuery } from "@/features/workspace/guest-list";
import { GuestTable } from "@/features/workspace/guest-responses";
import { loadCateringSummary, loadGuestPage, requireWedding } from "@/features/workspace/workspace-data";
import { CateringPanel } from "@/features/workspace/catering-panel";
import { showMealLines } from "@/features/workspace/catering";
import { parseMealMenu } from "@/features/weddings/meal-menu";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Guests · SaveTheDates" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const filterLabels: Record<GuestFilter, string> = { all: "All", attending: "Attending", "not-attending": "Not attending" };

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="guest-empty"><p className="guest-empty-title">{title}</p><p>{children}</p></div>;
}

function Pager({ query, count, pages, from, to }: { query: GuestQuery; count: number; pages: number; from: number; to: number }) {
  const step = (page: number, label: string, rel: string) => page >= 1 && page <= pages
    ? <Link href={guestHref({ ...query, page })} rel={rel} className="button button-secondary">{label}</Link>
    : <span className="button button-secondary is-disabled" aria-hidden="true">{label}</span>;
  return <nav className="guest-pager" aria-label="Guest response pages">
    <p aria-live="polite">Showing {(from + 1).toLocaleString("en-GB")}–{(to + 1).toLocaleString("en-GB")} of {count.toLocaleString("en-GB")}</p>
    {pages > 1 && <div>{step(query.page - 1, "Previous", "prev")}{step(query.page + 1, "Next", "next")}</div>}
  </nav>;
}

export default async function Guests({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseGuestQuery(await searchParams);
  const { totals, matches, count, pagination, rows } = await loadGuestPage(query);
  const { wedding } = await requireWedding();
  const menu = parseMealMenu(wedding.meal_menu);
  const mealsOn = wedding.meal_choices_enabled;
  const summary = totals.attending > 0 ? await loadCateringSummary() : null;
  const food = { menu, mealsOn, showMeals: showMealLines(mealsOn, menu, summary) };
  const reset = guestHref({ filter: "all", q: "", page: 1 });

  let body: React.ReactNode;
  if (totals.total === 0) {
    body = <EmptyState title="No responses yet">Share your guest link from <Link href="/dashboard/publish" className="text-link">Publish</Link> and replies will appear here.</EmptyState>;
  } else if (count === 0) {
    body = <EmptyState title="No matches">{query.q ? <>No {query.filter === "all" ? "" : `${filterLabels[query.filter].toLowerCase()} `}responses match “{query.q}”.</> : <>No responses are {filterLabels[query.filter].toLowerCase()} yet.</>} <Link href={reset} className="text-link">Show all responses</Link></EmptyState>;
  } else if (pagination.outOfRange) {
    body = <EmptyState title="Page out of range">There are only {pagination.pages} {pagination.pages === 1 ? "page" : "pages"} of responses. <Link href={guestHref({ ...query, page: pagination.pages })} className="text-link">Go to the last page</Link></EmptyState>;
  } else {
    body = <>
      <GuestTable food={food} caption={`Guest responses, newest first, page ${query.page} of ${pagination.pages}`} rows={rows.map((response) => ({ response, date: dateFormat.format(new Date(response.responded_at)) }))} />
      <Pager query={query} count={count} {...pagination} />
    </>;
  }

  return <WorkspacePage id="guests-title" eyebrow="Guests" title="Who’s coming" wide intro={<>Everyone who has replied, with private corrections if plans change. Share your link from the <Link href="/dashboard/rsvp" className="text-link">RSVP section</Link>.</>}>
    <div className="ws-stack">
      <div className="rsvp-summary" role="group" aria-label="RSVP summary"><div><strong>{totals.total}</strong><span>Responses</span></div><div><strong>{totals.attending}</strong><span>Attending</span></div><div><strong>{totals.declined}</strong><span>Not attending</span></div></div>
      {summary && summary.attending > 0 && <CateringPanel summary={summary} menu={menu} enabled={mealsOn} />}
      <section className="ws-panel" aria-labelledby="responses-title">
        <h2 id="responses-title">Guest responses</h2>
        <p className="ws-panel-intro">Each submission appears separately, even if two guests enter the same name. Contact guests to resolve duplicates or changes. {guestPageSize} responses per page, newest first.</p>
        {totals.total > 0 && <div className="guest-controls">
          <nav aria-label="Filter responses" className="guest-filters">
            {(Object.keys(filterLabels) as GuestFilter[]).map((filter) => <Link key={filter} href={guestHref({ ...query, filter, page: 1 })} aria-current={filter === query.filter ? "true" : undefined}>
              {filterLabels[filter]} <span className="guest-count">{filteredCount(filter, matches).toLocaleString("en-GB")}</span>
            </Link>)}
          </nav>
          <Form action="/dashboard/guests" role="search" className="guest-search">
            <label htmlFor="guest-search" className="field-label">Search by name</label>
            <div>
              <input key={query.q} id="guest-search" name="q" type="search" className="field-input" defaultValue={query.q} maxLength={80} autoComplete="off" />
              {query.filter !== "all" && <input type="hidden" name="filter" value={query.filter} />}
              <button className="button button-secondary">Search</button>
            </div>
            {query.q && <Link href={guestHref({ ...query, q: "", page: 1 })} className="text-link text-sm">Clear search</Link>}
          </Form>
        </div>}
        {body}
      </section>
    </div>
  </WorkspacePage>;
}
