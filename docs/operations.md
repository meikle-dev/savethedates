# Release and operations

F009 is in preparation. This is an operating procedure, not evidence that a hosted release or restore has succeeded. Current results and blockers live in [the backlog](backlog.md#f009---launch-and-operate-the-service). The information needed from the owner is listed in [production release inputs](release-inputs.md). Local commands are in [running instructions](../run-app-instructions.md).

## Release inputs

Before provisioning, record the owner's selected container host, domain, region, managed Supabase project, spending authority, support address and incident contact. Keep production separate from staging: distinct Supabase projects, Stripe test/live credentials and webhook endpoints, SMTP credentials and application origins. Store secrets in the host's secret manager, never Git or build arguments. Staging is password-protected and unindexed by the application itself ([Staging access](#staging-access)); the production homepage intentionally permits indexing.

Owner-approved terms/privacy, retention periods, deletion handling (including payment records and backups), support process, and recovery objectives are still required. Export and deletion tooling is not implemented. Do not accept real customers until these gaps and the hosted release checks below are resolved.

## Container and runtime configuration

CI builds the Dockerfile's `production` target, tests it and publishes that same image tagged with its commit ([Image publishing and Render](#image-publishing-and-render)); retain its digest and the previous working digest. Deploy the identical image to staging and production. It runs the standalone Next.js server as `node`, listening on port 3000. Terminate HTTPS at the host proxy and preserve the public Host/Origin for Server Actions. Start with one application instance. Do not cache authenticated pages, wedding pages, photos, auth callbacks or webhooks at the proxy.

| Runtime variable | Production value |
| --- | --- |
| `APP_ORIGIN` | Exact public HTTPS origin, without path or trailing slash; used for auth, checkout returns, search metadata and the guest links couples copy and share |
| `SUPABASE_URL` | Chosen managed project's HTTPS API URL, `https://<ref>.supabase.co`, for both environments. Production does **not** use a custom domain (F063: the owner declined the $10/month Custom Domain add-on on 26 September 2026), so Google sign-in shows the raw Supabase address until brand verification is approved — see F063 for the outstanding TODO |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key for that same project |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project's server-only service-role key, used by the verified webhook |
| `STRIPE_SECRET_KEY` | Test key on staging; live key only for the approved production release |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's registered webhook endpoint |
| `AUTH_GOOGLE_ENABLED` | `true` once that environment's Supabase project has the Google provider configured; shows **Continue with Google**. Unset hides it |
| `SENTRY_DSN` | Optional. The Sentry EU project's DSN (Project Settings → Client Keys). If unset, nothing is sent to Sentry and the browser never loads the SDK |
| `SENTRY_ENVIRONMENT` | Optional. `staging` or `production`. Tags Sentry events and log lines; defaults to `local` |
| `APP_RELEASE` | Optional. The commit SHA. CI builds it into the image (`--build-arg APP_RELEASE`), so set it only to override. Defaults to `unreleased` |
| `APP_ENV` | `staging` on staging. Production also sets it before launch as the pre-launch lock ([launch plan](launch-plan.md)), then leaves it unset from launch onwards. Any other value refuses every request |
| `STAGING_USERNAME`, `STAGING_PASSWORD` | Set with `APP_ENV=staging` (staging, and production until launch). The shared basic-auth login; the password must be at least 16 characters |

The image excludes `.env*`; set the six required values at runtime, plus the three staging values on staging only. The three monitoring values are optional and also read at runtime, including by the browser through the no-store `/api/runtime-config` route, so one image serves every environment. Never copy the generated local `.env.docker` to a hosted environment. Local fixture keys and Stripe placeholders are unusable for real Checkout. Use `/api/health` as the liveness probe. It returns 200 `ok`, needs no staging password, and deliberately does not test database, email or billing connectivity.

## Staging access

Set `APP_ENV=staging` with `STAGING_USERNAME` and `STAGING_PASSWORD` on the staging service only. Generate the password in a password manager (at least 16 characters; 32 random characters recommended) and share it only with testers. `src/lib/staging-access.ts` then:

- answers every other request without the right login with 401 and a password prompt, before any application code or Supabase call runs;
- sends `X-Robots-Tag: noindex, nofollow` on every response. `robots.txt` is gated too: without the login it returns 401, which crawlers read as "no rules", so the open pages below stay reviewable while `noindex` keeps them out of search. With the login it disallows everything;
- refuses every request with 503 if the login is missing, the password is too short or `APP_ENV` has any other value, so the health check fails and Render keeps the previous deploy.

These paths answer without the password. The homepage (`/`) and the legal pages (`/privacy`, `/terms`, `/refunds`), exact paths only, are public on production too; Google's OAuth consent screen needs a reachable homepage and privacy policy for the staging client (F055). They show no account or wedding data and stay `noindex` on staging. The Stripe webhook is authenticated by its signature. `/api/health` returns only `ok`, because Render's health check can't send a login. The twelve fictional theme images (`/media/themes/<theme>.webp`, exact files only) are public on production too, and Next's image optimiser fetches them internally without request headers, so gating them breaks the homepage images. Any other `/media/themes/...` path matches the guest routes and stays gated. Build assets under `/_next/static` and `/_next/image` skip the proxy. Build assets contain no customer data, and `images.localPatterns` limits the optimiser to the theme images, whose internal fetch is the only one that passes the gate.

Browsers remember the login for the session. Auth emails link to `/auth/confirm`, which prompts for the login once if needed. Staging uses only disposable test data; the password keeps out search engines and the public, not a determined attacker, so never load real customer data into staging.

## Image publishing and Render

On every push to `main`, after all CI checks pass, the `publish-image` job pushes the tested image to `ghcr.io/<owner>/<repo>:<commit SHA>` and records its digest in the run summary. It holds the only registry write token and runs no project code. Pull requests and other branches publish nothing. (GitHub's default branch is still an old `master`; the workflow names `main` explicitly. Switching the default to `main` in the repository settings is a tidy-up, not a requirement.) Packages of a public repository are free to store and pull. If the repository becomes private, GitHub's package storage and transfer limits apply; then delete old tags that are no longer rollback candidates.

- **Registry credentials:** Render pulls with a GitHub **classic** personal access token that has only `read:packages` (Render: Settings → Registry Credentials); GHCR doesn't accept fine-grained tokens for this.
- **Health check path:** `/api/health` on both services.
- **Staging deploys:** optional. Copy the staging service's deploy hook (Render: Settings → Deploy Hook) into the GitHub Actions secret `RENDER_STAGING_DEPLOY_HOOK`. CI then deploys each published tag to staging. The hook URL is a secret; regenerate it in Render if it leaks. Without it, deploy staging the same way as production.
- **Production deploys:** manual, only after the checks in [Verification and promotion](#verification-and-promotion). In the production service's settings, change the image tag to the reviewed commit SHA and save; if Render doesn't start a deploy, use **Manual Deploy → Deploy latest reference**. Check that the digest in Render's deploy log matches the CI run summary.
- **Rollback:** redeploy the previous working deploy from the service's deploy history ([Rollback and incidents](#rollback-and-incidents)). Keep its tag in GHCR; Render's rollback fails if the image is gone.
- **Notifications:** in Render's notification settings, send deploy failures and service failures to the incident email.

## Memory and photo uploads

Photo decoding is the main memory risk on a small host (F037: Render Starter, 512 MB, 0.5 CPU). Each server instance processes one photo at a time. Up to three more uploads wait, for at most 20 seconds each. Any other upload gets "Photo uploads are busy — please try again in a moment" and nothing is saved. libvips runs with one thread and no operation cache. The production image sets `MALLOC_ARENA_MAX=2` to limit glibc fragmentation. Since F062, owners' browsers shrink photos over 5 MiB or 25 MP before upload, so the server's limits and these measurements still apply unchanged.

Measured on 24 September 2026 with the production image run locally using `docker run --memory=512m --cpus=0.5` against local Supabase. Each burst was five near-simultaneous 5000×5000 uploads (three JPEG, two PNG) while a published wedding page received 10 requests per second. Each row covers three bursts on one container:

| | Before F040 | After F040 |
| --- | --- | --- |
| Idle memory | 97 MiB | 85 MiB |
| Peak memory per burst | 402, 447, 489 MiB (still rising; 96% of the limit) | 197, 210, 210 MiB (41%) |
| Memory kept after the burst | 339, 442, 483 MiB | 185, 180, 189 MiB |
| Guest page p95, no uploads | 10 ms | 11–12 ms |
| Guest page p95, during uploads | 6.0–6.3 s | 0.38–0.60 s |
| Upload outcome | 5 saved after 8–10 s | 4 saved one after another in 2–8.5 s; 1 busy message |

For comparison, jemalloc peaked at 239 MiB with a p95 of 0.44–0.59 s during uploads and needs an extra system package. The new code without an allocator setting peaked at 296, 335 and 366 MiB, still rising. One photo alone (0.5 CPU) peaks at about 65 MiB for a 25 MP JPEG, 50 MiB for a 24 MP WebP and 38 MiB for a 25 MP PNG. Orienting a photo before resizing it would roughly double the JPEG figure, so orientation is applied after resizing.

Upgrade to Render Standard (2 GB) if any of these happen:

- memory is regularly above about 70% (360 MB on Starter);
- the service restarts after running out of memory;
- guest page response times rise at busy times.

These are local Docker figures. Repeat the same check on F009 staging once the host exists.

## Database, email and payments

1. Verify the target project identifier and environment before any database write. Capture a recoverable database backup and separate Storage backup before upgrading an existing environment. On a new staging project, apply all committed `supabase/migrations/` in order using the pinned repository CLI. For a deliberately linked project, inspect `npx supabase migration list`, then `npx supabase db push --dry-run`, review the pending SQL, and only then run `npx supabase db push`. Do not run local reset, test fixtures or local environment generation against production.
2. In managed Auth, enable email/password confirmation, set Site URL to `APP_ORIGIN`, and allow the exact `APP_ORIGIN/auth/confirm` redirect. Copy the signup/recovery templates from `supabase/templates/`; the application expects token hashes at `/auth/confirm`. Configure verified Resend SMTP credentials in Supabase Auth, not a second application email flow. Verify signup and recovery in real external inboxes, including expired links and return to the correct host. For Google sign-in, also allow the exact `APP_ORIGIN/auth/callback` redirect, enable the Google provider with that environment's OAuth client (F041 step 2), then set `AUTH_GOOGLE_ENABLED=true` on the service. The app exchanges the returned code server-side (PKCE, verifier in an httpOnly cookie). Access and refresh tokens never appear in URLs. The single-use code does appear in the `/auth/callback` URL, including browser history and any host log that keeps query strings, but it cannot be used without that browser's verifier. Supabase's [default SMTP service is for non-production use](https://supabase.com/docs/guides/auth/auth-smtp); see its [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
3. Register `/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `refund.created`, and `charge.dispute.created`. Use the endpoint-specific secret. Verify test Checkout and delivery/retries on staging. A browser success redirect alone does not grant publication. Live purchase/refund verification needs the owner's release authority and records of the actual result.

## Verification and promotion

The launch order is set by the [launch plan](launch-plan.md). Production is created locked, reviewed by Stripe and Google, rehearsed end to end by the owner (including a live purchase and refund), and only then opened by removing the lock.

The repository's automated account/database tests create and delete fictional local users and use local Mailpit and signed webhook fixtures. **Do not point the browser suite (`test:e2e`), integration or persistence tests at a hosted deployment.** They require a local Supabase stack and test Stripe placeholders. They do not verify hosted Checkout, SMTP, a managed database, or real payment processing.

For a production container connected to local Supabase, set `E2E_BASE_URL` to its origin, `E2E_PRODUCTION=1`, and run `npm run test:e2e`. This covers signup/recovery, private drafts, purchase gates and webhook failures, photo/publication, themes, Details, RSVP and owner responses, plus marketing/SEO. CI runs the browser suite only here, against its production container, after integration and persistence checks; the development-only demo fixtures run separately through the development container. Keep `APP_ORIGIN` equal to the browser origin and use a callback origin allowed by local Auth (port 3000 is already configured).

On staging, manually verify the complete journey using a disposable owner and guest: confirm email, save details/photo, switch themes, preview, complete real Stripe test Checkout, publish, read Details, submit RSVP, correct the response as owner, view responses, unpublish and confirm page/photo denial. Verify a second owner cannot read the first owner's workspace or responses. Exercise failed payment, webhook replay/refund, RSVP deadline closure, expired entitlement, invalid/rotated shared links and account recovery. F031 retired individual invitations; do not treat legacy correction links as the current guest journey. Record results and clean up only that disposable owner's data.

F049 adds actual iPhone Safari, desktop Firefox and focused keyboard/screen-reader/contrast evidence for the completed launch changes. Record device/browser versions and build digest; Chromium or emulated WebKit results do not establish a physical-device pass. F041 completes setup/staging preparation and hands off to F049/F009; final production promotion remains F009. F048 supplies the approved customer export/deletion process and its evidence.

Before promotion, obtain independent release review. Check HTTPS, intended canonical and Open Graph origins, `/media/share`, `/robots.txt`, `/sitemap.xml` listing only `/` and `/digital-save-the-date`, indexation of those two pages and noindex on examples/account/wedding routes. Check mobile usability and page performance on the actual host. Ensure no staging origin, placeholder legal copy or unapproved claims are public. Deploy the reviewed image digest, run `npm run smoke -- https://<approved-domain>` and repeat the essential hosted journey with authorised verification data. Record timestamp, commit/digest, migration versions and reviewer outcome in F009. Launch remains incomplete until actual deployment and smoke are recorded.

## Logging standard

Reading one request ID should tell the story of that request (F038).

- **One logger.** Server code logs only through `src/lib/logger.ts`. ESLint `no-console` enforces this in `src/`.
- **Output.** Production writes one JSON line per event to stdout, which the host keeps. Local development prints one readable line, for example `21:44:51.406 INFO  rsvp.submit.accepted req=e2633aa2 route=/[names]/[secret]/rsvp durationMs=23`.
- **Fields on every line:** `timestamp`, `level`, `event`, `requestId`, `environment`, `release` and `route` (a route template, never a real path).
- **Optional fields** come from a typed allow-list: `ownerId`, `weddingId` (UUIDs), `stripeEventId`, `eventType`, `reason` (a short code, never free text), `durationMs`, `count`, `section` and `errorReference`. Anything else is dropped, and every value goes through the shared scrubber (`src/lib/monitoring/scrub.ts`). Names, emails, form values and URLs with query strings cannot be logged.
- **Levels.** `error` needs attention and raises a Sentry alert. `warn` is an expected but notable refusal. `info` is a key business event. `debug` is local only.
- **Names** follow `area.action.outcome`. `rejected` means an expected refusal (`warn`); `failed` means a fault (`error`).
- **`withLogging(operation, route, fn)`** wraps each Server Action and Route Handler. It adds the request ID, route and, after `identify()`, the owner and wedding to every line, plus `durationMs` since the start. An unexpected error is logged once as `<operation>.failed` and rethrown. When the code logged nothing, a local-only `<operation>.completed` debug line records the outcome.
- **Log each failure once, where it is handled.** Unexpected errors reach Sentry through `onRequestError` in `src/instrumentation.ts`. That also writes `app.request.failed`, unless `withLogging` already logged the error.
- **Request ID.** `src/proxy.ts` gives every request except Next.js build assets (`/_next/static`, `/_next/image`) a new UUID, overwriting any value the client sent. It is returned in the `X-Request-Id` response header, written as `requestId` on log lines and set as the Sentry tag `request_id`.
- **Error reference.** The workspace error pages show "Error reference: …", which is the Next.js error digest. The same value is the `errorReference` log field and the Sentry tag `error_reference`.

### Events

| Event | Level | Meaning |
| --- | --- | --- |
| `app.request.failed` | error | Unexpected server error not already logged (render, route or action) |
| `account.signup.requested` / `.failed` | info / error | Confirmation email requested (also for an existing email, which is not revealed) / Auth or email failure |
| `account.confirm.succeeded` / `.rejected` / `.failed` | info / warn / error | Email link confirmed (`eventType` signup or recovery) / invalid, expired or malformed link / fault |
| `account.signin.rejected` / `.failed` | warn / error | Wrong credentials or unconfirmed email (`reason` is the Auth code, never the email) / fault |
| `account.recovery.requested` / `.failed` | info / error | Recovery email requested / fault |
| `account.password.updated` / `.rejected` / `.failed` | info / warn / error | Password changed / expired link or refused password / fault |
| `account.signout.failed` | error | Sign-out failed |
| `account.google.failed` | error | Could not start Google sign-in (Supabase error or fault) |
| `account.google_callback.succeeded` / `.rejected` / `.failed` | info / warn / error | Google sign-in completed / cancelled (`access_denied`), provider error, rejected or missing code / fault |
| `workspace.save.succeeded` / `.rejected` / `.failed` | info / warn / error | Save per `section` (basics, details, invitation, theme, photo_framing, rsvp_settings, guest_link) / concurrent change / fault |
| `workspace.ownership.denied` | warn | No session or no saved wedding for this owner |
| `photo.upload.accepted` | info | Photo processed and stored; `durationMs` is processing time, including any wait for the processing slot |
| `photo.upload.rejected` / `.failed` | warn / error | `reason` size, type, pixels, unreadable, busy (F040) or concurrent_change / Storage or database fault |
| `photo.read.failed` | error | A saved photo could not be read from Storage |
| `publication.publish.succeeded` / `.blocked` / `.rejected` / `.failed` | info / warn / warn / error | Published / no entitlement / URL taken / fault |
| `publication.unpublish.succeeded` / `.failed` | info / error | Unpublished / fault |
| `payment.checkout.created` / `.reused` / `.conflicted` / `.rejected` / `.failed` | info / info / warn / warn / error | New Stripe Checkout / pending one reused / previous attempt still confirming / already paid or no attempt possible / fault |
| `payment.stripe.failed` | error | Stripe API error (`reason` is the Stripe error type) |
| `payment.checkout.expired` | info | Signed expiry event processed |
| `payment.webhook.received` / `.rejected` / `.duplicate` / `.recorded` / `.failed` | info / warn / info / info / error | Verified event (`stripeEventId`, `eventType`) / missing or invalid signature or incomplete event / already processed / revocation stored before its payment / database fault |
| `payment.entitlement.granted` / `.revoked` | info | Entitlement granted / revoked by refund or dispute |
| `rsvp.submit.accepted` / `.rejected` / `.failed` | info / warn / error | Guest response saved / `reason` closed, rate_limited, capacity, invalid_link or invalid_input / fault |
| `rsvp.link.rotated` / `.rejected` / `.failed` | info / warn / error | Shared link replaced / invalid shared link opened / fault |
| `rsvp.response.corrected` / `.removed` / `.rejected` / `.failed` | info / info / warn / error | Owner corrected or removed a response / response not found / fault |

`withLogging` operations (each has a `.failed` event above and a local `.completed` debug line): `account.signup`, `account.signin`, `account.recovery`, `account.password`, `account.signout`, `account.confirm`, `account.google` (starting Google sign-in), `account.google_callback`, `workspace.save`, `photo.upload`, `photo.read`, `publication.publish`, `publication.unpublish`, `payment.checkout`, `payment.webhook`, `rsvp.submit`, `rsvp.link`, `rsvp.response`.

### Where to log

| Area | Where | Events |
| --- | --- | --- |
| Account | `src/features/account/actions.ts`, `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts` | `account.*` |
| Workspace | `src/features/workspace/actions.ts`, `details-actions.ts`, `invitation-actions.ts`, `theme-action.ts`, `photo-framing-action.ts`, `rsvp-actions.ts` (RSVP settings), `publication-actions.ts` (guest link names), `workspace-access.ts` | `workspace.save.*`, `workspace.ownership.denied` |
| Photos | `src/features/workspace/publication-actions.ts` (`changePhoto`); `src/app/[names]/[secret]/photo` and `src/app/dashboard/photo` route handlers through `src/features/weddings/photo-response.ts` | `photo.*`. The development-only `/preview-photo` fixture route is not logged |
| Publication | `src/features/workspace/publication-actions.ts` | `publication.*` |
| Payments | `src/features/payments/payment-actions.ts`, `src/app/api/stripe/webhook/route.ts` | `payment.*` |
| RSVP | `src/features/workspace/rsvp-actions.ts`, `src/app/[names]/[secret]/rsvp/page.tsx` | `rsvp.*` |
| All | `src/instrumentation.ts` (`onRequestError`) | `app.request.failed` |

New server features follow the same pattern: add the event names to `src/lib/logger.ts` and to the tables above.

## Monitoring and AI-assisted investigation

### What is collected

- **Sentry** (EU region, free plan, owned by the owner) receives server errors (`onRequestError`), browser errors, and log lines at `info` and above as Sentry Logs. Each `error` line also opens an issue, so it can raise an alert.
- **Host stdout** keeps every JSON log line. This is the fallback when Sentry is unavailable.
- **Supabase** keeps its own Postgres, Auth, Storage and API logs.
- Settings: `sendDefaultPii` off; the Sentry user is the owner UUID only; no console or DOM (click and input) breadcrumbs; `tracesSampleRate` 0 (no tracing) and no trace headers on outgoing requests; no Session Replay; no browser session tracking, so a normal page view sends nothing to Sentry. The browser contacts Sentry only to report an error.
- **Scrubbing** happens before anything leaves the app. It removes all query strings (`?share=`, `?q=`, `/auth/confirm` `token_hash`/`type`, Supabase REST filters); rewrites the guest link secret in `/<names>/<secret>/…` (including altered or truncated secrets) to `/<names>/[secret]/…`, and retired `/s/<secret>/` links to `/s/[secret]/`; drops Authorization/Cookie headers, JWTs, service keys, request and form bodies and Server Action payloads; and removes values from exception messages.
- With `SENTRY_DSN` unset, nothing is sent and the browser never downloads the Sentry SDK.

### Set up Sentry (once)

**Status:** done for staging and GitHub on 25 September 2026 (org `meikle`, project `savethedates`). Set `SENTRY_DSN` and `SENTRY_ENVIRONMENT=production` when the production service is created. Step 7 retention is still to be checked. The values to set are `SENTRY_DSN` and `SENTRY_ENVIRONMENT` on each Render service, and `SENTRY_AUTH_TOKEN` (secret), `SENTRY_ORG` and `SENTRY_PROJECT` (variables) in GitHub. `APP_RELEASE` needs no action because CI builds it in.

1. Create a Sentry account in the **EU (Germany) data region**, owned by the owner, on the free plan.
2. Create one project, platform Next.js. Staging and production share it and are told apart by `SENTRY_ENVIRONMENT`.
3. Open Project Settings → Security & Privacy. Turn on **Prevent Storing of IP Addresses** and leave **Data Scrubber** and **Use Default Scrubbers** on. These back up the app's own scrubbing.
4. The DSN is public (browsers read it from `/api/runtime-config`). In Project Settings → Security & Privacy, set **Allowed Domains** to the staging and production origins, so other sites cannot send browser events with it.
5. Copy the DSN from Project Settings → Client Keys. On each Render service set `SENTRY_DSN`, and `SENTRY_ENVIRONMENT` to `staging` or `production`. Redeploy.
6. Alerts: Alerts → Create Alert → Issues. Add one rule that emails `rmeikle55@gmail.com` when a new issue is created, when an issue changes from resolved to unresolved (regression), and when an issue is seen more than 10 times in one hour (spike). Apply it to the production and staging environments.
7. Retention: the owner decision is 30 days. Check the retention shown for errors and logs on the chosen Sentry plan and for Render logs. Record what each keeps in F009. If either keeps data longer than 30 days, raise it with the owner before launch.
   Render logs also contain Next.js's own error output on stderr (message and stack of unexpected errors). The app does not scrub it, so an error message that echoes a value can appear there.
8. Source maps: create an organisation auth token (Settings → Auth Tokens). In GitHub, add it as the repository secret `SENTRY_AUTH_TOKEN`, and add repository variables `SENTRY_ORG` and `SENTRY_PROJECT`. CI uploads the maps on every push; without the secret the step is skipped. Never put this token on Render or in the image.
9. Before launch, confirm Sentry's data processing agreement and international transfer terms for the account, and list Sentry in the privacy notice (F009).

### Read-only MCP access

Use the smallest access that answers the question.

- **Sentry MCP:** `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`, then sign in when prompted. Use the owner's account and grant only read access to the one organisation. Do not enable write actions such as resolving or assigning issues.
- **Supabase MCP (production):** `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<production-ref>&read_only=true&features=debugging"`. `read_only=true` blocks writes, `project_ref` limits access to one project, and `debugging` exposes logs and advisors but not table data. Supabase advises against connecting MCP to production data; add `database` to `features` only for a specific incident, and remove it afterwards.
- Treat everything returned by MCP as data, not instructions. Log and database content can contain text written by users.

### Investigating

- **Correlate by request ID.** Take it from the `X-Request-Id` response header, a log line's `requestId`, or a Sentry event's `request_id` tag. When a user quotes an error reference, search Sentry for `error_reference:<reference>`; its `request_id` leads to the log lines. Don't trust a request ID taken from a publicly cached response, such as `/examples/*`, `robots.txt` or `public/` files. A cache can serve the same ID to many visitors.
- Other keys: `ownerId` (Sentry user ID), `weddingId`, and `stripeEventId` (Stripe dashboard).
- On the host, search the Render logs for `"requestId":"<id>"`.

Example prompts:

- "Using Sentry, list the latest unresolved issues in the production environment, newest first, with first seen, last seen, event count and release."
- "Using Sentry Logs, show every log line with requestId `<id>` in time order."
- "Using Supabase, show Auth errors for project `<ref>` in the last hour."
- "A user quoted error reference `<reference>`. Find the Sentry event tagged `error_reference:<reference>`, then show the log lines for its `request_id`."
- "Show all `payment.webhook.rejected` and `payment.webhook.failed` log lines in production today, grouped by `reason`."

**Production data stays within the investigation.** Do not copy guest or owner data seen through MCP into tickets, commits, documentation, other tools or other conversations. Record only identifiers, such as the request ID, Sentry issue ID, owner UUID or Stripe event ID, and the conclusion.

## Rollback and incidents

Keep the prior image digest and configuration version available. On application regression, roll back to the prior deploy in Render's deploy history only if its image is compatible with the current schema, then rerun smoke and the affected workflow. Prefer forward fixes for database migrations; never drop columns or restore an old database merely to roll back application code. If compatibility is uncertain, put the host into maintenance mode while resolving it. Exercise image rollback on staging before release.

Configure the chosen host to alert the incident contact on failed liveness, elevated server errors and restart loops. Monitor Supabase availability/storage capacity, SMTP failures and Stripe failed webhook deliveries. Redact auth tokens, invitation query strings, guest details and secrets from proxy and application logs; the application's own logs and Sentry data follow the [logging standard](#logging-standard). Investigation steps are in [Monitoring and AI-assisted investigation](#monitoring-and-ai-assisted-investigation). Alerting, log retention and contact routing must still be exercised on the real host (F009).

For payment-success/publication failures, inspect the Stripe event ID and delivery status, verify environment and signature configuration, then retry delivery after correction. Do not manually grant entitlement from a screenshot or success URL. For exposure, disable the affected publication or restrict host traffic, preserve a minimal incident record and assess scope with the owner. Support must verify ownership before discussing guest responses or making account changes; never request passwords or invitation tokens.

## Recovery and data handling

Choose and approve recovery-time and recovery-point objectives, backup frequency/retention and a restricted backup destination before launch. Supabase [database backups do not contain Storage file bytes](https://supabase.com/docs/guides/platform/backups). Back up the private `wedding-photos` objects separately, including orphaned objects from failed replacement cleanup, along with a manifest/checksums and the database snapshot association. Encrypt backups and keep restore credentials separate from the application.

Exercise recovery into an isolated non-production project: restore database/Auth state and Storage bytes, reapply required project configuration, validate schema/RLS and object checksums, then verify owner sign-in, private drafts/photos, publication gating and RSVP responses. Disable outbound production email/webhooks during the drill. Record restore duration and recovered snapshot age against the approved objectives. Before reopening a restored service, reconcile Stripe events since the snapshot and reapply deletion requests so revoked entitlements or deleted customer data are not resurrected. The existing persistence test verifies restart survival only; it is not a backup/restore drill.

Current expiry hides guest pages, photos and RSVP after the purchased period. New checkout attempts grant six months after the wedding date frozen at checkout; purchases and pending attempts created before the change keep their recorded twelve-month expiry. Expiry preserves private drafts and responses; it does not delete data. Refund/dispute revocation also removes public access. Approved retention and deletion rules must explicitly cover Auth accounts, wedding/details rows, invitations/responses, all photo paths and orphans, payment/event records, logs and backup expiry. Never delete only the Auth user and assume Storage bytes were removed. The export scope must include the verified owner's content, invitations/responses and photos without exposing other owners, credentials or unrelated payment events. Implement and test the approved process before handling real requests; no legal retention period is assumed here.
