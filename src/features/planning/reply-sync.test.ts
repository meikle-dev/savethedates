import { describe, expect, it } from "vitest";
import { replySync, type SyncGuest } from "./reply-sync";

const guest = (id: string, name: string, status: SyncGuest["status"] = "awaiting"): SyncGuest => ({ id, name, status });
const reply = (name: string, attending: boolean, respondedAt = "2027-01-01T10:00:00Z") => ({ name, attending, respondedAt });

describe("replySync", () => {
  it("matches names ignoring case and spacing, and changes only statuses that differ", () => {
    const guests = [guest("a", "Ann Lee"), guest("b", "Ben  Cole", "attending"), guest("c", "Cat Day", "attending")];
    const plan = replySync(guests, [reply(" ann lee ", true), reply("BEN COLE", true), reply("Cat Day", false)]);
    expect(plan).toEqual({ attending: ["a"], declined: ["c"], add: [], ambiguous: [], matched: 3 });
  });

  it("uses each name's latest reply", () => {
    const plan = replySync([guest("a", "Ann Lee")], [reply("Ann Lee", true, "2027-01-02T00:00:00Z"), reply("ann lee", false, "2027-01-01T00:00:00Z")]);
    expect(plan.attending).toEqual(["a"]);
    expect(plan.declined).toEqual([]);
  });

  it("offers attending replies that aren’t on the list once each, spelt as in the latest reply, and ignores declines", () => {
    const plan = replySync([], [reply("dee  fox", true), reply("Dee Fox", true, "2027-01-03T00:00:00Z"), reply("Eve Gray", false)]);
    expect(plan.add).toEqual(["Dee Fox"]);
  });

  it("leaves names shared by two guests for the couple", () => {
    const plan = replySync([guest("a", "John Smith"), guest("b", "john smith")], [reply("John Smith", true)]);
    expect(plan).toEqual({ attending: [], declined: [], add: [], ambiguous: ["John Smith"], matched: 0 });
  });
});
