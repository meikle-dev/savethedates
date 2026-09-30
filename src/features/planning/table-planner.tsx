"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import { Icon } from "@/features/workspace/workspace-icons";
import { toCsv } from "./csv";
import { normaliseName } from "./guest-import";
import { addTables, deleteTable, saveSeats, updateTable } from "./planning-actions";
import { downloadFile, plural } from "./planning-ui";
import {
  applyAssignments,
  autoSeat,
  clearTable,
  inverseAssignments,
  placeGuest,
  planSummary,
  seatingRows,
  seatMany,
  shapeInfo,
  sortTables,
  unseat,
  unseatedGuests,
  type Assignment,
  type PlaceResult,
  type PlanGuest,
  type PlanTable,
} from "./seating";
import { TableCard, dropZone, guestDragType, type DragHandlers } from "./table-card";
import { AutoSeatDialog, GuestDialog, PickerDialog, SeatDialog, TableDialog, type TableDraft } from "./table-dialogs";

type Step = { label: string; undo: Assignment[] };
type Open =
  | { kind: "add" } | { kind: "edit"; tableId: string } | { kind: "pick"; tableId: string } | { kind: "seat"; tableId: string; seat: number }
  | { kind: "guest"; guestId: string } | { kind: "auto" };

const maxUndo = 20;
const refusals: Record<Exclude<PlaceResult, { ok: true }>["reason"], string> = {
  declined: "isn’t attending, so can’t be seated. Change their RSVP in your guest list first.",
  full: "can’t go there: that table is full.",
  kept_empty: "can’t go there: that seat is kept empty.",
  no_seat: "can’t go there: that seat doesn’t exist.",
  unknown: "couldn’t be seated. Refresh the page and try again.",
};

/** F078: the table plan. Changes apply instantly in the browser and save in the background; the database checks them. */
export function TablePlanner({ initialGuests, initialTables, couple }: { initialGuests: PlanGuest[]; initialTables: PlanTable[]; couple: string }) {
  const [guests, setGuests] = useState(initialGuests);
  const [tables, setTables] = useState(initialTables);
  const [history, setHistory] = useState<Step[]>([]);
  const [open, setOpen] = useState<Open | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "refused"; message: string }>({ tone: "ok", message: "" });
  const [failure, setFailure] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  // Open on phones until someone is seated, so the first thing a couple sees is who needs a seat.
  const [showUnseated, setShowUnseated] = useState(() => !initialGuests.some((guest) => guest.tableId));
  // After an action removes the control that had focus (a seated guest's button, a deleted table), focus the status.
  const [announced, setAnnounced] = useState(0);
  useEffect(() => {
    if (announced && (!document.activeElement || document.activeElement === document.body)) document.getElementById("tp-status")?.focus({ preventScroll: true });
  }, [announced]);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const ordered = useMemo(() => sortTables(tables), [tables]);
  const summary = planSummary(tables, guests);
  const waiting = useMemo(() => unseatedGuests(guests), [guests]);
  const byTable = useMemo(() => {
    const map = new Map<string, PlanGuest[]>();
    for (const guest of guests) if (guest.tableId) map.set(guest.tableId, [...map.get(guest.tableId) ?? [], guest]);
    return map;
  }, [guests]);
  const nameOf = (id: string) => guests.find((guest) => guest.id === id)?.name ?? "Guest";
  const tableOf = (id: string) => tables.find((table) => table.id === id);

  function save(assignments: Assignment[]) {
    startTransition(async () => {
      const result = await saveSeats(assignments);
      if (!result.ok) setFailure(result.message);
    });
  }

  /** Applies seat changes now, remembers how to undo them, and saves them. */
  function commit(assignments: Assignment[], label: string, message: string) {
    if (!assignments.length) return;
    const undo = inverseAssignments(guests, assignments);
    setGuests(applyAssignments(guests, assignments));
    setHistory((steps) => [...steps.slice(1 - maxUndo), { label, undo }]);
    say(message);
    save(assignments);
  }

  function say(message: string, tone: "ok" | "refused" = "ok") {
    setStatus({ tone, message });
    setAnnounced((count) => count + 1);
  }

  function undoLast() {
    const step = history.at(-1);
    if (!step) return;
    setHistory(history.slice(0, -1));
    setGuests(applyAssignments(guests, step.undo));
    say(`Undone: ${step.label}.`);
    save(step.undo);
  }

  function place(guestId: string, tableId: string, seat?: number) {
    const table = tableOf(tableId);
    const result = placeGuest(tables, guests, guestId, tableId, seat);
    if (!result.ok) { say(`${nameOf(guestId)} ${refusals[result.reason]}`, "refused"); return false; }
    const placed = result.assignments.find((item) => item.guestId === guestId);
    const swapped = result.assignments.find((item) => item.guestId !== guestId);
    const where = `${table?.name}, seat ${placed?.seat}`;
    // Someone already in the seat takes the mover's old seat, or goes back to "To be seated" if the mover had none.
    const message = !swapped ? `${nameOf(guestId)} seated at ${where}.`
      : swapped.tableId ? `${nameOf(guestId)} and ${nameOf(swapped.guestId)} swapped places.`
      : `${nameOf(guestId)} seated at ${where}. ${nameOf(swapped.guestId)} moved to “To be seated”.`;
    commit(result.assignments, `seat ${nameOf(guestId)}`, message);
    return true;
  }

  function takeOff(guestId: string) {
    commit(unseat(guests, guestId), `move ${nameOf(guestId)} off their table`, `${nameOf(guestId)} moved to “To be seated”.`);
  }

  function seatAll() {
    const { assignments, unplaced } = autoSeat(tables, guests);
    setOpen(null);
    commit(assignments, "automatic seating", `${plural(assignments.length, "guest")} seated${unplaced ? `. ${plural(unplaced, "guest")} still need${unplaced === 1 ? "s" : ""} a seat: add a table or more seats` : ""}.`);
  }

  // Table changes rebuild seats, so earlier undo steps may no longer apply; they are cleared.
  function saveTable(draft: TableDraft) {
    setDialogError("");
    const editing = open?.kind === "edit" ? tableOf(open.tableId) : undefined;
    startTransition(async () => {
      if (!editing) {
        const result = await addTables({ shape: draft.shape, seats: draft.seats, count: draft.count, name: draft.name || undefined });
        if (!result.ok) { setDialogError(result.message); return; }
        setTables((list) => [...list, ...result.tables]);
        say(`${result.tables.length === 1 ? result.tables[0].name : plural(result.tables.length, "table")} added.`);
        setOpen(null);
        return;
      }
      const result = await updateTable({ id: editing.id, name: draft.name, shape: draft.shape, seats: draft.seats, keptEmpty: editing.keptEmpty });
      if (!result.ok) { setDialogError(result.message); return; }
      setTables((list) => list.map((table) => table.id === editing.id ? result.table : table));
      setGuests((list) => applyAssignments(list, result.assignments));
      setHistory([]);
      const moved = result.unseated.map(nameOf);
      say(moved.length ? `${result.table.name} saved. ${moved.join(", ")} moved to “To be seated”: there wasn’t a seat left for them.` : `${result.table.name} saved.`);
      setOpen(null);
    });
  }

  function removeTable(tableId: string) {
    const table = tableOf(tableId);
    startTransition(async () => {
      const result = await deleteTable(tableId);
      if (!result.ok) { setDialogError(result.message); return; }
      setGuests((list) => applyAssignments(list, clearTable(list, tableId)));
      setTables((list) => list.filter((item) => item.id !== tableId));
      setHistory([]);
      say(`${table?.name ?? "Table"} deleted.`);
      setOpen(null);
    });
  }

  function keepEmpty(table: PlanTable, seat: number, keep: boolean) {
    const keptEmpty = keep ? [...table.keptEmpty, seat].sort((a, b) => a - b) : table.keptEmpty.filter((item) => item !== seat);
    setTables((list) => list.map((item) => item.id === table.id ? { ...item, keptEmpty } : item));
    setOpen(null);
    // Undo steps could put someone back in a seat that is now kept empty, so they're cleared, as for other table changes.
    setHistory([]);
    say(keep ? `Seat ${seat} at ${table.name} will stay empty.` : `Seat ${seat} at ${table.name} is available again.`);
    startTransition(async () => {
      const result = await updateTable({ id: table.id, name: table.name, shape: table.shape, seats: table.seats, keptEmpty });
      if (!result.ok) {
        setTables((list) => list.map((item) => item.id === table.id ? table : item));
        setFailure(result.message);
        return;
      }
      // Normally nothing moves, unless another tab had just seated someone there.
      if (result.assignments.length) {
        setGuests((list) => applyAssignments(list, result.assignments));
        setHistory([]);
      }
    });
  }

  function openSeat(table: PlanTable, seat: number) {
    const guest = guests.find((item) => item.tableId === table.id && item.seat === seat);
    setOpen(guest ? { kind: "guest", guestId: guest.id } : { kind: "seat", tableId: table.id, seat });
  }

  function exportPlan() {
    downloadFile("table-plan.csv", toCsv(seatingRows(tables, guests)));
  }

  const drag: DragHandlers = {
    dragging,
    start: (event: DragEvent, guestId: string) => {
      event.dataTransfer.setData(guestDragType, guestId);
      event.dataTransfer.effectAllowed = "move";
      setDragging(guestId);
    },
    end: () => setDragging(null),
    drop: (event: DragEvent, tableId: string | null, seat?: number) => {
      event.preventDefault();
      event.stopPropagation();
      const guestId = event.dataTransfer.getData(guestDragType) || dragging;
      setDragging(null);
      if (!guestId || !guests.some((guest) => guest.id === guestId)) return;
      if (tableId) place(guestId, tableId, seat);
      else takeOff(guestId);
    },
  };

  const shortBy = Math.max(0, waiting.length - summary.free);
  const needle = normaliseName(query);
  const waitingGroups = useMemo(() => {
    const groups = new Map<string, PlanGuest[]>();
    for (const guest of waiting) {
      if (needle && !normaliseName(`${guest.name} ${guest.group}`).includes(needle)) continue;
      groups.set(guest.group, [...groups.get(guest.group) ?? [], guest]);
    }
    return [...groups].sort(([a], [b]) => (a || "￿").localeCompare(b || "￿", "en-GB"));
  }, [waiting, needle]);
  const editing = open?.kind === "edit" ? tableOf(open.tableId) ?? null : null;
  const seatTarget = open?.kind === "seat" && tableOf(open.tableId) ? { table: tableOf(open.tableId)!, seat: open.seat } : null;
  const selectedGuest = open?.kind === "guest" ? guests.find((guest) => guest.id === open.guestId) ?? null : null;

  return <>
    <div className="ws-stack tp-screen">
      <section className="tp-summary" aria-label="Table plan summary">
        <div className="tp-summary-main">
          <p><strong>{summary.seated}</strong> of {plural(summary.toSeat, "guest")} seated</p>
          <div className="ws-meter" aria-hidden="true"><span className="is-done" style={{ width: `${summary.toSeat ? (summary.seated / summary.toSeat) * 100 : 0}%` }} /></div>
        </div>
        <dl className="tp-summary-figures">
          <div><dt>Tables</dt><dd>{summary.tables}</dd></div>
          <div><dt>Seats</dt><dd>{summary.seats}</dd></div>
          <div><dt>Empty seats</dt><dd>{summary.free + summary.keptEmpty}</dd></div>
        </dl>
        {shortBy > 0 && tables.length > 0 && <p className="tp-warning"><Icon name="alert" className="size-4" />You need {plural(shortBy, "more seat")} for everyone still to be seated. Add a table or more seats.</p>}
      </section>

      <div className="plan-toolbar" role="group" aria-label="Table plan actions">
        <button type="button" className="button button-primary" onClick={() => { setDialogError(""); setOpen({ kind: "add" }); }}><Icon name="plus" />Add tables</button>
        <button type="button" className="button button-secondary tp-auto" disabled={!waiting.length || !summary.free} onClick={() => setOpen({ kind: "auto" })}><Icon name="sparkle" />Seat everyone automatically</button>
        <button type="button" className="button button-secondary tp-undo" disabled={!history.length} onClick={undoLast} aria-label={history.length ? `Undo ${history.at(-1)!.label}` : "Undo"}><Icon name="undo" />Undo</button>
        <span className="plan-toolbar-end">
          <button type="button" className="button button-quiet" disabled={!tables.length} onClick={() => window.print()}><Icon name="print" />Print</button>
          <button type="button" className="button button-quiet" disabled={!tables.length} onClick={exportPlan}><Icon name="download" />Download CSV</button>
        </span>
      </div>

      <p id="tp-status" className="tp-status" data-tone={status.tone} role="status" aria-live="polite" tabIndex={-1}>{status.message}</p>
      {failure && <div className="form-error plan-notice" role="alert">
        <span>{failure}</span>
        <button type="button" className="button button-secondary" onClick={() => window.location.reload()}><Icon name="refresh" />Refresh</button>
      </div>}

      {guests.length === 0 && <div className="form-notice plan-notice"><span>Your guest list is empty. Add your guests first, then seat them here.</span><Link href="/dashboard/guest-list" className="button button-secondary">Go to your guest list</Link></div>}

      <div className="tp-layout" data-dragging={dragging ? "" : undefined}>
        <aside className="ws-panel tp-waiting" aria-labelledby="waiting-title" {...dropZone(drag, null)}>
          <div className="tp-waiting-head">
            <h2 id="waiting-title">To be seated <span className="plan-count">{waiting.length}</span></h2>
            <button type="button" className="button button-quiet tp-waiting-toggle" aria-expanded={showUnseated} aria-controls="waiting-list" onClick={() => setShowUnseated(!showUnseated)}>
              {showUnseated ? "Hide" : "Show"}<Icon name="chevron" className="size-4" />
            </button>
          </div>
          <div id="waiting-list" className="tp-waiting-body" data-open={showUnseated || undefined}>
            {waiting.length > 0 && <div className="plan-search">
              <label htmlFor="waiting-search" className="sr-only">Search guests to seat</label>
              <Icon name="search" className="size-4" />
              <input id="waiting-search" type="search" className="field-input" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
            </div>}
            <p className="tp-waiting-hint">{waiting.length ? <>Choose a guest to seat them<span className="tp-drag-tip">, or drag them onto a table</span>.</> : guests.length ? "Everyone is seated." : "Nobody to seat yet."}</p>
            {waitingGroups.map(([group, members]) => <div key={group || "none"} className="tp-waiting-group">
              <h3>{group || "No group"} <span>{members.length}</span></h3>
              <ul>{members.map((guest) => <li key={guest.id}>
                <button type="button" className="tp-guest" draggable onDragStart={(event) => drag.start(event, guest.id)} onDragEnd={drag.end} onClick={() => setOpen({ kind: "guest", guestId: guest.id })}>
                  <span>{guest.name}</span>{guest.status === "awaiting" && <small>awaiting reply</small>}
                </button>
              </li>)}</ul>
            </div>)}
            {dragging && guests.find((guest) => guest.id === dragging)?.tableId && <p className="tp-drop-hint">Drop here to take them off their table</p>}
          </div>
        </aside>

        <div className="tp-tables">
          {ordered.length === 0
            ? <section className="ws-panel plan-start" aria-labelledby="no-tables-title">
              <h2 id="no-tables-title">Add your tables</h2>
              <p className="ws-panel-intro">Choose round, long, square or a top table, and how many seats each has. You can add several at once, such as ten round tables of ten.{waiting.length > 0 && <> You have {plural(waiting.length, "guest")} to seat.</>}</p>
              <div className="plan-start-actions"><button type="button" className="button button-primary" onClick={() => setOpen({ kind: "add" })}><Icon name="plus" />Add tables</button></div>
            </section>
            : ordered.map((table) => <TableCard key={table.id} table={table} seated={byTable.get(table.id) ?? []} drag={drag}
              onSeat={(seat) => openSeat(table, seat)} onAdd={() => setOpen({ kind: "pick", tableId: table.id })} onEdit={() => { setDialogError(""); setOpen({ kind: "edit", tableId: table.id }); }} />)}
        </div>
      </div>
    </div>

    <PrintPlan couple={couple} tables={ordered} guests={guests} />

    <TableDialog open={open?.kind === "add" || !!editing} onClose={() => setOpen(null)} table={editing} tables={tables} short={shortBy}
      pending={pending} error={dialogError} onSave={saveTable} onDelete={() => editing && removeTable(editing.id)} />
    <PickerDialog table={open?.kind === "pick" ? tableOf(open.tableId) ?? null : null} guests={guests} onClose={() => setOpen(null)}
      onSeat={(ids) => {
        if (open?.kind !== "pick") return;
        const table = tableOf(open.tableId)!;
        const { assignments } = seatMany(tables, guests, ids, table.id);
        setOpen(null);
        commit(assignments, `seat guests at ${table.name}`, `${plural(assignments.length, "guest")} seated at ${table.name}.`);
      }} />
    <SeatDialog target={seatTarget} guests={guests} onClose={() => setOpen(null)}
      onPlace={(guestId) => { if (seatTarget && place(guestId, seatTarget.table.id, seatTarget.seat)) setOpen(null); }}
      onKeepEmpty={(keep) => seatTarget && keepEmpty(seatTarget.table, seatTarget.seat, keep)} />
    <GuestDialog guest={selectedGuest} tables={tables} guests={guests} onClose={() => setOpen(null)}
      onPlace={(tableId, seat) => { if (selectedGuest && place(selectedGuest.id, tableId, seat)) setOpen(null); }}
      onUnseat={() => { if (selectedGuest) takeOff(selectedGuest.id); setOpen(null); }} />
    <AutoSeatDialog open={open?.kind === "auto"} count={waiting.length} free={summary.free} onClose={() => setOpen(null)} onConfirm={seatAll} />
  </>;
}

/** Printed only: every table with its seats, then an A–Z list so guests (and the venue) can find a seat. */
function PrintPlan({ couple, tables, guests }: { couple: string; tables: PlanTable[]; guests: PlanGuest[] }) {
  const names = new Map(tables.map((table) => [table.id, table.name]));
  const seated = guests.filter((guest) => guest.tableId).sort((a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }));
  return <section className="tp-print">
    <h1>Table plan</h1>
    <p>{couple}</p>
    <div className="tp-print-tables">
      {tables.map((table) => {
        const bySeat = new Map(guests.filter((guest) => guest.tableId === table.id).map((guest) => [guest.seat, guest.name]));
        return <div key={table.id} className="tp-print-table">
          <h2>{table.name}</h2>
          <p>{shapeInfo[table.shape].label} · {table.seats} seats</p>
          <ol>{Array.from({ length: table.seats }, (_, index) => index + 1).map((seat) => <li key={seat} data-empty={!bySeat.has(seat) || undefined}>{bySeat.get(seat) ?? "Empty seat"}</li>)}</ol>
        </div>;
      })}
    </div>
    {seated.length > 0 && <div className="tp-print-index">
      <h2>Find your seat</h2>
      <ul>{seated.map((guest) => <li key={guest.id}><span>{guest.name}</span><span>{names.get(guest.tableId!)}</span></li>)}</ul>
    </div>}
  </section>;
}

