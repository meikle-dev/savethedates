import type { Metadata } from "next";
import Link from "next/link";
import { GuestListManager } from "@/features/planning/guest-list-manager";
import { loadPlanning } from "@/features/planning/planning-data";
import { loadResponseTotals } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Guest list · SaveTheDates" };

export default async function GuestList() {
  const [{ guests, tables }, replies] = await Promise.all([loadPlanning(), loadResponseTotals()]);
  return <WorkspacePage id="guest-list-title" eyebrow="Guest list" title="Your guest list" wide
    intro={<>Everyone you’re inviting, in one private list that only you can see. Use it to plan your <Link href="/dashboard/table-plan" className="text-link">tables</Link>.</>}>
    <GuestListManager initialGuests={guests} tables={tables} replies={replies.total} />
  </WorkspacePage>;
}
