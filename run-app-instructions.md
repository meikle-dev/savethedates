# Run SaveTheDates locally

Run commands from the repository root. This is one Next.js application with local Supabase Auth, PostgreSQL and Storage for accounts and wedding publication. Do not set `NODE_ENV` manually. Demo data is available only in development.

## Prerequisites

- Direct running and checks: Node.js **24.11.0** and npm **11.6.1** (the Node installer includes npm). `.nvmrc`, `packageManager`, and `package-lock.json` record the toolchain and dependencies. Compatible Node 24/npm 11 releases are accepted by the package engines.
- Container running: Docker Engine/Desktop with Linux containers and Docker Compose v2. The Dockerfile uses Node 24.11.0 with npm 11.6.1; host Node is optional for running the container.
- Windows PowerShell: use `npm.cmd` and `npx.cmd` wherever the commands below say `npm` and `npx` if script execution policy blocks their `.ps1` wrappers. No policy change is needed.
- Supabase local development: Docker Desktop plus the project-scoped CLI (`npm run db:start`). The CLI starts PostgreSQL, Auth, API, Studio, and the local Mailpit mailbox; no hosted Supabase account is required.
- Stripe Checkout development: a Stripe account in test mode and the Stripe CLI are required only for a real hosted-checkout walkthrough. Automated tests use locally signed webhook fixtures and do not charge or contact Stripe.
- Ports: 3000 for local development, 3100 for the automated browser server, 3001 for the production smoke example, 3199 for the fake Sentry ingest used by `npm run test:monitoring`.

## Docker development

```sh
docker compose up --build -d
docker compose logs -f app
```

Open http://localhost:3000 for the marketing homepage and linked public theme examples. The development-only first-theme fixture remains at http://localhost:3000/demo. The first request compiles the page. Stop following logs with Ctrl+C; the container remains running. `src/`, `fixtures/`, and `public/` are mounted for local edits; rebuild after changing dependencies or root configuration. Container dependencies and Next.js output are separate from the host checkout.

If Docker Desktop continues serving an old page after a source change, run `docker compose restart app` to refresh the development compiler. This preserves database and uploaded data.

With host Node installed, `node scripts/smoke-development.mjs` checks the demo, image response, and unknown-names 404 in the running development container.

```sh
docker compose down
```

This stops and removes the project's application container/network. Supabase data is managed separately and persists across application-container restarts.

## Local Supabase/Auth

```sh
npm run db:start
npm run local:env
```

The environment command writes the local publishable and service-role keys to ignored `.env.local` and `.env.docker` files. The service-role key is used only by the signature-verified payment webhook and must remain server-side. It also writes clearly labelled Stripe placeholders used by automated webhook tests; those placeholders cannot start Checkout. Never commit either environment file. Open http://localhost:54323 for Studio and http://localhost:54324 for the local Mailpit mailbox. Confirmation and password-recovery messages are captured locally and are not sent externally.

For a quick local walkthrough without email confirmation, run `npm run local:demo-account`. This creates or resets the fictional `local-demo@example.test` account with password `SaveTheDatesLocal123!` and a sample private wedding. On the development sign-in page, click **Use local demo account**. The shortcut is only rendered in development mode, only accepts local Supabase hosts, and is absent from production builds. Do not use these credentials in a hosted environment.

When upgrading an existing local stack, stop/start Supabase to enable Storage, then apply new migrations without deleting saved data:

```sh
npm run db:stop
npm run db:start
npx supabase migration up --local
```

Create an account at `/account/sign-up`, confirm it using Mailpit, and save required details at `/dashboard`. Then add an optional photo, choose a theme under Your wedding style, and preview saved content. Preview theme does not save changes; Apply theme persists the previewed choice. **Preview RSVP page** opens the saved couple/theme presentation without saving a response, including before publication. Each wedding has one private guest link, `/<names>/<secret>`, shown in Publish. The names part is suggested from the couple's names and can be changed at any time; it is not unique. A verified £29 test-mode purchase is required before publishing. Published edits take effect when saved. Once live, Publish and Overview show the absolute guest link (on `APP_ORIGIN`) with an editable share message, native Share where supported, Share on WhatsApp, Copy message and Copy link. The RSVP section can enable or close responses, copy the guest link, replace the link (every earlier link, including the Save the Date, stops working) and show attendance totals. Guests can submit separate responses through that link; owners correct or remove them in Guests. Unpublishing hides the page, photo, and RSVP on new requests; copies already downloaded cannot be recalled.

## Google sign-in (optional)

The **Continue with Google** option appears on sign-in and sign-up only when the app has `AUTH_GOOGLE_ENABLED=true`. It is off in the generated environment files and in local Supabase, so a normal local setup shows email and password only.

`tests/google-sign-in.spec.ts` needs the flag but never contacts Google: it intercepts the Supabase authorize request and replays the callback, covering the start of the flow, cancellation, rejected codes and the Basics notice for Google accounts. Its success test uses a local magic link carrying the browser's PKCE challenge, so the real code exchange runs through `/auth/callback`. On an existing local stack, run `npm run db:stop` then `npm run db:start` once so local Auth allows the `/auth/callback` URLs. The Playwright web server and CI set the flag. When running the suite against a container with `E2E_BASE_URL`, start that container with `-e AUTH_GOOGLE_ENABLED=true`, as in the production check below; the Compose development container does not set it.

To try real Google sign-in locally:

1. Create a Google OAuth client as in [F041 step 2](docs/backlog.md#f041---production-setup-guide), with authorised redirect URI `http://127.0.0.1:54321/auth/v1/callback`.
2. In your shell, set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`. Change `enabled` to `true` under `[auth.external.google]` in `supabase/config.toml`, but don't commit that change or the credentials.
3. Run `npm run db:stop`, then `npm run db:start`. Saved data is kept.
4. Add `AUTH_GOOGLE_ENABLED=true` to `.env.local` and start the app on port 3000 or 3100 (the callback URLs local Auth allows).

## Stripe test-mode checkout

Replace the generated Stripe placeholders in `.env.local` (and `.env.docker` when using Compose) with a Stripe test secret key and the webhook signing secret printed by the Stripe CLI. Keep both values server-only. Start the application, then forward test events in a separate terminal:

```sh
stripe login
stripe listen --forward-to http://127.0.0.1:3000/api/stripe/webhook
```

Restart the application after changing environment values. In the dashboard, use **Buy and continue to Stripe** and a Stripe test card. One pending Checkout is reused across tabs and retries for 31 minutes, and its site-expiry date is fixed when that attempt begins. A pending attempt is released only after Stripe sends its signed `checkout.session.expired` event. Successful browser return is informational: publication becomes available only after the signed `checkout.session.completed` or `checkout.session.async_payment_succeeded` webhook is stored. Forward `refund.created` and `charge.dispute.created` events to verify immediate entitlement revocation and unpublication. Never use live keys locally. Stripe login, hosted Checkout, and live-mode activation are external actions and are not performed by repository tests.

```sh
npm run db:stop
```

`npm run test:integration` creates temporary users and checks owner access, cross-owner denial, anonymous denial, payment ordering/idempotency/revocation, publication gating, lookup by secret only, and database validation. `npm run test:persistence` creates a temporary draft, stops and starts Supabase, signs in again, and verifies the draft remains before removing the temporary user. To deliberately erase all local data, use `npx supabase db reset --local`; this is destructive and reapplies migrations. Never run it against a hosted project.

Publication integration checks also cover reserved names, shared and editable names parts, removal of lookup by names, private photos, replacement/unpublish revocation, and denied signed links. Browser checks cover photo validation, private preview, publication, live edits, removal and republishing at both viewport sizes. `npx playwright test tests/themes.spec.ts` checks private theme preview, cancellation, persistence, live application, preserved content/URL, keyboard selection, and long-content/failed-photo layouts for all themes.

## Direct Node.js development

Stop the Docker app first if it occupies port 3000.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/demo. Stop with Ctrl+C. To use another port: `npm run dev -- --port 3002`.

Development routes:

| Route | Purpose |
| --- | --- |
| `/` | Public marketing homepage and fictional theme examples |
| `/digital-save-the-date` | Public, indexable page about digital save the dates |
| `/demo` | Modern Minimal announcement with a local photograph |
| `/demo-no-photo` | No photo or optional message |
| `/demo-long-names` | Long names and no photo |
| `/preview-photo` | Development-only photo response |
| `/[names]/[secret]` | Published Save the Date page: the guest link |
| `/[names]/[secret]/details` | Enabled published Details page |
| `/[names]/[secret]/rsvp` | RSVP page where guests submit separate responses |
| `/[names]/[secret]/photo` | Published wedding photo |

The wedding is found by its secret only; an outdated names part redirects to the current one. `/[names]` alone, unknown or replaced secrets, and unpublished or expired weddings return the same 404. Only the marketing homepage permits indexing and appears in `/sitemap.xml`; wedding, account and example pages remain noindex. All fixtures are fictional. Production returns 404 for every demo route and the fixture photo route. Accounts, private preview, publication, Details, and RSVP work with configured Supabase.

## Checks

```sh
npm ci
npm run check
npm run db:start
npm run local:env -- --force
npm run test:integration
npm run test:persistence
npx playwright install chromium
npm run test:e2e
npm run test:monitoring
```

`check` runs lint, route generation/TypeScript, Vitest, and the production build, in that order. The browser suite starts/stops its own server on port 3100; leave that port free. By default that is the development server. `E2E_PRODUCTION=1 npm run test:e2e` serves the output of the preceding `npm run build` instead, so pages are not compiled on first request (CI instead runs the suite against its production container with `E2E_BASE_URL`); the development-only `/demo` fixture tests are skipped in that mode. Run the build and browser suite sequentially so generated Next.js files are not rebuilt during browser checks. On Linux CI, use `npx playwright install --with-deps chromium` for browser system dependencies. Tests use Chromium at desktop and mobile viewport sizes; they do not establish Safari compatibility.

Individual checks are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Browser screenshots and failure traces are under ignored `test-results/`; `npx playwright show-report` opens the HTML report. CI also checks database isolation, application-container connectivity, and the `/demo` fixtures through the development container. Locally, run those with `E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/preview.spec.ts` after Compose is up.

The themes differ only in CSS, so behaviour tests use one theme. Every theme is covered by `tests/theme-design.spec.ts` (Save the Date and Details at 320–1440px, image failures), `tests/rsvp-preview.spec.ts` (the RSVP form at the project width and 320px), `tests/rsvp.spec.ts` (the closed RSVP notice) and `tests/themes.spec.ts` (long content with a failed photo). Tests keep Playwright's 30-second limit: split a test that needs longer instead of raising its limit.

## Error tracking and logs (optional)

The app logs through `src/lib/logger.ts`. `npm run dev` prints one readable line per event, and the production image prints one JSON line. Every line has a `requestId`, which is also returned in the `X-Request-Id` response header. The logging standard, event list and investigation runbook are in [Release and operations](docs/operations.md#logging-standard).

Sentry is off unless these runtime variables are set. Leave them unset locally; then nothing is sent anywhere and the browser never downloads the Sentry SDK.

| Variable | Purpose |
| --- | --- |
| `SENTRY_DSN` | Sentry project DSN. Unset turns Sentry off |
| `SENTRY_ENVIRONMENT` | Label such as `staging` or `production`; defaults to `local` |
| `APP_RELEASE` | Commit SHA; defaults to `unreleased`. `docker build --build-arg APP_RELEASE=<sha>` builds it into the image |

`npm run test:monitoring` checks what Sentry would receive, without contacting Sentry. It starts the development server on port 3100 with a fake DSN that points at a local ingest on port 3199. It then runs a guest-link RSVP under `/<names>/<secret>`, an auth confirmation, a checkout return and a rejected webhook, and asserts the captured payloads contain no secrets or form values. It needs local Supabase. `npm run test:e2e` includes a check that, with the variables unset, pages load no SDK and contact no other origin.

To run the same check against a production container (PowerShell, local Supabase running, `.env.docker` generated):

```powershell
docker build --target production --build-arg APP_RELEASE=local-check -t save-the-dates:monitoring .
docker run -d --name wedding-monitoring --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3001 -e STRIPE_SECRET_KEY=sk_test_local_webhook_verification_only -e STRIPE_WEBHOOK_SECRET=whsec_local_webhook_test_secret -e SENTRY_DSN=http://e2epublickey@host.docker.internal:3199/1 -e SENTRY_ENVIRONMENT=container-check -p 127.0.0.1:3001:3000 save-the-dates:monitoring
$env:E2E_BASE_URL='http://127.0.0.1:3001'
$env:E2E_SENTRY_DSN='http://e2epublickey@host.docker.internal:3199/1'
npm.cmd run test:monitoring
Remove-Item Env:E2E_BASE_URL, Env:E2E_SENTRY_DSN
docker logs wedding-monitoring
docker rm -f wedding-monitoring
```

Its first test proves the prebuilt image, including the prerendered `/examples/minimal`, uses the DSN, environment and release given at runtime. `docker logs` shows the JSON log lines.

Source maps are built with debug IDs inside the Docker build and removed from the production image. To inspect them locally, run `docker build --target sourcemaps --output type=local,dest=sourcemaps .` (the `sourcemaps/` folder is ignored by Git). CI uploads them to Sentry only when the `SENTRY_AUTH_TOKEN` secret exists.

## Homepage theme previews

The phones on the marketing homepage are screenshots of the fictional `/examples/[theme]` pages, stored in `public/media/themes/`. After changing a theme's Save the Date design, restart the app from the current code (a rebuilt container, or `npm run dev`). Then run `npm run marketing:previews -- http://127.0.0.1:3000`, or pass another origin, and commit the regenerated images.

## Production container smoke check

Hosted configuration, promotion, rollback and recovery requirements are in [Release and operations](docs/operations.md). Production deployment is still pending F009.

For production-container verification, run the browser suite with `E2E_BASE_URL` and `E2E_PRODUCTION=1` as below. Run only against a local container connected to local Supabase with test Stripe placeholders; these tests create/delete fictional data and do not support hosted staging/production. Use port 3000 for the complete account journey because local Auth already allows its callback; temporarily stop the development app with `docker compose stop app`, and restart it with `docker compose start app` after removing the verification container. `APP_ORIGIN` must match `E2E_BASE_URL`.

Complete local production check (PowerShell, with local Supabase running and `.env.docker` already generated):

```powershell
docker build --target production -t save-the-dates:f009 .
docker compose stop app
docker run -d --name wedding-f009-verify --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3000 -e AUTH_GOOGLE_ENABLED=true -e STRIPE_SECRET_KEY=sk_test_local_webhook_verification_only -e STRIPE_WEBHOOK_SECRET=whsec_local_webhook_test_secret -p 127.0.0.1:3000:3000 save-the-dates:f009
# Wait for the server to report ready.
docker logs wedding-f009-verify
npm.cmd run smoke -- http://127.0.0.1:3000
$env:E2E_BASE_URL='http://127.0.0.1:3000'
$env:E2E_PRODUCTION='1'
npm.cmd run test:e2e
# Clean up even if a check fails. Restart app only if it was running before.
Remove-Item Env:E2E_BASE_URL, Env:E2E_PRODUCTION -ErrorAction SilentlyContinue
docker stop wedding-f009-verify
docker rm wedding-f009-verify
docker compose start app
```

Marketing uses runtime `APP_ORIGIN` for its canonical URL, sitemap and social-sharing URLs. Set it to the exact browser-facing origin (no path), for example `-e APP_ORIGIN=http://127.0.0.1:3001` for the local production container below; the fallback is `http://localhost:3000`. Production HTTPS/domain configuration and launch indexation checks belong to F009. Only `/` and `/digital-save-the-date` are listed in `/sitemap.xml`; fictional `/examples/minimal`, `/examples/romantic`, `/examples/bold` and their Details pages remain noindex. They work in production without database access. `/demo` and `/preview-photo` remain development-only.

`npx playwright test tests/marketing.spec.ts` checks the homepage, the digital save the date page, account-entry links, every theme's example link and noindex, one fictional example walkthrough, metadata and homepage-only JSON-LD, sitemap, social image and 320-1440px layouts. Against a production container use `E2E_BASE_URL=http://127.0.0.1:3001 E2E_PRODUCTION=1 npx playwright test tests/marketing.spec.ts` (PowerShell environment syntax as below). Its local unthrottled rendering measurements are diagnostics, not real-user Core Web Vitals or a Safari compatibility claim.

```sh
docker build --target production -t save-the-dates:local .
docker run -d --name save-the-dates-smoke -p 127.0.0.1:3001:3000 save-the-dates:local
npm run smoke -- http://127.0.0.1:3001
docker stop save-the-dates-smoke
docker rm save-the-dates-smoke
```

Run the smoke command after the container reports ready (`docker logs save-the-dates-smoke`). It verifies the home page and 404 responses for the demo variants, photo, an unknown names part and an unknown guest link. This image uses Next.js standalone output and runs as the non-root `node` user. No production deployment or external services are configured yet.

To test publication in the production image against local Supabase, add `--add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3001` to the `docker run` command. Then run `E2E_BASE_URL=http://127.0.0.1:3001 E2E_PRODUCTION=1 npx playwright test tests/publication.spec.ts`. In PowerShell set `$env:E2E_BASE_URL='http://127.0.0.1:3001'` and `$env:E2E_PRODUCTION='1'` before `npx.cmd playwright test tests/publication.spec.ts`; remove those environment variables afterwards. These checks use temporary fictional data and require local Supabase to be running.

For a direct production smoke check, run `npm run build`, then `npm start -- --port 3001` in a terminal; run the same smoke command in a second terminal. Stop with Ctrl+C. Both start the standalone server; direct `npm start` first copies the public and built static assets into the standalone directory using a cross-platform Node script.

## Staging access check

With `APP_ENV=staging`, every response needs the staging username and password (HTTP basic auth) and is `noindex`, and `robots.txt` disallows everything. Only `/api/health`, the Stripe webhook and the twelve fictional `/media/themes/<theme>.webp` images answer without the password. Leave `APP_ENV` unset locally and in production. Setup and the reasons for the exemptions: [Staging access](docs/operations.md#staging-access).

To check a production image in staging mode (PowerShell, local Supabase running, `.env.docker` generated). Port 3200 leaves the development app on 3000 running:

```powershell
docker build --target production -t save-the-dates:staging-check .
$env:STAGING_USERNAME='team'
$env:STAGING_PASSWORD='local-staging-password-not-secret'
docker run -d --name wedding-staging-check --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ENV=staging -e STAGING_USERNAME -e STAGING_PASSWORD -p 127.0.0.1:3200:3000 save-the-dates:staging-check
# Wait until http://127.0.0.1:3200/api/health returns ok.
npm.cmd run smoke:staging -- http://127.0.0.1:3200
# Clean up even if the check fails.
docker rm -f wedding-staging-check
Remove-Item Env:STAGING_USERNAME, Env:STAGING_PASSWORD -ErrorAction SilentlyContinue
```

The check expects 401 with a password prompt and `noindex` without valid credentials, the site with them, a disallow-all `robots.txt`, an open health check and webhook (400 for its missing signature), and working optimised theme images. CI runs it against the image it publishes.

## Verification record

F001 verification results and any outstanding checks are recorded in [the backlog](docs/backlog.md#f001---save-the-date-preview). Asset sources and licences are in [fixtures/README.md](fixtures/README.md).
