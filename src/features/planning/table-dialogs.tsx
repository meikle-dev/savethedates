"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/features/workspace/workspace-icons";
import { normaliseName } from "./guest-import";
import { Dialog, plural } from "./planning-ui";
import { freeSeats, maxTableNameLength, maxTableSeats, minTableSeats, nextTableName, shapeInfo, sortTables, tableShapes, unseatedGuests, type PlanGuest, type PlanTable, type TableShape } from "./seating";
import { ShapePreview } from "./table-card";

export type TableDraft = { name: string; shape: TableShape; seats: number; count: number };

function Stepper({ id, label, value, min, max, onChange, help }: { id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void; help?: React.ReactNode }) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next) || min));
  // What's typed stays as typed (so clearing the box and typing 8 gives 8); it's only clamped on leaving the field.
  const [text, setText] = useState<string | null>(null);
  const step = (next: number) => { setText(null); onChange(clamp(next)); };
  return <div>
    <label htmlFor={id} className="field-label">{label}</label>
    <div className="tp-stepper">
      <button type="button" className="icon-button" aria-label={`Fewer: ${label.toLowerCase()}`} disabled={value <= min} onClick={() => step(value - 1)}><span aria-hidden="true">−</span></button>
      <input id={id} type="number" inputMode="numeric" className="field-input" min={min} max={max} value={text ?? String(value)} aria-describedby={help ? `${id}-help` : undefined}
        onChange={(event) => {
          setText(event.target.value);
          const typed = Number(event.target.value);
          if (event.target.value !== "" && Number.isInteger(typed) && typed >= min && typed <= max) onChange(typed);
        }}
        onBlur={() => { if (text !== null) step(Number(text)); }} />
      <button type="button" className="icon-button" aria-label={`More: ${label.toLowerCase()}`} disabled={value >= max} onClick={() => step(value + 1)}><Icon name="plus" /></button>
    </div>
    {help && <p id={`${id}-help`} className="field-help">{help}</p>}
  </div>;
}

/** Add one or several tables, or edit one. Changing the type suggests its usual size until the size is changed by hand. */
export function TableDialog({ open, onClose, table, tables, short, pending, error, onSave, onDelete }: {
  open: boolean;
  onClose: () => void;
  table: PlanTable | null;
  tables: PlanTable[];
  /** Guests to seat beyond the free seats there are now. */
  short: number;
  pending: boolean;
  error: string;
  onSave: (draft: TableDraft) => void;
  onDelete: () => void;
}) {
  return <Dialog open={open} onClose={onClose} title={table ? `Edit ${table.name}` : "Add tables"} wide
    intro={table ? "Guests keep their seats. If you remove seats, anyone in them moves to a free seat." : "Choose a table type and size. You can add several at once."}>
    <TableForm key={table?.id ?? "new"} table={table} tables={tables} short={short} pending={pending} error={error} onSave={onSave} onDelete={onDelete} onCancel={onClose} />
  </Dialog>;
}

function TableForm({ table, tables, short, pending, error, onSave, onDelete, onCancel }: {
  table: PlanTable | null; tables: PlanTable[]; short: number; pending: boolean; error: string;
  onSave: (draft: TableDraft) => void; onDelete: () => void; onCancel: () => void;
}) {
  const [shape, setShape] = useState<TableShape>(table?.shape ?? "round");
  const [seats, setSeats] = useState(table?.seats ?? shapeInfo.round.defaultSeats);
  const [seatsTouched, setSeatsTouched] = useState(!!table);
  const [count, setCount] = useState(1);
  const [name, setName] = useState(table?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const suggested = nextTableName(tables, shape);
  const needed = short > 0 ? Math.ceil(short / seats) : 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({ name: count === 1 ? name.trim() || (table ? table.name : suggested) : "", shape, seats, count: table ? 1 : count });
  }

  if (confirmDelete && table) return <div className="plan-confirm">
    <p>Delete <strong>{table.name}</strong>? Anyone seated there goes back to “To be seated”.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-dialog-actions">
      <button type="button" className="button button-secondary" onClick={() => setConfirmDelete(false)}>Keep table</button>
      <button type="button" className="button button-danger" disabled={pending} onClick={onDelete}>{pending ? "Deleting…" : "Delete table"}</button>
    </div>
  </div>;

  return <form onSubmit={submit} noValidate className="tp-form">
    <fieldset>
      <legend className="field-label">Table type</legend>
      <div className="tp-shapes">
        {tableShapes.map((option) => <label key={option} className="tp-shape">
          <input type="radio" name="table-shape" value={option} checked={shape === option} onChange={() => { setShape(option); if (!seatsTouched) setSeats(shapeInfo[option].defaultSeats); }} />
          <ShapePreview table={{ shape: option, seats: shape === option ? seats : shapeInfo[option].defaultSeats }} />
          <span><strong>{shapeInfo[option].label}</strong><small>{shapeInfo[option].description}</small></span>
        </label>)}
      </div>
    </fieldset>
    <div className="tp-form-row">
      <Stepper id="table-seats" label="Seats at each table" value={seats} min={minTableSeats} max={maxTableSeats} onChange={(value) => { setSeats(value); setSeatsTouched(true); }}
        help={table ? undefined : `Up to ${maxTableSeats}. A table doesn’t have to be full.`} />
      {!table && <Stepper id="table-count" label="How many tables" value={count} min={1} max={50} onChange={setCount}
        help={needed > 0 ? <>{plural(short, "guest")} {short === 1 ? "doesn’t" : "don’t"} have a seat yet: about {plural(needed, "table")} of {seats}.</> : undefined} />}
    </div>
    {(table || count === 1) && <div>
      <label htmlFor="table-name" className="field-label">Name</label>
      <input id="table-name" className="field-input" value={name} placeholder={suggested} maxLength={maxTableNameLength} autoComplete="off" onChange={(event) => setName(event.target.value)} />
      {!table && <p className="field-help">Leave blank for “{suggested}”. Names like “Top table” or “Primrose” work too.</p>}
    </div>}
    {!table && count > 1 && <p className="field-help">They’ll be named {nextTableName(tables, shape)} onwards. You can rename any of them later.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-dialog-actions">
      {table && <button type="button" className="button button-quiet tp-delete" onClick={() => setConfirmDelete(true)}><Icon name="remove" />Delete table</button>}
      <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
      <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : table ? "Save table" : count === 1 ? "Add table" : `Add ${count} tables`}</button>
    </div>
  </form>;
}

/** Guests still to be seated, filtered by name or group, grouped under their group headings. */
function useUnseated(guests: PlanGuest[], query: string) {
  return useMemo(() => {
    const needle = normaliseName(query);
    const groups = new Map<string, PlanGuest[]>();
    for (const guest of unseatedGuests(guests)) {
      if (needle && !normaliseName(`${guest.name} ${guest.group}`).includes(needle)) continue;
      groups.set(guest.group, [...groups.get(guest.group) ?? [], guest]);
    }
    return [...groups].sort(([a], [b]) => (a || "￿").localeCompare(b || "￿", "en-GB"));
  }, [guests, query]);
}

function Search({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <div className="plan-search">
    <label htmlFor={id} className="sr-only">Search guests to seat</label>
    <Icon name="search" className="size-4" />
    <input id={id} type="search" className="field-input" placeholder="Search names or groups" value={value} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
  </div>;
}

/** Choose several guests for one table, up to its free seats. Whole groups can be selected at once. */
export function PickerDialog({ table, guests, onClose, onSeat }: { table: PlanTable | null; guests: PlanGuest[]; onClose: () => void; onSeat: (guestIds: string[]) => void }) {
  const free = table ? freeSeats(table, guests).length : 0;
  return <Dialog open={!!table} onClose={onClose} title={`Add guests to ${table?.name ?? "table"}`} intro={`${plural(free, "free seat")}. Guests are seated in the order you choose them.`} wide>
    {table && <Picker free={free} guests={guests} onClose={onClose} onSeat={onSeat} />}
  </Dialog>;
}

function Picker({ free, guests, onClose, onSeat }: { free: number; guests: PlanGuest[]; onClose: () => void; onSeat: (guestIds: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const groups = useUnseated(guests, query);
  const room = free - chosen.length;
  const toggle = (id: string) => setChosen((list) => list.includes(id) ? list.filter((item) => item !== id) : list.length < free ? [...list, id] : list);
  const chooseGroup = (members: PlanGuest[]) => setChosen((list) => {
    const missing = members.map((guest) => guest.id).filter((id) => !list.includes(id));
    return missing.length ? [...list, ...missing].slice(0, free) : list.filter((id) => !members.some((guest) => guest.id === id));
  });

  return <div className="tp-picker">
    <Search id="picker-search" value={query} onChange={setQuery} />
    <p className="tp-picker-count" role="status" aria-live="polite">{chosen.length} of {free} seats chosen{room === 0 && chosen.length > 0 ? " (table full)" : ""}</p>
    {groups.length === 0
      ? <p className="plan-empty-line">{query ? "Nobody matches." : "Everyone is seated."}</p>
      : <div className="tp-picker-groups">
        {groups.map(([group, members]) => {
          const all = members.every((guest) => chosen.includes(guest.id));
          return <fieldset key={group || "none"} className="tp-picker-group">
            <legend>{group || "No group"} <span>({members.length})</span></legend>
            {members.length > 1 && <button type="button" className="button button-quiet button-flush tp-group-select" onClick={() => chooseGroup(members)} disabled={!all && room === 0}>
              {all ? "Clear group" : members.length <= room || room === 0 ? `Choose all ${members.length}` : `Choose ${room} of ${members.length}`}
            </button>}
            {members.map((guest) => <label key={guest.id} className="plan-check tp-pick">
              <input type="checkbox" checked={chosen.includes(guest.id)} disabled={!chosen.includes(guest.id) && room === 0} onChange={() => toggle(guest.id)} />
              <span>{guest.name}{guest.status === "awaiting" && <small> · awaiting reply</small>}</span>
              {chosen.includes(guest.id) && <span className="tp-order"><span className="sr-only">, chosen </span>{chosen.indexOf(guest.id) + 1}<span className="sr-only"> of {chosen.length}</span></span>}
            </label>)}
          </fieldset>;
        })}
      </div>}
    <div className="plan-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
      <button type="button" className="button button-primary" disabled={chosen.length === 0} onClick={() => onSeat(chosen)}>{chosen.length ? `Seat ${plural(chosen.length, "guest")}` : "Seat guests"}</button>
    </div>
  </div>;
}

type SeatTarget = { table: PlanTable; seat: number };

/** An empty seat: pick a guest for it, or keep it empty. A kept-empty seat can be released. */
export function SeatDialog({ target, guests, onClose, onPlace, onKeepEmpty }: {
  target: SeatTarget | null; guests: PlanGuest[]; onClose: () => void; onPlace: (guestId: string) => void; onKeepEmpty: (keep: boolean) => void;
}) {
  const kept = !!target && target.table.keptEmpty.includes(target.seat);
  return <Dialog open={!!target} onClose={onClose} title={target ? `Seat ${target.seat} at ${target.table.name}` : "Seat"}
    intro={kept ? "This seat is kept empty, so nobody is placed here, even when seating automatically." : "Choose who sits here, or keep this seat empty."}>
    {target && (kept
      ? <div className="plan-dialog-actions">
        <button type="button" className="button button-secondary" onClick={onClose}>Close</button>
        <button type="button" className="button button-primary" onClick={() => onKeepEmpty(false)}>Make seat available</button>
      </div>
      : <SeatChooser guests={guests} onPlace={onPlace} onKeepEmpty={() => onKeepEmpty(true)} />)}
  </Dialog>;
}

function SeatChooser({ guests, onPlace, onKeepEmpty }: { guests: PlanGuest[]; onPlace: (guestId: string) => void; onKeepEmpty: () => void }) {
  const [query, setQuery] = useState("");
  const groups = useUnseated(guests, query);
  return <div className="tp-picker">
    <button type="button" className="button button-secondary tp-keep" onClick={onKeepEmpty}><span aria-hidden="true" className="tp-keep-mark">×</span>Keep this seat empty</button>
    <Search id="seat-search" value={query} onChange={setQuery} />
    {groups.length === 0
      ? <p className="plan-empty-line">{query ? "Nobody matches." : "Everyone is seated. To swap two people, choose one of them instead."}</p>
      : <div className="tp-picker-groups">
        {groups.map(([group, members]) => <div key={group || "none"} className="tp-picker-group">
          <h3>{group || "No group"}</h3>
          <ul className="tp-choice-list">{members.map((guest) => <li key={guest.id}>
            <button type="button" className="tp-choice" onClick={() => onPlace(guest.id)}>{guest.name}{guest.status === "awaiting" && <small>awaiting reply</small>}</button>
          </li>)}</ul>
        </div>)}
      </div>}
  </div>;
}

/**
 * A guest: seat, move or swap them by choosing a table and then a seat, all by tapping. An empty seat moves them there;
 * a taken seat swaps the two guests. Or take them off their table.
 */
export function GuestDialog({ guest, tables, guests, onClose, onPlace, onUnseat }: {
  guest: PlanGuest | null; tables: PlanTable[]; guests: PlanGuest[]; onClose: () => void; onPlace: (tableId: string, seat?: number) => void; onUnseat: () => void;
}) {
  const current = guest?.tableId ? tables.find((table) => table.id === guest.tableId) : undefined;
  return <Dialog open={!!guest} onClose={onClose} title={guest?.name ?? "Guest"}
    intro={current ? `${current.name}, seat ${guest!.seat}${guest!.group ? ` · ${guest!.group}` : ""}` : guest?.group ? `${guest.group} · not seated yet` : "Not seated yet"}>
    {guest && <GuestPlaces guest={guest} current={current} tables={tables} guests={guests} onPlace={onPlace} onUnseat={onUnseat} />}
  </Dialog>;
}

function GuestPlaces({ guest, current, tables, guests, onPlace, onUnseat }: {
  guest: PlanGuest; current: PlanTable | undefined; tables: PlanTable[]; guests: PlanGuest[]; onPlace: (tableId: string, seat?: number) => void; onUnseat: () => void;
}) {
  const [tableId, setTableId] = useState<string | null>(null);
  const chosen = tableId ? tables.find((table) => table.id === tableId) : undefined;
  if (chosen) {
    const bySeat = new Map(guests.filter((item) => item.tableId === chosen.id).map((item) => [item.seat, item]));
    return <div className="tp-picker">
      <button type="button" className="button button-quiet button-flush tp-back" autoFocus onClick={() => setTableId(null)}><Icon name="arrowLeft" />All tables</button>
      <h3 className="tp-subhead">Choose a seat at {chosen.name}</h3>
      <ul className="tp-choice-list">{Array.from({ length: chosen.seats }, (_, index) => index + 1).map((seat) => {
        const other = bySeat.get(seat);
        const kept = !other && chosen.keptEmpty.includes(seat);
        const here = other?.id === guest.id;
        return <li key={seat}>
          <button type="button" className="tp-choice" disabled={kept || here} onClick={() => onPlace(chosen.id, seat)}>
            <span className="tp-choice-seat"><span className="tp-seat-number" aria-hidden="true">{seat}</span><span><span className="sr-only">Seat {seat}: </span>{here ? `${guest.name} (here now)` : other ? (guest.tableId ? `Swap with ${other.name}` : `Take ${other.name}’s seat`) : kept ? "Kept empty" : "Empty seat"}</span></span>
            {!here && !kept && <small>{!other ? (guest.tableId ? "move here" : "sit here") : guest.tableId ? "swap" : `${other.name.split(" ")[0]} goes to To be seated`}</small>}
          </button>
        </li>;
      })}</ul>
    </div>;
  }
  const options = sortTables(tables).map((table) => ({ table, free: freeSeats(table, guests).length }));
  const firstFree = options.find(({ free }) => free > 0)?.table;
  return <div className="tp-picker">
    {current && <button type="button" className="button button-secondary" onClick={onUnseat}><Icon name="arrowLeft" />Remove from {current.name}</button>}
    {!current && firstFree && <button type="button" className="button button-primary" onClick={() => onPlace(firstFree.id)}>Seat at {firstFree.name}<Icon name="arrowRight" /></button>}
    <h3 className="tp-subhead">{current ? "Move or swap: choose a table" : firstFree ? "Or choose a table and seat" : "Choose a table"}</h3>
    {options.length === 0
      ? <p className="plan-empty-line">Add a table first.</p>
      : <ul className="tp-choice-list">{options.map(({ table, free }) => <li key={table.id}>
        <button type="button" className="tp-choice" onClick={() => setTableId(table.id)}>
          <span>{table.name}{table.id === current?.id && <span className="tp-here"> · their table</span>}</span>
          <small>{free ? `${free} free` : "full: swap"}</small>
        </button>
      </li>)}</ul>}
  </div>;
}

export function AutoSeatDialog({ open, count, free, onClose, onConfirm }: { open: boolean; count: number; free: number; onClose: () => void; onConfirm: () => void }) {
  return <Dialog open={open} onClose={onClose} title={`Seat ${plural(count, "guest")} automatically?`}
    intro="Groups are kept together and seated side by side where they fit. Nobody already seated is moved, and seats kept empty stay empty. You can undo this."
    footer={<>
      <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
      <button type="button" className="button button-primary" onClick={onConfirm}><Icon name="sparkle" />Seat {count > free ? `${free} of ${count}` : "them"}</button>
    </>}>
    {count > free && <p className="form-error">There are only {plural(free, "free seat")}, so {plural(count - free, "guest")} will still need a place. Add a table or more seats first if you can.</p>}
  </Dialog>;
}
