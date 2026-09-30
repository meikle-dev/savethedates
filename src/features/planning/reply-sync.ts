import { cleanText, normaliseName, type GuestStatus } from "./guest-import";

export type SyncReply = { name: string; attending: boolean; respondedAt: string };
export type SyncGuest = { id: string; name: string; status: GuestStatus };
/** What "Update from RSVP replies" would change. Guest ids to mark, reply names to add, and names it can't decide. */
export type SyncPlan = { attending: string[]; declined: string[]; add: string[]; ambiguous: string[]; matched: number };

/**
 * F078: compares the guest list with RSVP replies by exact name, ignoring case and spacing. A typed reply name isn't an
 * identity (F026), so this runs only when the couple asks and they see the plan first. The latest reply per name wins;
 * a name shared by two guests is left for the couple to update by hand.
 */
export function replySync(guests: SyncGuest[], replies: SyncReply[]): SyncPlan {
  const latest = new Map<string, SyncReply>();
  for (const reply of replies) {
    const key = normaliseName(reply.name);
    if (!key) continue;
    const seen = latest.get(key);
    if (!seen || reply.respondedAt > seen.respondedAt) latest.set(key, reply);
  }
  const byName = new Map<string, SyncGuest[]>();
  for (const guest of guests) {
    const key = normaliseName(guest.name);
    byName.set(key, [...byName.get(key) ?? [], guest]);
  }
  const plan: SyncPlan = { attending: [], declined: [], add: [], ambiguous: [], matched: 0 };
  for (const [key, reply] of latest) {
    const matches = byName.get(key) ?? [];
    if (matches.length > 1) plan.ambiguous.push(matches[0].name);
    else if (matches.length === 0) {
      if (reply.attending) plan.add.push(cleanText(reply.name));
    } else {
      plan.matched += 1;
      const status: GuestStatus = reply.attending ? "attending" : "declined";
      if (matches[0].status !== status) plan[status].push(matches[0].id);
    }
  }
  return plan;
}
