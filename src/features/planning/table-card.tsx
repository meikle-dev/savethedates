"use client";

import type { DragEvent } from "react";
import { Icon } from "@/features/workspace/workspace-icons";
import { freeSeats, initials, shapeInfo, tableGeometry, type PlanGuest, type PlanTable, type TableGeometry } from "./seating";

export type DragHandlers = {
  dragging: string | null;
  start: (event: DragEvent, guestId: string) => void;
  end: () => void;
  drop: (event: DragEvent, tableId: string | null, seat?: number) => void;
};

/** The drag data type for a guest, so text or files dragged in from elsewhere are ignored. */
export const guestDragType = "application/x-savethedates-guest";
const carriesGuest = (event: DragEvent) => event.dataTransfer.types.includes(guestDragType);

/** A drop target for guests. Always attached, so a quick drag works before React has re-rendered. */
export const dropZone = (drag: DragHandlers, tableId: string | null, seat?: number) => ({
  onDragOver: (event: DragEvent) => { if (!carriesGuest(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; },
  onDragEnter: (event: DragEvent) => { if (carriesGuest(event)) (event.currentTarget as HTMLElement).setAttribute("data-over", ""); },
  onDragLeave: (event: DragEvent) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) (event.currentTarget as HTMLElement).removeAttribute("data-over"); },
  onDrop: (event: DragEvent) => { (event.currentTarget as HTMLElement).removeAttribute("data-over"); if (carriesGuest(event)) drag.drop(event, tableId, seat); },
});

/** The table's outline, drawn from the same geometry as the seats. */
export function TableShape({ geometry, className }: { geometry: TableGeometry; className?: string }) {
  const { body } = geometry;
  return <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className={className} aria-hidden="true" focusable="false">
    {body.kind === "circle"
      ? <circle cx={body.cx} cy={body.cy} r={body.r} />
      : <rect x={body.x} y={body.y} width={body.width} height={body.height} rx={3} />}
  </svg>;
}

/** A small drawing of a table type with its seats, for the type picker. */
export function ShapePreview({ table }: { table: Pick<PlanTable, "shape" | "seats"> }) {
  const geometry = tableGeometry(table.shape, table.seats);
  return <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="tp-shape-preview" aria-hidden="true" focusable="false">
    {geometry.body.kind === "circle"
      ? <circle cx={geometry.body.cx} cy={geometry.body.cy} r={geometry.body.r} className="tp-body" />
      : <rect x={geometry.body.x} y={geometry.body.y} width={geometry.body.width} height={geometry.body.height} rx={3} className="tp-body" />}
    {geometry.seats.map((seat, index) => <circle key={index} cx={seat.x} cy={seat.y} r={4.2} className="tp-chair" />)}
  </svg>;
}

export function TableCard({ table, seated, drag, onSeat, onAdd, onEdit }: {
  table: PlanTable;
  seated: PlanGuest[];
  drag: DragHandlers;
  onSeat: (seat: number) => void;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const geometry = tableGeometry(table.shape, table.seats);
  const bySeat = new Map(seated.map((guest) => [guest.seat, guest]));
  const free = freeSeats(table, seated).length;
  const seatNumbers = Array.from({ length: table.seats }, (_, index) => index + 1);
  const describe = (seat: number) => {
    const guest = bySeat.get(seat);
    return guest ? guest.name : table.keptEmpty.includes(seat) ? "Kept empty" : "Empty seat";
  };

  return <article className="tp-card" aria-labelledby={`table-${table.id}`} {...dropZone(drag, table.id)} data-full={free === 0 || undefined}>
    <header className="tp-card-head">
      <div>
        <h3 id={`table-${table.id}`}>{table.name}</h3>
        <p>{shapeInfo[table.shape].label} · <span className="tp-fill">{seated.length} of {table.seats} seated</span></p>
      </div>
      <button type="button" className="icon-button" aria-label={`Edit ${table.name}`} onClick={onEdit}><Icon name="edit" /></button>
    </header>

    {/* Pointer and drop targets. Keyboard and screen reader users use the seat list below, which has the same actions. */}
    <div className="tp-diagram" style={{ aspectRatio: `${geometry.width} / ${geometry.height}`, maxWidth: `${Math.round(geometry.width * 3.6)}px` }} aria-hidden="true">
      <TableShape geometry={geometry} className="tp-diagram-table" />
      {geometry.seats.map((position, index) => {
        const seat = index + 1;
        const guest = bySeat.get(seat);
        const kept = !guest && table.keptEmpty.includes(seat);
        return <button key={seat} type="button" tabIndex={-1} className="tp-seat" data-state={guest ? "taken" : kept ? "kept" : "empty"}
          style={{ left: `${(position.x / geometry.width) * 100}%`, top: `${(position.y / geometry.height) * 100}%`, "--seat": (10 / geometry.width) * 100 } as React.CSSProperties}
          title={`Seat ${seat}: ${describe(seat)}`} onClick={() => onSeat(seat)}
          draggable={!!guest} onDragStart={guest ? (event) => drag.start(event, guest.id) : undefined} onDragEnd={drag.end}
          {...dropZone(drag, table.id, seat)}>
          {guest ? initials(guest.name) : kept ? "×" : seat}
        </button>;
      })}
    </div>

    <ol className="tp-seat-list" aria-label={`Seats at ${table.name}`}>
      {seatNumbers.map((seat) => {
        const guest = bySeat.get(seat);
        const kept = !guest && table.keptEmpty.includes(seat);
        return <li key={seat}>
          <button type="button" className="tp-seat-row" data-state={guest ? "taken" : kept ? "kept" : "empty"} onClick={() => onSeat(seat)}
            draggable={!!guest} onDragStart={guest ? (event) => drag.start(event, guest.id) : undefined} onDragEnd={drag.end} {...dropZone(drag, table.id, seat)}>
            <span className="tp-seat-number" aria-hidden="true">{seat}</span>
            <span className="sr-only">Seat {seat}: </span>
            <span className="tp-seat-name">{describe(seat)}</span>
          </button>
        </li>;
      })}
    </ol>

    <footer className="tp-card-foot">
      {free > 0
        ? <button type="button" className="button button-secondary" onClick={onAdd}><Icon name="plus" />Add guests<span className="sr-only"> to {table.name}</span> <span className="tp-free">{free} free</span></button>
        : <p className="tp-full"><Icon name="check" className="size-4" />{table.keptEmpty.length ? "No free seats" : "Table full"}</p>}
    </footer>
  </article>;
}
