import { expect, test, type Page } from "@playwright/test";
import { localSupabase } from "./helpers/local-supabase";

// Needs a server started with AUTH_GOOGLE_ENABLED=true (the Playwright web server and CI set it).
// Google itself is never contacted: the Supabase authorize request is intercepted and answered with the
// callback Supabase would send, so these tests cover the app's side of the flow, not Google's.
const local = localSupabase();

async function startGoogle(page: Page, callbackQuery: string, outcome: "cancelled" | "failed") {
  let authorize: URL | undefined;
  await page.route("**/auth/v1/authorize?**", async (route) => {
    authorize = new URL(route.request().url());
    await route.fulfill({ status: 302, headers: { location: `${authorize.searchParams.get("redirect_to")}?${callbackQuery}` } });
  });
  await page.goto("/account/sign-in");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(new RegExp(`/account/sign-in\\?google=${outcome}$`));
  await page.unrouteAll();
  return authorize!;
}

test("Google sign-in starts a server-side PKCE redirect and fails safely on return", async ({ page, context }) => {
  await page.goto("/account/sign-up");
  await expect(page.getByRole("button", { name: "Continue with Google" }), "Start the server with AUTH_GOOGLE_ENABLED=true").toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("google-sign-up.png"), fullPage: true });

  await page.goto("/account/sign-in");
  const origin = new URL(page.url()).origin;
  await expect(page.getByLabel("Email address")).toBeVisible();
  const authorize = await startGoogle(page, "error=access_denied&error_code=provider_denied&error_description=cancelled", "cancelled");
  expect(authorize.pathname).toBe("/auth/v1/authorize");
  expect(authorize.searchParams.get("provider")).toBe("google");
  expect(authorize.searchParams.get("prompt")).toBe("select_account");
  expect(authorize.searchParams.get("code_challenge_method")).toBe("s256");
  expect(authorize.searchParams.get("code_challenge")).toMatch(/^[\w-]{43}$/);
  expect(authorize.searchParams.get("redirect_to")).toBe(`${origin}/auth/callback`);
  await expect(page.getByRole("status")).toHaveText("Google sign-in was cancelled. You can try again or use your email and password.");

  const cookies = await context.cookies();
  const verifier = cookies.find(({ name }) => name === "wedding-auth-code-verifier");
  expect(verifier?.httpOnly).toBe(true);
  expect(verifier?.sameSite).toBe("Lax");
  expect(cookies.some(({ name }) => /^wedding-auth(\.\d+)?$/.test(name))).toBe(false);

  // A forged or replayed code is rejected by Supabase and gives the same generic failure.
  await startGoogle(page, `code=${crypto.randomUUID()}`, "failed");
  await expect(page.locator("p[role=alert]")).toHaveText("We couldn’t sign you in with Google. Please try again, or use your email and password.");
  await page.screenshot({ path: test.info().outputPath("google-failed.png") });
  expect((await context.cookies()).some(({ name }) => /^wedding-auth(\.\d+)?$/.test(name))).toBe(false);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/account\/sign-in$/);

  for (const query of ["", "?code=abc", "?error=server_error&error_description=%3Cscript%3E"]) {
    const response = await page.request.get(`/auth/callback${query}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`${origin}/account/sign-in?google=failed`);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  }
  await page.goto("/account/sign-in?google=unexpected");
  await expect(page.locator("p[role=alert]")).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("google-sign-in-320.png"), fullPage: true });
});

// Google cannot run locally, so a local magic link carrying the browser's PKCE challenge stands in for it.
// Supabase returns it to /auth/callback with a code exactly as it would after Google, so this exercises
// the real server-side exchange against the verifier cookie that "Continue with Google" set.
test("a successful callback exchanges the code server-side, signs in and clears the verifiers", async ({ page, context }) => {
  const email = `callback-${crypto.randomUUID()}@example.test`;
  const created = await local.admin.auth.admin.createUser({ email, password: `Callback-${crypto.randomUUID()}`, email_confirm: true });
  if (created.error) throw created.error;
  try {
    let challenge: URL | undefined;
    await page.route("**/auth/v1/authorize?**", async (route) => {
      challenge = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: "text/html", body: "<p>Google stand-in</p>" });
    });
    await page.goto("/account/sign-in");
    const origin = new URL(page.url()).origin;
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByText("Google stand-in")).toBeVisible();
    await page.unrouteAll();

    const sentAt = Date.now();
    const otp = await fetch(`${local.apiUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(`${origin}/auth/callback`)}`, {
      method: "POST",
      headers: { apikey: local.publicKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: false, code_challenge: challenge!.searchParams.get("code_challenge"), code_challenge_method: "s256" }),
    });
    expect(otp.status).toBe(200);
    let link = "";
    await expect.poll(async () => {
      const inbox = await fetch(`${local.mailUrl}/api/v1/messages`).then((r) => r.json());
      const message = (inbox.messages ?? []).find((m: { To: { Address: string }[]; Created: string }) => m.To.some((to) => to.Address === email) && Date.parse(m.Created) >= sentAt - 5000);
      if (!message) return false;
      const detail = await fetch(`${local.mailUrl}/api/v1/message/${message.ID}`).then((r) => r.json());
      link = ((detail.HTML as string).match(/href="([^"]+)"/)?.[1] ?? "").replaceAll("&amp;", "&");
      return !!link;
    }, { timeout: 20_000, message: "Expected the local sign-in link" }).toBe(true);

    const callback = page.waitForRequest((request) => request.url().startsWith(`${origin}/auth/callback?`));
    await page.goto(link);
    expect(new URL((await callback).url()).searchParams.get("code")).toBeTruthy();
    await expect(page).toHaveURL(`${origin}/dashboard/basics`);
    await expect(page.getByRole("heading", { name: "Start with your story." })).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.some(({ name }) => /^wedding-auth(\.\d+)?$/.test(name))).toBe(true);
    expect(cookies.filter(({ name }) => name.endsWith("code-verifier")).map(({ name }) => name)).toEqual([]);
  } finally {
    await local.admin.auth.admin.deleteUser(created.data.user.id);
  }
});

test("a new Google account is told which email it is signed in with", async ({ page }) => {
  const password = `Google-${crypto.randomUUID()}`;
  const googleEmail = `google-${crypto.randomUUID()}@example.test`;
  const emailEmail = `email-${crypto.randomUUID()}@example.test`;
  const ids: string[] = [];
  try {
    for (const [email, provider] of [[googleEmail, "google"], [emailEmail, "email"]] as const) {
      const created = await local.admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error) throw created.error;
      ids.push(created.data.user.id);
      const updated = await local.admin.auth.admin.updateUserById(created.data.user.id, { app_metadata: { provider, providers: [provider] } });
      if (updated.error) throw updated.error;
    }
    const signIn = async (email: string) => {
      await page.context().clearCookies();
      await page.goto("/account/sign-in");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/basics$/);
    };
    await signIn(googleEmail);
    await expect(page.getByText("You’re signed in with Google as")).toContainText(`${googleEmail}. If you already started a wedding with a different email address, sign out and sign in with that email instead.`);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("google-basics-notice.png"), fullPage: true });
    await signIn(emailEmail);
    await expect(page.getByRole("heading", { name: "Start with your story." })).toBeVisible();
    await expect(page.getByText("You’re signed in with Google as")).toHaveCount(0);
  } finally {
    for (const id of ids) await local.admin.auth.admin.deleteUser(id);
  }
});
