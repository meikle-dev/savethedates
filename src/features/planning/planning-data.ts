import "server-only";

import { cache } from "react";
import { requireWedding } from "@/features/workspace/workspace-data";
import type { GuestStatus } from "./guest-import";
import type { PlanGuest, PlanTable, TableShape } from "./seating";

export const guestColumns = "id, name, group_name, status, table_id, seat";
export const tableColumns = "id, name, shape, seats, kept_empty, position";

export type GuestRow = { id: string; name: string; group_name: string; status: GuestStatus; table_id: string | null; seat: number | null };
export type TableRow = { id: string; name: string; shape: TableShape; seats: number; kept_empty: number[]; position: number };

export const toGuest = (row: GuestRow): PlanGuest => ({ id: row.id, name: row.name, group: row.group_name, status: row.status, tableId: row.table_id, seat: row.seat });
export const toTable = (row: TableRow): PlanTable => ({ id: row.id, name: row.name, shape: row.shape, seats: row.seats, keptEmpty: row.kept_empty, position: row.position });

/** F078: the owner's whole guest list and table plan (at most 1,000 guests and 100 tables), read under RLS. */
export const loadPlanning = cache(async () => {
  const { client, wedding } = await requireWedding();
  const [guests, tables] = await Promise.all([
    client.from("wedding_guests").select(guestColumns).eq("wedding_id", wedding.id).order("created_at").order("id").range(0, 999),
    client.from("wedding_tables").select(tableColumns).eq("wedding_id", wedding.id).order("position").order("created_at"),
  ]);
  if (guests.error || tables.error) throw new Error("Unable to load the guest list.");
  return { guests: (guests.data as GuestRow[]).map(toGuest), tables: (tables.data as TableRow[]).map(toTable) };
});
