import type { Metadata } from "next";
import { loadPlanning } from "@/features/planning/planning-data";
import { TablePlanner } from "@/features/planning/table-planner";
import { requireWedding } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Table plan · SaveTheDates" };

export default async function TablePlan() {
  const [{ guests, tables }, { wedding }] = await Promise.all([loadPlanning(), requireWedding()]);
  return <WorkspacePage id="table-plan-title" eyebrow="Table plan" title="Seat your guests" wide
    intro="Add your tables, then seat guests by table or by seat. Everything saves as you go, and only you can see it.">
    <TablePlanner initialGuests={guests} initialTables={tables} couple={`${wedding.first_name} & ${wedding.second_name}`} />
  </WorkspacePage>;
}
