import { expect, type Page } from "@playwright/test";

/** Returns a workspace section link, first opening the phone "Sections" menu when it is in use. */
export async function workspaceLink(page: Page, name: string) {
  const nav = page.getByRole("navigation", { name: "Workspace sections" });
  const toggle = nav.getByRole("button", { name: "Sections" });
  // Below 768px the section list sits behind the "Sections" toggle.
  if (page.viewportSize()!.width < 768) {
    // Retry until hydrated: a click before React attaches its handler does nothing.
    await expect(async () => {
      if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
    }).toPass();
  }
  return nav.getByRole("link", { name, exact: true });
}

export async function openWorkspaceSection(page: Page, name: string) {
  await (await workspaceLink(page, name)).click();
}
