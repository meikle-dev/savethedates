import { expect, test } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";
import type { BrowserContext } from "@playwright/test";

const local = localSupabase();

async function emailLink(email: string, type: "signup" | "recovery") {
  let link = "";
  await expect.poll(async () => {
    const inbox = await fetch(`${local.mailUrl}/api/v1/messages`).then((r) => r.json());
    for (const message of inbox.messages ?? []) {
      if (!message.To?.some((to: { Address: string }) => to.Address === email)) continue;
      const detail = await fetch(`${local.mailUrl}/api/v1/message/${message.ID}`).then((r) => r.json());
      const match = (detail.HTML as string).match(/href="([^"]+)"/);
      if (match) {
        const candidate = match[1].replaceAll("&amp;", "&");
        if (new URL(candidate).searchParams.get("type") === type) { link = candidate; return true; }
      }
    }
    return false;
  }, { timeout: 20_000, message: `Expected local ${type} email` }).toBe(true);
  return link;
}

type BrowserCookies = Awaited<ReturnType<BrowserContext["cookies"]>>;

function authCookieValue(cookies: BrowserCookies) {
  const whole = cookies.find(({ name }) => name === "wedding-auth");
  if (whole) return whole.value;
  return cookies
    .filter(({ name }) => /^wedding-auth\.\d+$/.test(name))
    .sort((left, right) => Number(left.name.split(".").at(-1)) - Number(right.name.split(".").at(-1)))
    .map(({ value }) => value)
    .join("");
}

function decodeAuthCookie(value: string) {
  expect(value).toMatch(/^base64-/);
  return JSON.parse(Buffer.from(value.slice("base64-".length), "base64url").toString("utf8")) as { expires_at: number };
}

async function expireAccessToken(context: BrowserContext) {
  const cookies = await context.cookies();
  const authCookies = cookies.filter(({ name }) => name === "wedding-auth" || /^wedding-auth\.\d+$/.test(name));
  expect(authCookies.length).toBeGreaterThan(0);
  const session = decodeAuthCookie(authCookieValue(cookies));
  session.expires_at = 1;
  const expiredValue = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks = expiredValue.length <= 3180 ? [expiredValue] : expiredValue.match(/.{1,3180}/g)!;
  const template = authCookies[0];

  await context.clearCookies({ name: /^wedding-auth(?:\.\d+)?$/ });
  await context.addCookies(chunks.map((value, index) => ({
    name: chunks.length === 1 ? "wedding-auth" : `wedding-auth.${index}`,
    value,
    domain: template.domain,
    path: template.path,
    expires: template.expires,
    httpOnly: template.httpOnly,
    secure: template.secure,
    sameSite: template.sameSite,
  })));
  return expiredValue;
}

test("owner signs up, confirms email, saves a private draft, and recovers access", async ({ page, context }) => {
  test.setTimeout(90_000);
  const email = `journey-${crypto.randomUUID()}@example.test`;
  const password = `Initial-${crypto.randomUUID()}`;
  const newPassword = `Changed-${crypto.randomUUID()}`;
  try {
    await page.goto("/account/sign-up");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.screenshot({ path: test.info().outputPath("signup.png"), fullPage: true });
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("status")).toContainText("Check your email");

    await page.goto("/account/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("confirm your email");

    await page.goto(await emailLink(email, "signup"));
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Private draft", { exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByLabel("Your name", { exact: false })).toHaveValue("");
    await page.getByLabel("Your name", { exact: false }).fill("Alexandra");
    await page.locator('input[name="second_name"]').fill("Morgan");
    await page.locator('input[name="wedding_date"]').fill("2027-09-18");
    await page.locator('input[name="location"]').fill("Edinburgh, Scotland");
    await page.locator('textarea[name="message"]').fill("We can’t wait to celebrate with you.");
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByRole("status")).toHaveText("Your private draft has been saved.");
    await page.reload();
    await expect(page.getByLabel("Your name", { exact: false })).toHaveValue("Alexandra");
    await expect(page.locator('input[name="location"]')).toHaveValue("Edinburgh, Scotland");
    await page.screenshot({ path: test.info().outputPath("workspace.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Your workspace/ })).toHaveAttribute("href", "/dashboard");
    await expect(page.getByRole("link", { name: /Return to your workspace/ }).first()).toHaveAttribute("href", "/dashboard");
    await expect(page.getByRole("link", { name: /Sign in/ })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("signed-in-homepage.png"), fullPage: true });

    const expiredCookie = await expireAccessToken(context);
    await page.reload();
    await expect(page.getByRole("link", { name: /Return to your workspace/ }).first()).toBeVisible();
    const refreshedCookie = authCookieValue(await context.cookies());
    expect(refreshedCookie).not.toBe(expiredCookie);
    expect(decodeAuthCookie(refreshedCookie).expires_at).toBeGreaterThan(Date.now() / 1000);
    await page.reload();
    await expect(page.getByRole("link", { name: /Return to your workspace/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /Return to your workspace/ }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('input[name="location"]')).toHaveValue("Edinburgh, Scotland");

    // Server validation preserves the other fields instead of resetting the form.
    await page.locator('input[name="location"]').fill(" ");
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("highlighted fields");
    await expect(page.getByLabel("Your name", { exact: false })).toHaveValue("Alexandra");
    await expect(page.locator('textarea[name="message"]')).toHaveValue("We can’t wait to celebrate with you.");
    await page.screenshot({ path: test.info().outputPath("workspace-validation.png"), fullPage: true });

    // Expire this browser's session from a second tab while edits remain on screen.
    const otherTab = await context.newPage();
    await otherTab.goto("/dashboard");
    await otherTab.getByRole("button", { name: "Sign out" }).click();
    await expect(otherTab).toHaveURL(/\/account\/sign-in$/);
    await otherTab.close();
    await page.locator('input[name="location"]').fill("Unsaved venue");
    await page.getByRole("button", { name: "Save private draft" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("session has ended");
    await expect(page.locator('input[name="location"]')).toHaveValue("Unsaved venue");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Sign in/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Your workspace/ })).toHaveCount(0);

    await page.goto("/account/recovery");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("If an account uses that email");
    const recoveryLink = await emailLink(email, "recovery");
    await page.goto(recoveryLink);
    await expect(page).toHaveURL(/\/account\/password$/);
    await page.getByLabel("New password").fill(newPassword);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByRole("status")).toContainText("password has been changed");
    await page.getByRole("link", { name: "Return to your workspace" }).click();
    await expect(page.locator('input[name="location"]')).toHaveValue("Edinburgh, Scotland");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/account\/sign-in$/);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByLabel("Your name", { exact: false })).toHaveValue("Alexandra");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/account\/sign-in$/);
    await page.goto(recoveryLink);
    await expect(page).toHaveURL(/\/account\/recovery\?error=expired/);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or has expired");
  } finally {
    const { data } = await local.admin.auth.admin.listUsers({ perPage: 1000 });
    const user = data.users.find((user) => user.email === email);
    if (user) await local.admin.auth.admin.deleteUser(user.id);
  }
});

test("anonymous and forged sessions cannot open the workspace or password editor", async ({ page, context }) => {
  await context.addCookies([{ name: "wedding-auth", value: "forged-session", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Sign in/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Your workspace/ })).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/account\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await page.goto("/account/password");
  await expect(page).toHaveURL(/\/account\/recovery\?error=expired/);
  await page.goto("/auth/confirm?token_hash=invalid&type=signup&next=https://example.com");
  await expect(page).toHaveURL(/\/account\/recovery\?error=expired/);
});

