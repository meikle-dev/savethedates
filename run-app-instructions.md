# Run SaveTheDates locally

Run commands from the repository root. This is one Next.js application with local Supabase Auth, PostgreSQL and Storage for accounts and wedding publication. Do not set `NODE_ENV` manually. Demo data is available only in development.

## Prerequisites

- Direct running and checks: Node.js **24.11.0** and npm **11.6.1** (the Node installer includes npm). `.nvmrc`, `packageManager`, and `package-lock.json` record the toolchain and dependencies. Compatible Node 24/npm 11 releases are accepted by the package engines.
- Container running: Docker Engine/Desktop with Linux containers and Docker Compose v2. The Dockerfile uses Node 24.11.0 with npm 11.6.1; host Node is optional for running the container.
- Windows PowerShell: use `npm.cmd` and `npx.cmd` wherever the commands below say `npm` and `npx` if script execution policy blocks their `.ps1` wrappers. No policy change is needed.
- Supabase local development: Docker Desktop plus the project-scoped CLI (`npm run db:start`). The CLI starts PostgreSQL, Auth, API, Studio, and the local Mailpit mailbox; no hosted Supabase account is required.
- Stripe Checkout development: a Stripe account in test mode and the Stripe CLI are required only for a real hosted-checkout walkthrough. Automated tests use locally signed webhook fixtures and do not charge or contact Stripe.
- Ports: 3000 for local development, 3100 for the automated browser server, 3001 for the production smoke example.

## Docker development

```sh
docker compose up --build -d
docker compose logs -f app
```

Open http://localhost:3000 for the marketing homepage and linked public theme examples. The development-only first-theme fixture remains at http://localhost:3000/demo. The first request compiles the page. Stop following logs with Ctrl+C; the container remains running. `src/`, `fixtures/`, and `public/` are mounted for local edits; rebuild after changing dependencies or root configuration. Container dependencies and Next.js output are separate from the host checkout.

If Docker Desktop continues serving an old page after a source change, run `docker compose restart app` to refresh the development compiler. This preserves database and uploaded data.

With host Node installed, `node scripts/smoke-development.mjs` checks the demo, image response, and unknown-slug 404 in the running development container.

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

Create an account at `/account/sign-up`, confirm it using Mailpit, and save required details at `/dashboard`. Then add an optional photo, choose a theme under Your wedding style, and preview saved content. Preview theme does not save changes; Apply theme persists the previewed choice. **Preview RSVP page** opens the saved couple/theme presentation without creating an invitation or saving a response, including before publication. A verified £29 test-mode purchase is required before choosing the permanent URL and publishing. Published edits take effect when saved. The RSVP section can enable or close responses, create one private invitation link per response, and show attendance totals; copy each new link when it is created because its bearer token is not displayed again. **Open invitation** opens that exact guest URL, including its token, in a new tab. The general wedding URL contains no guest token; owners reaching RSVP through it are directed to private preview. Unpublishing hides the page, photo, and RSVP on new requests; copies already downloaded cannot be recalled.

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

`npm run test:integration` creates temporary users and checks owner access, cross-owner denial, anonymous denial, payment ordering/idempotency/revocation, publication gating, uniqueness, and database validation. `npm run test:persistence` creates a temporary draft, stops and starts Supabase, signs in again, and verifies the draft remains before removing the temporary user. To deliberately erase all local data, use `npx supabase db reset --local`; this is destructive and reapplies migrations. Never run it against a hosted project.

Publication integration checks also cover reserved/concurrent URLs, immutable published URLs, private photos, replacement/unpublish revocation, and denied signed links. Browser checks cover photo validation, private preview, publication, live edits, removal and republishing at both viewport sizes. `npx playwright test tests/themes.spec.ts` checks private theme preview, cancellation, persistence, live application, preserved content/URL, keyboard selection, and photo/fallback/long-content layouts for all themes.

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
| `/demo` | Modern Minimal announcement with a local photograph |
| `/demo-no-photo` | No photo or optional message |
| `/demo-long-names` | Long names and no photo |
| `/preview-photo` | Development-only photo response |
| `/[weddingSlug]` | Published wedding landing page |
| `/[weddingSlug]/details` | Enabled published Details page |
| `/[weddingSlug]/rsvp` | Enabled RSVP entry; a private `invite` token is required to respond |

Unknown and unpublished slugs return 404. Only the marketing homepage permits indexing and appears in `/sitemap.xml`; wedding, account and example pages remain noindex. All fixtures are fictional. Production returns 404 for every demo slug and the fixture photo route. Accounts, private preview, publication, Details, and RSVP work with configured Supabase.

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
```

`check` runs lint, route generation/TypeScript, Vitest, and the production build, in that order. The browser suite starts/stops its own development server on port 3100; leave that port free. Run the build and browser suite sequentially so generated Next.js files are not rebuilt during browser checks. On Linux CI, use `npx playwright install --with-deps chromium` for browser system dependencies. Tests use Chromium at desktop and mobile viewport sizes; they do not establish Safari compatibility.

Individual checks are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Browser screenshots and failure traces are under ignored `test-results/`; `npx playwright show-report` opens the HTML report. CI also checks database isolation, application-container connectivity, and browser checks through the development container. Locally, run those browser checks with `E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e` after Compose is up.

## Production container smoke check

Hosted configuration, promotion, rollback and recovery requirements are in [Release and operations](docs/operations.md). Production deployment is still pending F009.

`npm run test:release` selects the account/recovery, publication, themes, Details, RSVP, payments and marketing browser checks. For production-container verification, supply `E2E_BASE_URL` and `E2E_PRODUCTION=1` as below. Run only against a local container connected to local Supabase with test Stripe placeholders; these tests create/delete fictional data and do not support hosted staging/production. Use port 3000 for the complete account journey because local Auth already allows its callback; temporarily stop the development app with `docker compose stop app`, and restart it with `docker compose start app` after removing the verification container. `APP_ORIGIN` must match `E2E_BASE_URL`.

Complete local production check (PowerShell, with local Supabase running and `.env.docker` already generated):

```powershell
docker build --target production -t save-the-dates:f009 .
docker compose stop app
docker run -d --name wedding-f009-verify --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3000 -e STRIPE_SECRET_KEY=sk_test_local_webhook_verification_only -e STRIPE_WEBHOOK_SECRET=whsec_local_webhook_test_secret -p 127.0.0.1:3000:3000 save-the-dates:f009
# Wait for the server to report ready.
docker logs wedding-f009-verify
npm.cmd run smoke -- http://127.0.0.1:3000
$env:E2E_BASE_URL='http://127.0.0.1:3000'
$env:E2E_PRODUCTION='1'
npm.cmd run test:release
# Clean up even if a check fails. Restart app only if it was running before.
Remove-Item Env:E2E_BASE_URL, Env:E2E_PRODUCTION -ErrorAction SilentlyContinue
docker stop wedding-f009-verify
docker rm wedding-f009-verify
docker compose start app
```

Marketing uses runtime `APP_ORIGIN` for its canonical URL, sitemap and social-sharing URLs. Set it to the exact browser-facing origin (no path), for example `-e APP_ORIGIN=http://127.0.0.1:3001` for the local production container below; the fallback is `http://localhost:3000`. Production HTTPS/domain configuration and launch indexation checks belong to F009. Only `/` is listed in `/sitemap.xml`; fictional `/examples/minimal`, `/examples/romantic`, `/examples/bold` and their Details pages remain noindex. They work in production without database access. `/demo` and `/preview-photo` remain development-only.

`npx playwright test tests/marketing.spec.ts` checks the homepage, account-entry links, three fictional examples, metadata, sitemap, social image and 320px layout. Against a production container use `E2E_BASE_URL=http://127.0.0.1:3001 E2E_PRODUCTION=1 npx playwright test tests/marketing.spec.ts` (PowerShell environment syntax as below). Its local unthrottled rendering measurements are diagnostics, not real-user Core Web Vitals or a Safari compatibility claim.

```sh
docker build --target production -t save-the-dates:local .
docker run -d --name save-the-dates-smoke -p 127.0.0.1:3001:3000 save-the-dates:local
npm run smoke -- http://127.0.0.1:3001
docker stop save-the-dates-smoke
docker rm save-the-dates-smoke
```

Run the smoke command after the container reports ready (`docker logs save-the-dates-smoke`). It verifies the home page and 404 responses for the demo variants, photo, and an unknown wedding. This image uses Next.js standalone output and runs as the non-root `node` user. No production deployment or external services are configured yet.

To test publication in the production image against local Supabase, add `--add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3001` to the `docker run` command. Then run `E2E_BASE_URL=http://127.0.0.1:3001 E2E_PRODUCTION=1 npx playwright test tests/publication.spec.ts`. In PowerShell set `$env:E2E_BASE_URL='http://127.0.0.1:3001'` and `$env:E2E_PRODUCTION='1'` before `npx.cmd playwright test tests/publication.spec.ts`; remove those environment variables afterwards. These checks use temporary fictional data and require local Supabase to be running.

For a direct production smoke check, run `npm run build`, then `npm start -- --port 3001` in a terminal; run the same smoke command in a second terminal. Stop with Ctrl+C. Both start the standalone server; direct `npm start` first copies the public and built static assets into the standalone directory using a cross-platform Node script.

## Verification record

F001 verification results and any outstanding checks are recorded in [the backlog](docs/backlog.md#f001---save-the-date-preview). Asset sources and licences are in [fixtures/README.md](fixtures/README.md).
