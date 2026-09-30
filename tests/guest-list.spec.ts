import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";
import { openWorkspaceSection } from "./helpers/workspace";

// F078: importing and managing the guest list, and seating guests in the table plan.
const local = localSupabase();

async function owner(guests: { name: string; group_name?: string; status?: string }[] = []) {
  const email = `planning-e2e-${crypto.randomUUID()}@example.test`;
  const password = crypto.randomUUID();
  const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create planning test owner");
  const wedding = await local.admin.from("weddings").insert({ owner_id: created.data.user.id, first_name: "Alex", second_name: "Morgan", wedding_date: "2027-09-18", location: "Bath" }).select("id").single();
  expect(wedding.error).toBeNull();
  const weddingId = wedding.data!.id as string;
  // Inserted one by one so the list keeps this order (it is sorted by when each guest was added).
  for (const guest of guests) expect((await local.admin.from("wedding_guests").insert({ wedding_id: weddingId, ...guest })).error).toBeNull();
  return { email, password, ownerId: created.data.user.id, weddingId };
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/account/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const saved = async (weddingId: string) => (await local.admin.from("wedding_guests").select("name, group_name, status, table_id, seat").eq("wedding_id", weddingId).order("name")).data!;

test("couples import, add, edit, filter and export their guest list", async ({ page }) => {
  const couple = await owner([{ name: "Sarah Jones", group_name: "Bride’s family" }]);
  try {
    await signIn(page, couple.email, couple.password);
    await openWorkspaceSection(page, "Guest list");
    await expect(page).toHaveTitle("Guest list · SaveTheDates");
    const stats = page.getByRole("group", { name: "Guest list summary" });
    await expect(stats).toContainText("1Guests");

    // Pasted cells from a spreadsheet: headings are recognised, and duplicates are shown and skipped.
    await page.getByRole("button", { name: "Import guests" }).click();
    let dialog = page.getByRole("dialog", { name: "Import guests" });
    await dialog.getByLabel("Paste from your spreadsheet").fill("Name\tGroup\tRSVP\nsarah  jones\tBride’s family\tYes\nTom Jones\tBride’s family\t\nPriya Shah\tUniversity friends\tNo\n\t\t\nTom Jones\tWork\t\n");
    await dialog.getByRole("button", { name: "Preview guests" }).click();
    await expect(dialog.getByRole("combobox", { name: /^Name/ })).toHaveValue("name");
    await expect(dialog.getByRole("status")).toHaveText("2 guests to add, 2 rows skipped");
    await expect(dialog.getByText("Already on your list")).toBeVisible();
    await expect(dialog.getByText("Repeated above")).toBeVisible();
    await dialog.getByRole("button", { name: "Add 2 guests" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("2 guests added to your list.")).toBeVisible();
    await expect(stats).toContainText("3Guests");
    await expect(stats).toContainText("1Not attending");

    // Undo removes exactly the imported guests.
    await page.getByRole("button", { name: "Undo import" }).click();
    await expect(page.getByText("Import undone. 2 guests removed.")).toBeVisible();
    expect((await saved(couple.weddingId)).map((guest) => guest.name)).toEqual(["Sarah Jones"]);

    // A CSV file with first name and surname columns, saved by Excel in its default Windows-1252 encoding.
    await page.getByRole("button", { name: "Import guests" }).click();
    dialog = page.getByRole("dialog", { name: "Import guests" });
    await dialog.locator("input[type=file]").setInputFiles({ name: "guests.csv", mimeType: "text/csv", buffer: Buffer.from("First name,Surname,Household\r\nSiobhán,Lee,Groom's family\r\n\"Ben\",\"Lee\",Groom's family\r\n", "latin1") });
    await expect(dialog.getByRole("combobox", { name: /^First name/ })).toHaveValue("first");
    await expect(dialog.getByRole("combobox", { name: /^Surname/ })).toHaveValue("last");
    await expect(dialog.getByRole("combobox", { name: /^Household/ })).toHaveValue("group");
    await expect(dialog.getByRole("status")).toHaveText("2 guests to add");
    await expect(dialog.getByRole("cell", { name: "Siobhán Lee" })).toBeVisible();
    await dialog.getByRole("button", { name: "Add 2 guests" }).click();
    await expect(dialog).toBeHidden();

    // Adding one at a time keeps the group for the next name.
    const add = page.getByRole("region", { name: "Add a guest" });
    await add.getByLabel("Name").fill("Cat Day");
    await add.getByLabel("Group").fill("Work");
    await add.getByRole("button", { name: "Add guest" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Cat Day" })).toBeVisible();
    await expect(add.getByLabel("Name")).toHaveValue("");
    await expect(add.getByLabel("Name")).toBeFocused();
    await expect(add.getByLabel("Group")).toHaveValue("Work");

    await page.getByRole("button", { name: "Edit Cat Day" }).click();
    await page.getByLabel("Name", { exact: true }).last().fill("Catherine Day");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Catherine Day", { exact: true })).toBeVisible();
    await page.getByLabel("RSVP for Siobhán Lee").selectOption("attending");
    await expect.poll(async () => (await saved(couple.weddingId)).find((guest) => guest.name === "Siobhán Lee")?.status).toBe("attending");

    const list = page.getByRole("region", { name: "Everyone you’re inviting" });
    await list.getByLabel("Search guests").fill("LEE");
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await list.getByLabel("Search guests").fill("");
    await list.getByRole("radio", { name: /^Attending/ }).check();
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await list.getByRole("radio", { name: /^All/ }).check();

    await page.getByRole("button", { name: "Remove Ben Lee" }).click();
    const confirm = page.getByRole("dialog", { name: "Remove Ben Lee?" });
    await confirm.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByText("Ben Lee removed.")).toBeVisible();

    await page.reload();
    await expect(list.getByRole("listitem")).toHaveCount(3);
    expect(await saved(couple.weddingId)).toEqual([
      { name: "Catherine Day", group_name: "Work", status: "awaiting", table_id: null, seat: null },
      { name: "Sarah Jones", group_name: "Bride’s family", status: "awaiting", table_id: null, seat: null },
      { name: "Siobhán Lee", group_name: "Groom's family", status: "attending", table_id: null, seat: null },
    ]);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const csv = await readFile(await (await download).path(), "utf8");
    expect(csv).toContain("Name,Group,RSVP,Table,Seat\r\nCatherine Day,Work,Awaiting reply,,\r\n");
    expect(csv).toContain("Siobhán Lee,Groom's family,Attending,,\r\n");

    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await noOverflow(page)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`guest-list-${width}.png`), fullPage: true });
    }
  } finally {
    await local.admin.auth.admin.deleteUser(couple.ownerId);
  }
});

test("the guest list updates from RSVP replies after a preview", async ({ page }) => {
  const couple = await owner([{ name: "Dee Fox" }, { name: "Gus Hill", status: "attending" }]);
  try {
    const replies = [["dee  fox", true], ["Eve Gray", true], ["Finn Hart", false], ["Gus Hill", false]] as const;
    for (const [name, attending] of replies) expect((await local.admin.from("shared_rsvp_responses").insert({ wedding_id: couple.weddingId, responding_name: name, attending })).error).toBeNull();
    await signIn(page, couple.email, couple.password);
    await page.goto("/dashboard/guest-list");
    await page.getByRole("button", { name: "Update from RSVP replies" }).click();
    const dialog = page.getByRole("dialog", { name: "Update from RSVP replies" });
    await expect(dialog).toContainText("From 4 replies:");
    await expect(dialog).toContainText("1 guest will be marked attending");
    await expect(dialog).toContainText("1 will be marked not attending");
    await expect(dialog.getByLabel("Add 1 person who said yes but isn’t on your list")).toBeChecked();
    await expect(dialog).toContainText("Eve Gray");
    await dialog.getByRole("button", { name: "Update guest list" }).click();
    await expect(page.getByText("1 guest marked attending, 1 marked not attending, 1 guest added.")).toBeVisible();
    expect((await saved(couple.weddingId)).map(({ name, status }) => [name, status])).toEqual([["Dee Fox", "attending"], ["Eve Gray", "attending"], ["Gus Hill", "declined"]]);
    // Nothing is left to change the second time.
    await page.getByRole("button", { name: "Update from RSVP replies" }).click();
    await expect(page.getByRole("dialog", { name: "Update from RSVP replies" }).getByText("Your guest list is up to date.")).toBeVisible();
  } finally {
    await local.admin.auth.admin.deleteUser(couple.ownerId);
  }
});

test("couples lay out tables and seat guests, with empty seats, automatic seating and undo", async ({ page }, testInfo) => {
  const family = ["Amy Ash", "Bob Ash", "Cal Ash", "Dot Ash"].map((name) => ({ name, group_name: "Ash family", status: "attending" }));
  const friends = ["Eli Fern", "Fay Fern", "Gil Fern"].map((name) => ({ name, group_name: "Friends" }));
  const couple = await owner([...family, ...friends, { name: "Hal Ivy" }, { name: "Ian Jay", status: "declined" }]);
  try {
    await signIn(page, couple.email, couple.password);
    await openWorkspaceSection(page, "Table plan");
    await expect(page).toHaveTitle("Table plan · SaveTheDates");
    const summary = page.getByRole("region", { name: "Table plan summary" });
    await expect(summary).toContainText("0 of 8 guests seated");
    await expect(page.getByRole("heading", { name: "Add your tables" })).toBeVisible();

    // Two round tables of four, then a top table for two, which is listed first.
    await page.getByRole("button", { name: "Add tables" }).first().click();
    let dialog = page.getByRole("dialog", { name: "Add tables" });
    await expect(dialog.getByRole("radio", { name: /Round/ })).toBeChecked();
    await expect(dialog.getByRole("spinbutton", { name: "Seats at each table" })).toHaveValue("10");
    await dialog.getByRole("spinbutton", { name: "Seats at each table" }).fill("4");
    await dialog.getByRole("button", { name: "More: how many tables" }).click();
    await dialog.getByRole("button", { name: "Add 2 tables" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Add tables" }).first().click();
    dialog = page.getByRole("dialog", { name: "Add tables" });
    await dialog.getByRole("radio", { name: /Top table/ }).check();
    await expect(dialog.getByRole("spinbutton", { name: "Seats at each table" })).toHaveValue("8");
    await dialog.getByRole("spinbutton", { name: "Seats at each table" }).fill("2");
    await expect(dialog.getByLabel("Name")).toHaveAttribute("placeholder", "Top table");
    await dialog.getByRole("button", { name: "Add table", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".tp-card h3")).toHaveText(["Top table", "Table 1", "Table 2"]);
    await expect(summary).toContainText("10");

    // A whole group at once through the picker.
    const table1 = page.getByRole("article", { name: "Table 1" });
    await table1.getByRole("button", { name: "Add guests to Table 1" }).click();
    dialog = page.getByRole("dialog", { name: "Add guests to Table 1" });
    await dialog.getByRole("button", { name: "Choose all 4" }).click();
    await expect(dialog.getByRole("status")).toHaveText("4 of 4 seats chosen (table full)");
    await expect(dialog.getByLabel(/Hal Ivy/)).toBeDisabled();
    await dialog.getByRole("button", { name: "Seat 4 guests" }).click();
    await expect(page.getByRole("status").filter({ hasText: "4 guests seated at Table 1." })).toBeVisible();
    await expect(table1).toContainText("4 of 4 seated");
    await expect(table1).toContainText("Table full");

    // A chosen seat, and a seat kept empty.
    const table2 = page.getByRole("article", { name: "Table 2" });
    await table2.getByRole("button", { name: "Seat 2: Empty seat" }).click();
    dialog = page.getByRole("dialog", { name: "Seat 2 at Table 2" });
    await dialog.getByRole("button", { name: /Hal Ivy/ }).click();
    await expect(table2.getByRole("button", { name: "Seat 2: Hal Ivy" })).toBeVisible();
    await table2.getByRole("button", { name: "Seat 1: Empty seat" }).click();
    await page.getByRole("dialog", { name: "Seat 1 at Table 2" }).getByRole("button", { name: "Keep this seat empty" }).click();
    await expect(table2.getByRole("button", { name: "Seat 1: Kept empty" })).toBeVisible();
    // Earlier steps can't be undone into a seat that is now kept empty.
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();

    // Automatic seating splits the group of three over the two tables with room, and never uses the kept-empty seat.
    await page.getByRole("button", { name: "Seat everyone automatically" }).click();
    dialog = page.getByRole("dialog", { name: "Seat 3 guests automatically?" });
    await dialog.getByRole("button", { name: "Seat them" }).click();
    await expect(page.getByRole("status").filter({ hasText: "3 guests seated." })).toBeVisible();
    await expect(summary).toContainText("8 of 8 guests seated");
    await expect(table2.getByRole("button", { name: "Seat 1: Kept empty" })).toBeVisible();
    await page.getByRole("button", { name: "Undo automatic seating" }).click();
    await expect(summary).toContainText("5 of 8 guests seated");
    await expect.poll(async () => (await saved(couple.weddingId)).filter((guest) => guest.seat).length).toBe(5);

    // A seated guest can be taken off their table.
    await table2.getByRole("button", { name: "Seat 2: Hal Ivy" }).click();
    dialog = page.getByRole("dialog", { name: "Hal Ivy" });
    await expect(dialog).toContainText("Table 2, seat 2");
    await dialog.getByRole("button", { name: "Remove from Table 2" }).click();
    await expect(table2.getByRole("button", { name: "Seat 2: Empty seat" })).toBeVisible();

    // Fewer seats: the guest in the removed seat goes back to "To be seated", by name.
    await table1.getByRole("button", { name: "Edit Table 1" }).click();
    dialog = page.getByRole("dialog", { name: "Edit Table 1" });
    await dialog.getByRole("button", { name: "Fewer: seats at each table" }).click();
    await dialog.getByRole("button", { name: "Save table" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Table 1 saved. Dot Ash moved to “To be seated”" })).toBeVisible();
    await expect(table1).toContainText("3 of 3 seated");

    // Swapping by tapping, with no drag: choose a seated guest, their table, then the other guest's seat.
    await table1.getByRole("button", { name: "Seat 1: Amy Ash" }).click();
    dialog = page.getByRole("dialog", { name: "Amy Ash" });
    await dialog.getByRole("button", { name: /^Table 1/ }).click();
    await expect(dialog.getByRole("button", { name: /Amy Ash \(here now\)/ })).toBeDisabled();
    await dialog.getByRole("button", { name: /Swap with Bob Ash/ }).click();
    await expect(dialog).toBeHidden();
    await expect(table1.getByRole("button", { name: "Seat 1: Bob Ash" })).toBeVisible();
    await expect(table1.getByRole("button", { name: "Seat 2: Amy Ash" })).toBeVisible();

    if (testInfo.project.name === "desktop") {
      // Drag from "To be seated" (it stays in view) onto a seat, then onto a seated guest to swap them. Targets are
      // scrolled into view first: a drag that has to scroll the page never starts.
      const waiting = page.getByRole("complementary", { name: /To be seated/ });
      await table2.getByRole("button", { name: "Seat 3: Empty seat" }).scrollIntoViewIfNeeded();
      await waiting.getByRole("button", { name: "Dot Ash" }).dragTo(table2.getByRole("button", { name: "Seat 3: Empty seat" }));
      await expect(table2.getByRole("button", { name: "Seat 3: Dot Ash" })).toBeVisible();
      await table1.getByRole("button", { name: "Seat 1: Bob Ash" }).scrollIntoViewIfNeeded();
      await table2.getByRole("button", { name: "Seat 3: Dot Ash" }).dragTo(table1.getByRole("button", { name: "Seat 1: Bob Ash" }));
      await expect(table1.getByRole("button", { name: "Seat 1: Dot Ash" })).toBeVisible();
      await expect(table2.getByRole("button", { name: "Seat 3: Bob Ash" })).toBeVisible();
    } else {
      // A guest without a seat takes someone's seat by tapping; that person goes back to "To be seated".
      await page.getByRole("complementary", { name: /To be seated/ }).getByRole("button", { name: "Dot Ash" }).click();
      dialog = page.getByRole("dialog", { name: "Dot Ash" });
      await dialog.getByRole("button", { name: /^Table 1/ }).click();
      await dialog.getByRole("button", { name: /Take Cal Ash’s seat/ }).click();
      await expect(page.getByRole("status").filter({ hasText: "Dot Ash seated at Table 1, seat 3. Cal Ash moved to “To be seated”." })).toBeVisible();
      await expect(table1.getByRole("button", { name: "Seat 3: Dot Ash" })).toBeVisible();
    }

    // Deleting a table returns its guests.
    await page.getByRole("button", { name: "Edit Top table" }).click();
    dialog = page.getByRole("dialog", { name: "Edit Top table" });
    await dialog.getByRole("button", { name: "Delete table" }).click();
    await dialog.getByRole("button", { name: "Delete table" }).click();
    await expect(page.locator(".tp-card h3")).toHaveText(["Table 1", "Table 2"]);

    await page.reload();
    const seated = (await saved(couple.weddingId)).filter((guest) => guest.seat).length;
    await expect(summary).toContainText(`${seated} of 8 guests seated`);
    await expect(page.getByRole("article", { name: "Table 2" }).getByRole("button", { name: "Seat 1: Kept empty" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const csv = await readFile(await (await download).path(), "utf8");
    expect(csv).toContain("Table,Seat,Guest,Group\r\nTable 1,1,");
    expect(csv).toContain("Table 2,1,Empty seat (kept free),\r\n");

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await noOverflow(page)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`table-plan-${width}.png`), fullPage: true });
    }
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("heading", { name: "Find your seat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seat your guests" })).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath("table-plan-print.png"), fullPage: true });
  } finally {
    await local.admin.auth.admin.deleteUser(couple.ownerId);
  }
});
