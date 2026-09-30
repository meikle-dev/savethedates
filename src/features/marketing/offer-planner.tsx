"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { initials, shapeInfo, tableGeometry, unseatedGuests, type PlanGuest, type PlanTable } from "@/features/planning/seating";
import { TableShape } from "@/features/planning/table-card";
import type { DemoReply } from "./offer-demo";
import { demoAutoSeat, demoGuests, demoNotAttending, demoPlace, demoPlanGuests, demoTables, demoUnseat, initialDemoPlan, planDemoSummary, visitorId, type DemoResult } from "./offer-plan";

// F079: steps 06-07 of the showcase. The couple's workspace is never themed, so these sit outside the design switcher.

const pasted = [
  ["Isla MacLeod", "University friends", "Yes"],
  ["Rhys Evans", "Work friends", ""],
  ["", "Work friends", ""],
  ["Tom Hart", "Olivia’s family", "Yes"],
  ["Fatima Begum", "Work friends", "Yes"],
];
const preview: [name: string, skipped?: string][] = [["Isla MacLeod"], ["Rhys Evans"], ["Row 3", "No name"], ["Tom Hart", "Already on your list"], ["Fatima Begum"]];

/** A picture of the import: pasted cells beside the preview the couple checks before anything is added. */
function ImportPicture() {
  return <figure className="offer-import">
    <div className="offer-import-panels">
      <div className="offer-import-panel">
        <p className="offer-couple-label">Pasted from your spreadsheet</p>
        <table className="offer-import-sheet">
          <thead><tr><th scope="col">Name</th><th scope="col">Group</th><th scope="col">RSVP</th></tr></thead>
          <tbody>{pasted.map(([name, group, rsvp], index) => <tr key={index}><td>{name}</td><td>{group}</td><td>{rsvp}</td></tr>)}</tbody>
        </table>
      </div>
      <span className="offer-import-arrow" aria-hidden="true">→</span>
      <div className="offer-import-panel">
        <p className="offer-couple-label">Preview</p>
        <ul className="offer-import-preview">{preview.map(([name, skipped]) => <li key={name} data-skipped={skipped ? "" : undefined}>
          <span>{name}</span><span className="offer-import-result">{skipped ? `Skipped · ${skipped}` : "Add"}</span>
        </li>)}</ul>
      </div>
    </div>
    <figcaption>3 guests to add, 2 rows skipped. Start from our template, or use your own columns.</figcaption>
  </figure>;
}

function DemoTable({ table, seated, chosen, fresh, onSeat, hydrated }: {
  table: PlanTable; seated: PlanGuest[]; chosen: string | null; fresh: Map<string, number>; onSeat: (seat: number) => void; hydrated: boolean;
}) {
  const geometry = tableGeometry(table.shape, table.seats);
  const bySeat = new Map(seated.map((guest) => [guest.seat, guest]));
  const numbers = Array.from({ length: table.seats }, (_, index) => index + 1);
  const describe = (seat: number) => bySeat.get(seat)?.name ?? (table.keptEmpty.includes(seat) ? "Kept empty" : "Empty seat");
  // One tab stop per table; arrow keys, Home and End move between seats in number order.
  const [focusSeat, setFocusSeat] = useState(1);
  const diagram = useRef<HTMLDivElement>(null);
  function move(event: KeyboardEvent) {
    const next = { ArrowRight: focusSeat + 1, ArrowDown: focusSeat + 1, ArrowLeft: focusSeat - 1, ArrowUp: focusSeat - 1, Home: 1, End: table.seats }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const seat = ((next - 1 + table.seats) % table.seats) + 1;
    setFocusSeat(seat);
    diagram.current?.querySelector<HTMLButtonElement>(`[data-seat="${seat}"]`)?.focus();
  }

  return <article className="offer-plan-table" data-shape={table.shape}>
    <h4>{table.name}</h4>
    <p className="offer-plan-table-meta">{table.name !== shapeInfo[table.shape].label && `${shapeInfo[table.shape].label} · `}{seated.length} of {table.seats} seated</p>
    <div ref={diagram} className="offer-plan-diagram" role="group" aria-label={`${table.name}, ${shapeInfo[table.shape].label.toLowerCase()}, ${table.seats} seats`} onKeyDown={move}
      style={{ aspectRatio: `${geometry.width} / ${geometry.height}`, maxWidth: `${Math.round(geometry.width * 4)}px` }}>
      <TableShape geometry={geometry} className="offer-plan-shape" />
      {geometry.seats.map((position, index) => {
        const seat = index + 1;
        const guest = bySeat.get(seat);
        const kept = !guest && table.keptEmpty.includes(seat);
        const order = guest ? fresh.get(guest.id) : undefined;
        return <button key={seat} type="button" data-seat={seat} className="offer-plan-seat" data-state={guest ? "taken" : kept ? "kept" : "empty"}
          data-fresh={order !== undefined || undefined} data-chosen={(guest && guest.id === chosen) || undefined}
          tabIndex={seat === focusSeat ? 0 : -1} disabled={!hydrated} onFocus={() => setFocusSeat(seat)} onClick={() => onSeat(seat)}
          aria-label={`Seat ${seat}: ${kept ? "kept empty, can’t be used" : describe(seat)}`} aria-pressed={guest ? guest.id === chosen : undefined}
          style={{ left: `${(position.x / geometry.width) * 100}%`, top: `${(position.y / geometry.height) * 100}%`, "--seat": (10 / geometry.width) * 100, "--order": order ?? 0 } as React.CSSProperties}>
          {guest ? initials(guest.name) : kept ? "×" : seat}
        </button>;
      })}
    </div>
    {/* The seat buttons carry the names for assistive technology; this legend repeats them for everyone else. */}
    <ol className="offer-plan-legend" aria-hidden="true">{numbers.map((seat) => <li key={seat} data-state={bySeat.get(seat) ? "taken" : "empty"}>
      <span>{seat}</span>{describe(seat)}
    </li>)}</ol>
  </article>;
}

function TablePlanDemo({ reply, hydrated }: { reply: DemoReply; hydrated: boolean }) {
  const [plan, setPlan] = useState(initialDemoPlan);
  const [chosen, setChosen] = useState<string | null>(null);
  const [status, setStatus] = useState<{ message: string; refused?: boolean }>({ message: "" });
  const [fresh, setFresh] = useState(new Map<string, number>());
  const statusRef = useRef<HTMLParagraphElement>(null);

  const guests = demoPlanGuests(plan, reply);
  const summary = planDemoSummary(guests);
  const waiting = unseatedGuests(guests);
  const nameOf = (id: string) => guests.find((guest) => guest.id === id)?.name ?? "";
  // The visitor can leave the plan while chosen, by declining in the RSVP demo.
  const chosenGuest = chosen ? guests.find((guest) => guest.id === chosen) : undefined;
  const active = chosenGuest ? chosenGuest.id : null;
  const changed = plan.guests !== demoGuests || plan.visitor.seat !== null;
  const grouped = new Map<string, PlanGuest[]>();
  for (const guest of waiting) grouped.set(guest.group, [...grouped.get(guest.group) ?? [], guest]);
  const groups = [...grouped].sort(([a], [b]) => Number(a === "") - Number(b === ""));
  const notAttending = demoNotAttending(plan, reply);

  function done(result: DemoResult, keepChoice = false) {
    setPlan(result.plan);
    setStatus({ message: result.message, refused: result.refused });
    setFresh(new Map((result.seated ?? []).map((id, index) => [id, index])));
    if (!keepChoice) setChosen(null);
  }
  const focusStatus = () => requestAnimationFrame(() => statusRef.current?.focus());

  function choose(id: string) {
    if (active === id) { setChosen(null); setStatus({ message: "Cancelled." }); return; }
    setChosen(id);
    setStatus({ message: `${nameOf(id)} chosen. Now choose a seat.` });
  }
  function seat(table: PlanTable, number: number) {
    const occupant = guests.find((guest) => guest.tableId === table.id && guest.seat === number);
    if (active && active !== occupant?.id) { const result = demoPlace(plan, reply, active, table.id, number); done(result, result.refused); return; }
    if (occupant) { choose(occupant.id); return; }
    setStatus(table.keptEmpty.includes(number) ? { message: `Seat ${number} at ${table.name} is kept empty.`, refused: true } : { message: "Choose a guest first, then a seat." });
  }
  function seatEveryone() { done(demoAutoSeat(plan, reply)); focusStatus(); }
  function backToWaiting() { if (active) done(demoUnseat(plan, reply, active)); focusStatus(); }
  function cancel(moveFocus = true) { setChosen(null); setStatus({ message: "Cancelled." }); if (moveFocus) focusStatus(); }
  function reset() { setPlan(initialDemoPlan()); setChosen(null); setFresh(new Map()); setStatus({ message: "Plan reset." }); focusStatus(); }

  return <div className="offer-plan-app" onKeyDown={(event) => { if (event.key === "Escape" && active) cancel(false); }}>
    <p className="offer-plan-app-label">Your workspace · Table plan</p>
    <div className="offer-plan-summary">
      <p><strong><span key={summary.seated} className="offer-count">{summary.seated}</span></strong> of {summary.toSeat} guests seated · {summary.empty} empty seats · {summary.tables} tables</p>
      <div className="offer-plan-meter" aria-hidden="true"><span style={{ width: `${(summary.seated / summary.toSeat) * 100}%` }} /></div>
    </div>
    {hydrated && <div className="offer-plan-toolbar" role="group" aria-label="Table plan actions">
      <button type="button" className="offer-plan-button offer-plan-primary" disabled={!waiting.length || !summary.free} onClick={seatEveryone}>{waiting.length ? "Seat everyone automatically" : "Everyone’s seated"}</button>
      {changed && <button type="button" className="offer-plan-button" onClick={reset}>Start again</button>}
    </div>}
    <div className="offer-plan-status-row">
      <p ref={statusRef} className="offer-plan-status" role="status" aria-live="polite" tabIndex={-1} data-tone={status.refused ? "refused" : undefined}>{status.message}</p>
      {chosenGuest && <span className="offer-plan-choice-actions">
        {chosenGuest.tableId && <button type="button" className="offer-plan-button" onClick={backToWaiting}>Back to To be seated</button>}
        <button type="button" className="offer-plan-button" onClick={() => cancel()}>Cancel</button>
      </span>}
    </div>
    <div className="offer-plan-layout">
      <section className="offer-plan-waiting" aria-labelledby="plan-waiting-title">
        <h4 id="plan-waiting-title">To be seated <span className="offer-plan-count">{waiting.length}</span></h4>
        {waiting.length ? groups.map(([group, members]) => <div key={group || "none"} className="offer-plan-group">
          <p className="offer-couple-label">{group || "No group"}</p>
          <ul>{members.map((guest) => <li key={guest.id}>
            <button type="button" className="offer-plan-chip" aria-pressed={active === guest.id} disabled={!hydrated} onClick={() => choose(guest.id)}>
              {guest.name}{guest.id === visitorId && <span className="offer-new">New</span>}
            </button>
          </li>)}</ul>
        </div>) : <p className="offer-plan-done">Everyone’s seated.</p>}
        {notAttending.length > 0 && <p className="offer-plan-declined">Not attending, so not seated: {notAttending.join(", ")}</p>}
      </section>
      <div className="offer-plan-tables">{demoTables.map((table) => <DemoTable key={table.id} table={table} hydrated={hydrated}
        seated={guests.filter((guest) => guest.tableId === table.id)} chosen={active} fresh={fresh} onSeat={(number) => seat(table, number)} />)}</div>
    </div>
  </div>;
}

export function OfferPlanning({ reply, hydrated }: { reply: DemoReply; hydrated: boolean }) {
  return <section className="offer-planning" aria-labelledby="guest-list-title">
    <div className="offer-step offer-guest-list">
      <div className="offer-step-copy">
        <p className="marketing-kicker">06 · As the replies come in</p>
        <h3 id="guest-list-title">Your guest list, without the retyping</h3>
        <p className="offer-optional">Private to you. Guests never see it.</p>
        <p>Paste names straight from Excel, Google Sheets or Numbers, upload a CSV, or start from our template. You see every row before anything is saved, and you can undo the import.</p>
        <p>Group guests by family or friends, and update who’s attending from your RSVP replies in one go. Replies by post or WhatsApp? Mark them yourself.</p>
      </div>
      <ImportPicture />
    </div>
    <div id="table-plan" className="offer-plan">
      <div className="offer-try-intro">
        <p className="marketing-kicker">07 · The final weeks · Try it yourself</p>
        <h3>Your table plan, seat by seat</h3>
        <p>Add round, long and square tables and a top table, with up to 30 seats each. Seat guests from a list, tap to move or swap someone, or drag them on a computer. Or seat everyone automatically, with groups kept together.</p>
        <p>Empty seats are fine, and you can keep one free on purpose. Print the plan with an A–Z “Find your seat” list for your venue, or download it as a CSV.</p>
        <p className="offer-try-hint">{hydrated ? "Try it with Olivia and James’s guests: seat everyone automatically, then choose a guest and a seat to move or swap them." : "An example table plan with fictional guests."}{reply.attending === true && " You’re on the list too, from your RSVP above."} Nothing is sent or saved.</p>
      </div>
      <TablePlanDemo reply={reply} hydrated={hydrated} />
      <p className="offer-couple-note offer-plan-note">Fictional guests. In your account, your guest list and table plan are private to you, and look the same whichever design you choose.</p>
    </div>
  </section>;
}
