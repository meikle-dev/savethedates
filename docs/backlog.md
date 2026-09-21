# Product backlog

Ordered by recommended implementation sequence. F001-F008 and F011-F013 are complete and the usable-core MVP milestone is verified. **Current: F009** remains In Progress with external release blockers. **Next follow-up: prepare F014**, from the 21 September owner review below. F014-F022 remain ordered review follow-up work.

## Status and handoff rules

**MVP milestone:** F001-F006 deliver the usable core product: owner setup, publication, three themes, Details, and RSVP. This is the first version of the actual application, not disposable prototype code. The Product Manager confirms this milestone only after these features are Done and the complete owner-to-guest journey is verified, with required review complete and no blocking findings.

**Paid launch milestone:** F007-F009 add purchase, marketing, and operational release readiness. A usable MVP is not automatically approved for public paid launch. After the MVP, a general work request continues with the next eligible feature through the same workflow; no restart or rewrite is intended.

After the launch backlog is complete, the Product Manager prioritises the next small feature from user direction, feedback, or recorded defects. Keep F010 as an idea list; do not automatically implement all deferred ideas. If there is no justified next feature, report that and ask for direction rather than inventing work.

- `Planned`: needs requirements, design, decisions, or completed dependencies.
- `Ready`: acceptance is testable, required decisions/design are resolved, dependencies are Done, and implementation can start.
- `In Progress`: selected work, including interrupted work or work awaiting checks/review.
- `Done`: meets the definition of done in AGENTS.md, with verification evidence.
- `Deferred`: intentionally outside the current delivery scope.

The Product Manager owns scope/order/acceptance; engineering updates delivery status and evidence. Never mark features Done merely because requirements have been written. Before promoting a Planned feature, refine only that feature, consult UX where needed, and identify security checks. A feature may be split if it cannot be delivered and verified coherently in one session; retain stable IDs and explicit dependencies.

For active work add a compact **Handoff**: implemented paths, exact checks/results, review outcome, blockers (or None), and next action. Replace stale notes rather than append a diary. On completion retain a short evidence summary. Blocked work keeps its status and records what will unblock it.

## F001 - Save the Date preview

**Status:** Done
**Purpose:** Establish the core guest experience and a working foundation before external integrations.
**Description:** Build a responsive Modern Minimal landing page using explicit development fixture data. This is a local preview of the first product feature, not a customer publication system.
**Depends on:** None
**References:** `docs/overview/product-overview.md`, `docs/overview/tech-stack.md`, `docs/overview/architecture.md`, `docs/ux/template-ui-summary.md`, `docs/ux/save-the-date-options-design.png` (left design).
**Done when:**

- A fresh checkout installs and runs one Next.js App Router/TypeScript/Tailwind application using documented Node/package-manager versions and a committed lockfile.
- A development-only demo slug displays names, date, location, optional message, and an image with a graceful no-image fallback. Unknown slugs return 404; production does not expose the development fixture.
- The Modern Minimal composition follows the reference at mobile and desktop sizes; long names and missing optional content remain readable. Real text, semantic structure, focus states, and accessible image treatment are used. Asset sources/licences are recorded; do not ship a screenshot as the page.
- Details and RSVP links are hidden until those features are available; no dead controls or pretend submission flows.
- The wedding page is noindex. No accounts, database, billing, or external credentials are required for this slice.
- A Dockerfile and simple Docker Compose development entry point run the application reproducibly. A production image builds and passes a smoke check without exposing the development fixture. Direct Node.js development remains available.
- Populate the initially empty root `run-app-instructions.md` with verified prerequisites, environment setup, Docker and direct Node.js start/stop commands, local URL, and build/check commands; README links to it. CI runs lint, type checking, relevant automated tests, and a production build. An automated browser check covers the demo content and unknown slug; mobile/desktop visual inspection is recorded.
- Independent review covers the initial application structure and verification setup.

**Handoff (18 September 2026):**

- Implemented the Next.js/TypeScript/Tailwind application in `src/app/` and `src/features/weddings/`, with `/demo`, no-photo/long-name fixtures, image-failure fallback, noindex metadata, and server-enforced production 404s. Fixture asset/source/licence: `fixtures/`. Docker, locked dependencies, Vitest, Playwright, smoke scripts, and GitHub Actions are included. Running instructions are populated and linked from README.
- Passed on Windows Node 24.11.0/npm 11.6.1: `npm.cmd ci`; `npm.cmd run check` (lint, TypeScript, 4 Vitest tests, production build); `npx.cmd playwright install chromium`; `npm.cmd run test:e2e` (12/12). After the final standalone-start/smoke tooling changes, `npm.cmd run lint`, `npm.cmd start -- --port 3001`, `npm.cmd run smoke -- http://127.0.0.1:3001`, and a stylesheet HTTP 200 check passed. `git diff --check` passed.
- Docker Linux verification passed: `docker compose up --build -d`; `node scripts/smoke-development.mjs`; `docker compose down`; `docker build --target production -t save-the-dates:local .`; `docker run -d --name save-the-dates-smoke -p 127.0.0.1:3001:3000 save-the-dates:local`; `npm.cmd run smoke -- http://127.0.0.1:3001`; `docker stop save-the-dates-smoke`; `docker rm save-the-dates-smoke`. Production home returned 200; demo variants, photo, and unknown wedding returned 404 without fixture content.
- Visually inspected Playwright screenshots at 390×844 and 1440×1000 for the photo, no-photo/no-message, and long-name variants: readable content, no horizontal overflow, suitable reference composition. Image-failure and keyboard entry checks passed. In-app browser connection was unavailable; repository Playwright provided browser verification. Screenshots are regenerated under ignored `test-results/`.
- Independent reviewer `review_f001` reviewed structure, production boundaries, UI semantics, tests, Docker/CI, docs, and final launcher changes: no Blocking or Important findings. Hosted GitHub Actions has not run; its constituent checks were exercised locally. Safari/Firefox and external deployment were not tested or required for this slice.
- Blockers: None. Next: Product Manager prepares F002 account/workspace acceptance and UX, then engineering implements it. No F002 implementation started.

## F002 - Couple account and private wedding workspace

**Status:** Done
**Purpose:** Allow a couple to securely create and retain their wedding content.
**Description:** Supabase authentication and one private wedding draft per account, with a simple guided editing workspace. UX defines account entry/recovery, draft editing, and validation/error states before Ready.
**Depends on:** F001
**References:** `docs/overview/architecture.md`, `docs/overview/site-ui.md`, `docs/overview/tech-stack.md`.
**Prepared scope and UX:** Email/password signup with confirmation, sign-in, sign-out, generic recovery request and password replacement. Passwords are 12–128 characters; email is limited to 254 characters. Account screens use the Modern Luxe teal/off-white palette, serif heading, labelled full-width fields, visible focus, pending buttons, and inline/status errors. `/dashboard` is a single editing form with a “Private draft” status; first save creates the account's only wedding. Required: each name (1–80 characters), real calendar date (1900–2199), location (1–160); optional plain-text message (up to 500). Trim text, validate on the server and in the database; no past/future restriction. Failed saves retain all entered wedding content, successful saves announce confirmation, and later sign-ins reload the saved content. Explain that the draft is not shared and photo/publication comes later, without inactive buttons. No guest route reads draft data. Supabase owns credentials and email tokens; the local mailbox captures confirmation/recovery email without external delivery. Access checks use a verified server user and database RLS. Prepared from Product Manager and UX roles; F001 dependency is Done, so engineering may proceed.
**Handoff (18 September 2026):**

- Implemented Supabase email/password signup with confirmation, sign-in, sign-out, generic password recovery, password replacement, and verified cookie sessions. Added `/dashboard` private draft workspace with server-side Zod validation, retained failed form values, pending/status/error states, and one owner draft containing names, date, location, and optional message.
- Added local Supabase CLI config, confirmation/recovery templates, private `weddings` migration with one-row-per-owner uniqueness, database checks, updated-at trigger, and RLS policies. Added local environment generation that writes only publishable keys; service-role credentials stay test-script-only and are never written to application env files. Added Compose host connectivity and local Mailpit instructions.
- Passed after `npm ci`: `npm.cmd run check` (lint, typecheck, 12 Vitest tests, production build), `npm.cmd run test:integration` (4 RLS/validation tests), `npm.cmd run test:persistence` (temporary draft survives Supabase stop/start), and `npm.cmd run test:e2e` (16/16 direct-host browser checks at desktop/mobile). The browser suite through the rebuilt development application container also passed the account journey and preview checks (16/16 after fixing the container origin and rebuilding dependencies). `docker compose exec app` confirmed app-container access to `/account/sign-up`; `git diff --check` passed.
- Visually inspected signup/workspace screenshots at mobile and desktop sizes: clear Modern Luxe hierarchy, private-draft status, readable two-column desktop form, stacked mobile fields, visible focus/error/status treatment, and no horizontal overflow.
- Independent reviewer `review_f002` found no Blocking security findings. Its Important documentation/connectivity findings were resolved: running instructions now cover Supabase startup/shutdown, Mailpit, generated env files, destructive reset, persistence verification, and container/browser connectivity; CI runs integration, persistence, app-container, and container-browser checks. Database message validation now rejects untrimmed/overlong values as well as server validation.
- Blockers: None. Next: Product Manager prepares F003 photo, preview, slug, and publication acceptance; no F003 implementation started.
**Done when:**

- An owner can sign up, authenticate, sign out, recover access, and return to their persisted wedding draft; guest visitors need no account.
- The owner can save names, wedding date, location, and optional message; required fields and server validation are explicit, and failed saves preserve entered content.
- Migrations and RLS enforce one wedding per owner and deny unauthorised reads/writes; drafts are never public. Integration tests use two owners and an anonymous caller to verify isolation.
- The Supabase CLI runs the local database/auth services in Docker without a hosted account. Verify browser and application-container connectivity, migrations, local auth email testing, and data persistence across restarts. Extend `run-app-instructions.md` with prerequisites, startup/shutdown, safe environment examples, and clearly labelled destructive reset instructions. Supabase Auth controls authentication; email transport does not duplicate auth logic.
- The dashboard communicates draft state and next action. Security-sensitive implementation receives independent review.

## F003 - Photo, preview, and publish a shareable site

**Status:** Done
**Purpose:** Let couples share a real, personalised Save the Date URL.
**Description:** Add a photo, select a unique URL, preview privately, publish, update, and unpublish. Explain public-link visibility before publication.
**Depends on:** F002
**References:** `docs/overview/architecture.md`, `docs/overview/product-overview.md`, `docs/overview/site-ui.md`.
**Prepared scope and UX:** Extend the existing workspace with Photo and Share your site sections after the saved details. Save required details first; preview always shows saved content with a return link. Optional JPEG/PNG/WebP photo up to 5 MiB and 25 megapixels, decoded and re-encoded as a metadata-free WebP up to 2000px. Replacement failures retain the previous photo; removal is available. URL: lowercase ASCII letters/digits separated by single hyphens, 3–63 characters; trim and lowercase input, reserve application/demo routes, enforce uniqueness in PostgreSQL. Choose the URL on publication; it remains fixed even after unpublishing. Before publishing require acknowledgement that anyone with the URL can view/copy content. Save edits and photo changes immediately on published sites, clearly labelled. Unpublish hides pages and photos on new requests but cannot retract downloaded copies. Use the existing teal/off-white workspace styling, stacked mobile controls, labelled inputs, pending/error/status feedback, and an explicit Published/Private draft badge. Free publication remains development/testing scope until F007. Public responses contain only guest content; serve pages/photos dynamically without caching or signed asset links. Independent security review required.
**Done when:**

- Owner-managed photo upload/replacement validates type and size; failures are recoverable and files are isolated by wedding. Storage access respects draft/unpublished status.
- Slugs are normalised, reserved routes are denied, concurrent collisions are handled, and slugs are fixed after first publication.
- Authenticated preview uses the same rendering as the guest page. Publishing requires valid required content; only published content is visible anonymously.
- Updates and unpublishing invalidate public caches; public assets follow the publication policy. Unpublishing cannot retract copies visitors already downloaded, and the UI makes no such promise.
- Draft/unknown slugs return a non-revealing 404; no owner or guest-response data leaks through public reads. All wedding pages remain noindex and outside sitemaps.
- Integration and browser tests cover owner edit/publish, anonymous visit, cross-owner denial, and unpublish. Independent review passes.

**Handoff (18 September 2026):**

- Implemented workspace photo upload/replacement/removal, private saved-content preview, unique immutable URLs, visibility acknowledgement, publication, live updates, unpublish and republish. Guest pages reuse Modern Minimal rendering. Migration `20260918000200_publication.sql` keeps owner rows private, exposes only published guest fields, and enforces storage ownership and download-only publication access. Images are decoded/re-encoded with Sharp; routes avoid public caches and signed links. Architecture and running instructions document the boundaries and local Storage upgrade.
- Passed: `npx.cmd supabase migration up --local` (existing data preserved); `npm.cmd run check` (lint, typecheck, 15 unit tests, production build); `npm.cmd run test:integration` (6/6); `npx.cmd playwright test tests/publication.spec.ts` (2/2 direct-host). `docker compose up --build -d --wait` and `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npm.cmd run test:e2e` passed all 18 desktop/mobile checks. Linux `npm ci` passed after restoring an existing optional lockfile entry pruned by Windows npm.
- Production passed: `docker build --target production -t save-the-dates:local .`; `docker run -d --name save-the-dates-f003-smoke --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3001 -p 127.0.0.1:3001:3000 save-the-dates:local`; `npm.cmd run smoke -- http://127.0.0.1:3001`; `$env:E2E_BASE_URL='http://127.0.0.1:3001'; $env:E2E_PRODUCTION='1'; npx.cmd playwright test tests/publication.spec.ts` (2/2, including production no-store headers and post-unpublish 404s). `node scripts/smoke-development.mjs` and `git diff --check` passed. Temporary test users/photos were removed. Development Compose/Supabase remain running; temporary production container stopped/removed.
- Inspected mobile (390×664) and desktop (1440×1000) private/published workspace and public-page screenshots: readable controls, validation, visibility copy, URL wrapping, focus and layout; no horizontal overflow. In-app browser connection failed; repository Playwright supplied browser verification. Independent reviewer `review_f003` passes with no outstanding findings; separate remove-photo form and live publication announcement resolved both minor findings. CI now includes production publication checks; hosted CI, Safari/Firefox and external deployment were not run. Persistence restart verification was not repeated for this slice.
- Blockers: None. Next: Product Manager prepares F004 three-theme selection and preview. No F004 implementation started.

## F004 - Three selectable wedding themes

**Status:** Done
**Purpose:** Give couples the three distinct visual choices in the supplied designs.
**Description:** Extend Modern Minimal with Warm & Romantic and Modern & Bold; provide selection and preview in the workspace.
**Depends on:** F003
**Prepared scope and UX:** Keep Modern Minimal as the default for existing weddings. Add Warm & Romantic (cream, rose, warm photography overlay and serif/script accents) and Modern & Bold (deep teal, full-height photography and left-aligned editorial type). A labelled radio group in the workspace opens a private, full-page preview of saved content using the candidate theme; only Apply theme persists the choice. Explain that applying updates a published site immediately. Back to workspace cancels the candidate. Preserve content, photo, publication and URL. Validate the three theme IDs in the server action and database; expose only the saved theme through the existing published projection. Shared semantic rendering and CSS theme tokens support future Details/RSVP. No motion is needed. Dependencies and design are resolved; prepared as Ready, then taken into engineering.
**References:** `docs/ux/template-ui-summary.md`, `docs/ux/save-the-date-options-design.png`, `docs/overview/site-ui.md`.
**Done when:**

- All three reference directions are recognisable at mobile and desktop widths, with readable text over photography and usable no-photo fallbacks.
- Switching themes preserves all content and the wedding URL; common data and behaviour are shared.
- Selection persists and previews before applying; keyboard access, contrast, long names, image loading/failure, and reduced-motion preferences are checked.
- Subsequent Details and RSVP features can use the same theme tokens/layout conventions without separate business logic per theme. Visual checks and independent feature review are recorded.

**Handoff (18 September 2026):**

- Implemented three shared-data themes in `src/features/weddings/` and `src/app/globals.css`, workspace radio selection, authenticated candidate preview, and explicit Apply theme with server validation and ownership checks. Migration `20260918000300_themes.sql` defaults existing weddings to Modern Minimal, constrains IDs, and adds only the applied theme to the published projection. Architecture, theme guidance and running instructions are current.
- Passed: `npx.cmd supabase migration up --local` (existing data preserved); `npm.cmd run check` (lint, typecheck, 15 unit tests, production build); `npm.cmd run test:integration` (7/7); `npx.cmd playwright test tests/themes.spec.ts` (2/2); `npm.cmd run test:e2e` (20/20). The full browser suite includes the duplicate-key fix; final punctuation cleanup passed `npm.cmd run lint` and the Docker build/typecheck below. `git diff --check` passed.
- Production passed: `docker build --target production -t save-the-dates:local .`; `docker run -d --name save-the-dates-f004-smoke --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3001 -p 127.0.0.1:3001:3000 save-the-dates:local`; `npm.cmd run smoke -- http://127.0.0.1:3001`; `$env:E2E_BASE_URL='http://127.0.0.1:3001'; $env:E2E_PRODUCTION='1'; npx.cmd playwright test tests/themes.spec.ts` (2/2). Temporary users and production container removed; existing development services remain available.
- Visually inspected mobile (390px) and desktop (1440px) screenshots of the picker/focus state and all three themes, including photo, fallback and long-content/image-failure variants. Readable contrasting text, distinct reference directions and no horizontal overflow; reduced-motion browser context exercised without animation. In-app browser connection failed, so repository Playwright supplied inspection screenshots under ignored `test-results/`. Independent reviewer `review_f004` found no Blocking/Important findings; its minor punctuation finding was resolved. Hosted CI, Safari/Firefox, external deployment and persistence restart were not run for this slice.
- Blockers: None. Next: Product Manager prepares F005 Wedding Details editing and guest layouts; no F005 implementation started.

## F005 - Wedding Details

**Status:** Done
**Purpose:** Give guests useful event information without repeated questions to the couple.
**Description:** Optional structured sections for ceremony/reception, timings, travel, accommodation, dress code, and FAQs; no generic drag-and-drop page builder. UX defines editing and guest layouts before Ready.
**Depends on:** F004
**References:** `docs/overview/product-overview.md`, `docs/ux/template-ui-summary.md`.
**Prepared scope and UX:** Add a focused Details editor below the existing workspace controls. Details are private by default and have one explicit “Show Details page” switch; enabling requires at least one non-empty section. Ceremony and reception each accept an optional time, venue, address, and HTTPS/HTTP directions link. Travel, accommodation, and dress code use optional plain-text guidance, with one optional relevant link for travel and accommodation. Owners may add up to five ordered question-and-answer FAQ pairs; incomplete pairs are rejected rather than silently published. Trim all values; limit short fields to 160 characters, guidance/answers to 1,000, questions to 200, and URLs to 2,048. The editor retains submitted values on failure and announces save results. Guest Details uses the applied theme tokens and a simple section stack, omits empty fields/sections, and provides Landing/Details navigation only when Details is enabled. Authenticated preview can open the saved Details page even while unpublished; published access requires both publication and Details enabled. Disabling hides the route and navigation without deleting saved content. No maps, rich text, HTML, arbitrary sections, or RSVP controls are introduced. Required decisions and layouts are resolved, so engineering may proceed.
**Done when:**

- Owners can save and update relevant sections; empty sections are omitted. Text and external URLs are validated safely.
- Published sites expose enabled Details at `/[weddingSlug]/details`, with consistent navigation in all three themes; disabled or unpublished Details are not publicly accessible.
- Preview, publication, noindex, and ownership rules match the landing page. Browser coverage verifies owner edits reaching guests and empty/disabled states; review and responsive inspection are recorded.

**Handoff (18 September 2026):**

- Implemented a bounded owner Details editor, private saved-content preview, enabled/disabled guest route, and landing/Details navigation shared across all three themes. Ceremony, reception, travel, accommodation, dress code, and up to five FAQs omit empty sections. Server and PostgreSQL constraints enforce trimmed limits, complete FAQ pairs, hostful HTTP(S) links, content before enablement, owner isolation, and narrow published projections. Architecture and theme UX guidance are current.
- Passed: all three F005 migrations applied locally without resetting existing data; `npm.cmd run check` (lint, typecheck, 18 unit tests, production build); `npm.cmd run test:integration` (8/8, including anonymous/cross-owner denial and malformed direct writes); `npm.cmd run test:e2e` (22/22 desktop/mobile); `git diff --check`. An earlier full browser run exposed an ambiguous pre-existing checkbox selector, which was fixed, and one transient development-server action-forwarding failure; the theme test then passed 2/2 and the complete rerun passed 22/22.
- Production passed: `docker build --target production -t save-the-dates:local .`; production container on `127.0.0.1:3001`; `npm.cmd run smoke -- http://127.0.0.1:3001`; production `tests/details.spec.ts` (2/2 desktop/mobile). The temporary production container was stopped and removed; existing development services remain available.
- Inspected workspace and all three guest Details themes at mobile and desktop widths: clear hierarchy, readable single/two-column layouts, visible navigation, touch-sized links, and no horizontal overflow. Independent reviewer `review_f005` found no Blocking issues; its Important database-validation mismatch and Minor checkbox error-association findings were resolved with follow-up migrations, adversarial integration cases, and ARIA wiring, then confirmed resolved on re-review. Hosted CI, Safari/Firefox, external deployment, and persistence restart were not run for this slice.
- Blockers: None. Next: Product Manager prepares F006 RSVP identification, correction, field, closing, and abuse-control decisions. No F006 implementation started.

## F006 - Guest RSVP and owner response list

**Status:** Done
**Purpose:** Collect attendance without guest accounts and make responses useful to the couple.
**Description:** A minimal RSVP flow plus private response management. Before Ready, Product Manager and UX must decide open-link versus invitation-token identification, repeat/correction behaviour, fields, closing behaviour, and abuse controls; document the chosen data boundary. Do not silently treat a typed name as verified identity.
**Depends on:** F005
**References:** `docs/overview/product-overview.md`, `docs/overview/architecture.md`, `docs/ux/template-ui-summary.md`.
**Prepared scope and UX:** Use owner-created invitations with a cryptographically random, unguessable token in the guest RSVP URL; a typed guest name is display data, not identity. The owner can add up to 100 invitations, each with a required invite label/name (1–80 characters), copy its private link, and revoke an unused or unwanted invitation. Each invitation represents one response and does not model plus-ones. RSVP has one explicit enable switch and an optional closing date; the route accepts responses through 23:59 UTC on that date, stated beside the control, with server time as authority. Closing manually or by date keeps existing responses visible to the owner and gives guests a clear closed state. Guests submit attending/not attending plus a required responding name (1–80 characters); returning through the same token shows the saved response and permits correction while open. No email, dietary, meal, address, phone, or free-text notes are collected. Tokens are stored only as SHA-256 hashes, never returned by public database reads, and guest access is through a narrow server endpoint with no anonymous list/read/update policy. Apply per-invitation throttling to failed and successful submissions, generic invalid/revoked responses, same-origin form checks, server validation, and database constraints; do not claim this prevents link sharing. The owner workspace shows counts, invitation state, and response rows without exposing tokens after link creation. All themes add RSVP navigation only when enabled and render one short mobile-first form with explicit confirmation, correction, disabled, and closed states. This scope and design are resolved; engineering may proceed.
**Done when:**

- Owners can enable/close RSVP; invited guests can identify themselves under the chosen model and submit attending/not-attending without creating accounts.
- Validation, confirmation, retries, duplicates, corrections, and closed/disabled states behave as specified, with server-side abuse protection.
- Only the correct owner can view responses and attendance totals; guests cannot enumerate other responses or overwrite them without the required authority.
- All themes provide accessible RSVP and navigation. Automated coverage includes submission, retry/correction semantics, owner viewing, anonymous/cross-owner denial, and closed RSVP; independent security review passes.
- Meal choices, plus-ones, custom questions, and guest-list import are excluded unless separately prioritised. Optional sensitive fields are not collected by default.

**Handoff (18 September 2026):**

- Implemented owner RSVP enable/close settings, optional UTC closing date, up to 100 single-response invitations, one-time private link display, revocation, attendance totals, and a private response list. Guests use a 256-bit bearer token, can submit or correct attending/not-attending plus their response name, and see explicit unavailable/closed states across all three themes. Tokens are stored only as SHA-256 hashes; owner tables retain RLS and narrow grants, guest access uses scoped security-definer functions, and a serialized timestamp ledger enforces ten attempts per rolling ten minutes per invitation.
- Passed after all review fixes: all migrations applied without resetting existing data; `npx.cmd supabase db lint --local` (no schema errors); `npm.cmd run check` (lint, typecheck, 21 unit tests, production build); `npm.cmd run test:integration` (11/11, including anonymous/cross-owner denial, correction, closure, revocation, rolling throttling and null-input attempt consumption); `npm.cmd run test:e2e` (24/24 desktop/mobile); `git diff --check`.
- Production passed: `docker build --target production -t save-the-dates:local .`; production container on `127.0.0.1:3001`; `npm.cmd run smoke -- http://127.0.0.1:3001`; production `tests/rsvp.spec.ts` (2/2 desktop/mobile). The temporary production container was stopped and removed; existing development services remain available.
- Inspected owner workspace and guest RSVP screenshots at mobile and desktop widths for Minimal, Romantic, and Bold: clear hierarchy, readable controls, distinct theme treatment, touch-sized choices, and no horizontal overflow. Independent reviewer `review_f006` found no Blocking issues; its Important rolling-throttle/null-input and revoked-attendance findings and Minor accessibility/revocation-feedback findings were resolved and confirmed on re-review. Hosted CI, Safari/Firefox, external deployment, and persistence restart were not run for this slice.
- Blockers: None. The F001-F006 owner-to-guest core and required reviews are complete, so the MVP milestone is confirmed. Next: Product Manager prepares F007 after the owner supplies its consequential pricing, entitlement, lifetime, purchase-timing, and refund/revocation decisions. No F007 implementation started.

## F007 - One-off purchase and publication entitlement

**Status:** Done
**Purpose:** Sell the wedding site with a simple, reliable purchase flow.
**Description:** Stripe hosted checkout and server-controlled entitlement. Develop with test mode first. Free publishing from earlier slices is for development/testing; paid launch must enforce the agreed rule.
**Depends on:** F006
**Decisions before Ready:** Owner-approved price/currency, what the purchase includes, site lifetime, purchase timing, refunds and entitlement revocation. The design board's $29 is a placeholder.
**Approved scope:** One payment of £29 GBP buys one wedding site with all three themes, one photo, Details, and RSVP. Owners may draft and preview without paying, but must purchase before first publication. Entitlement runs until 12 months after the wedding date. A refund or chargeback immediately revokes entitlement and unpublishes the site; the private draft and owner data remain available for a later repurchase. Republishing is allowed while an entitlement is active. Stripe Checkout runs in test mode during development; verified webhook state, never the browser return URL, grants or revokes entitlement.
**References:** `docs/overview/tech-stack.md`, `docs/overview/architecture.md`.
**Done when:**

- The agreed purchase rule is clear in the UI and enforced server-side; cancellation/failure preserves the draft and supports retry.
- Checkout is tied securely to the owner/wedding; verified webhook events control entitlement, with duplicate/out-of-order/retry handling and no trust in the browser return URL.
- Agreed refund/revocation behaviour is implemented and tested. Secrets remain server-side and payment/tenant boundaries receive independent review.
- Test-mode checkout, webhook processing, and publication gating are verified end to end; live activation remains part of release preparation.

**Handoff:** The GBP 29 Stripe-hosted Checkout flow, database-backed single-attempt/idempotency controls, fixed entitlement-expiry snapshot, signature-verified payment/refund/dispute/Checkout-expiration webhooks, server-enforced publication and public-read gates, repurchase behaviour, and private-draft preservation are implemented. Payment records and mutation functions are service-role-only; authenticated checkout functions are owner-scoped. Independent reviewer `review_f007` found no remaining Blocking, Important, or Minor code findings after concurrency, delayed-webhook, latest-revocation, natural-expiry, and privilege fixes.

Verified locally after the final changes: `npx.cmd supabase migration up --local`; `npx.cmd supabase db lint --local` (clean); `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npm.cmd run test:integration` (16/16); `npm.cmd run test:e2e` (26/26 desktop/mobile); `git diff --check`; rebuilt Compose development container plus development smoke and payment/publication browser checks (4/4); production image `save-the-dates:f007` plus smoke and payment/publication browser checks (4/4). The temporary production container was removed; the development container remains available.

On 19 September 2026, the owner confirmed the real Stripe test-mode flow is working as expected, resolving the remaining external Checkout/webhook verification blocker. Blockers: None. Next: Product Manager prepares F008 public marketing and theme examples; no F008 implementation started.

## F008 - Public marketing and theme examples

**Status:** Done
**Purpose:** Explain the product and convert visitors into customers.
**Description:** Modern Luxe homepage, three theme examples, concise explanation/pricing, and working account-entry calls to action. Use UX and SEO roles only for this public surface.
**Depends on:** F007
**Prepared scope and UX:** A single Modern Luxe homepage with deep-teal editorial hero and illustrative phone preview, three theme cards, three setup steps, one-off GBP 29 pricing, concise factual FAQs, and working signup/sign-in links. Public `/examples/[theme]` landing and Details examples reuse guest rendering with explicitly fictional, source-controlled data and a persistent example/return banner; no customer reads or guest submissions. Reuse the licensed landscape photograph as an optimised public asset. Homepage alone opts into indexation; examples and owner/wedding routes remain noindex. Runtime `APP_ORIGIN` supplies canonical, sitemap, and social URLs without assuming a production domain. An original code-rendered social card supports sharing. No testimonials, invented ratings, extra SEO pages, or release activation. Prepared through Product, UX and SEO roles; F007 is Done, so engineering proceeds.
**References:** `docs/overview/site-ui.md`, `docs/ux/site-ui-design.png`, `docs/ux/template-ui-summary.md`.
**Done when:**

- Mobile and desktop marketing match the supplied direction and lead to real product flows. Public examples use fictional demo data, never customer records.
- Pricing and capabilities reflect implemented behaviour; no invented testimonials, ratings, or placeholder purchase promises are published.
- Marketing metadata, canonical URLs, sitemap, semantic structure, and social sharing are verified; wedding/owner routes stay outside indexable surfaces.
- Accessibility, responsive appearance, representative page performance, working CTAs, and independent review are recorded. Extra SEO landing pages/guides wait for demonstrated need.

**Handoff (19 September 2026):**

- Implemented the Modern Luxe homepage with phone illustrations, three theme cards, setup steps, factual GBP 29 pricing and FAQs, working account entry, and fictional landing/Details examples using the shared guest renderers. Added homepage-only indexation, runtime-origin canonical/social metadata, a homepage-only sitemap, robots policy, and a code-rendered social image. Public photography attribution and running/architecture docs are current; CI includes production marketing checks.
- Passed: final `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npm.cmd run test:e2e` (34/34 before the final scoped return-link/breakpoint fixes); `docker build --target production -t save-the-dates:f008 .`; `npm.cmd run smoke -- http://127.0.0.1:3001`; `$env:E2E_BASE_URL='http://127.0.0.1:3001'; $env:E2E_PRODUCTION='1'; npx.cmd playwright test tests/marketing.spec.ts` (8/8 after fixes); `node scripts/smoke-development.mjs`; `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx.cmd playwright test tests/marketing.spec.ts --output=test-results/container-marketing` (8/8 after fixes); `git diff --check`.
- Production checks exposed a duplicated return-link hash and 701px overflow; a native anchor and 760px stacking breakpoint resolved both, with automated coverage at 320/701/760/761/768/1024px plus desktop/mobile profiles. The existing development container initially served stale compiled content; `docker compose restart app` resolved it and all eight marketing checks passed. Temporary production container stopped/removed; development app and Supabase remain running.
- Visually inspected the homepage, pricing, FAQ focus state, social card and all three landing/Details examples at mobile and desktop sizes; readable controls, distinct themes, and no horizontal overflow. Browser skill setup failed in this environment, so repository Playwright supplied screenshots. Local unthrottled production measurements at 320px: LCP 160ms desktop profile / 252ms mobile profile, CLS 0, resource transfer approximately 169KB / 230KB; these are local diagnostics, not field Core Web Vitals. Independent reviewer `review_f008` reviewed source, final fixes and screenshots with no outstanding Blocking or Important findings.
- Blockers: None. Database integration/persistence, hosted CI, Safari/Firefox and external deployment were not rerun for this marketing-only feature. Next: Product Manager prepares F009 deployment, recovery, support and release requirements; no F009 implementation or live activation started.

## F011 - Expressive wedding theme redesign

**Status:** Done
**Purpose:** Replace the flat guest layouts with three polished, distinctive wedding experiences, requested by the owner on 20 September 2026.
**Depends on:** F008
**References:** `docs/ux/savedatemoderndesign.png`, `docs/ux/template-ui-summary.md`.
**Scope:** Redesign Save the Date, Details, and shared RSVP presentation. Modern Minimal follows the reference's immersive photography, large editorial typography, warm paper and botanical accents. Romantic uses an arched photograph, rose/burgundy palette and invitation styling; Bold uses deep teal, citrus accents and an asymmetric editorial composition. Preserve content, publication rules, theme IDs and all existing guest/owner functionality. Refresh fictional-example photography and marketing thumbnails to represent the new themes. No new customer fields or database changes.
**Done when:** All three themes feel distinct at desktop/mobile widths; text remains legible with arbitrary photos, missing/failed images and maximum-length content; keyboard navigation and guest actions remain usable; relevant checks, screenshots and independent review pass. New asset origins/licences are recorded.
**Handoff (21 September 2026):**

- Rebuilt Save the Date, Details and RSVP guest surfaces around shared editorial components and locally bundled Cormorant Garamond. Modern Minimal now uses an immersive photographic cover with a central readability veil; Romantic uses a burgundy invitation and arched photography; Bold uses deep teal, citrus accents and an asymmetric editorial layout. Missing/failed-photo botanical artwork, marketing thumbnails, fictional example photography and source/licence records are included without changing wedding data or behaviour.
- Passed `npm.cmd run check` (lint, typecheck, 22 unit tests, production build), focused `npx.cmd playwright test tests/theme-design.spec.ts tests/themes.spec.ts tests/rsvp.spec.ts` (10/10), full `npm.cmd run test:e2e` (40/40 desktop/mobile), and `git diff --check`. Browser coverage includes all three landing/Details/RSVP themes, keyboard use, maximum-length content, 320-1440px breakpoints, missing/failed images, and extreme black/white photos.
- Visually inspected generated desktop/mobile screenshots for all themes, Details, RSVP and fallback/long-content states: distinct hierarchy, readable arbitrary-photo treatment, usable guest actions and no horizontal overflow. The in-app browser runtime lacked required sandbox metadata, so repository Playwright supplied the rendered inspection artifacts.
- Independent reviewer `Lovelace` found no Blocking issues. Its Important generated-image rights-record finding and Minor generated `next-env.d.ts` churn finding were resolved. Blockers: None. Next: Product Manager prepares F009 launch/release requirements; no deployment or live activation started.

## F012 - Mobile-first Wedding Details refinement

**Status:** Done
**Purpose:** Improve the guest Details page across all three themes, following the owner's mobile reference without copying it.
**Depends on:** F011
**References:** `docs/ux/designs/mobile-friendly-details-design.png`, `docs/ux/template-ui-summary.md`.
**Scope and acceptance:** Replace the cramped card layout with a wide photographic opening, compact editorial introduction, and readable icon-led sections separated by fine rules. Prioritise mobile scanning, 44px link targets, legible text, and restrained decoration. Keep all supplied information visible and omit empty sections; maintain photo fallback, navigation, theme parity, preview/publication and noindex behaviour. Preserve each theme's visual identity and inspect mobile/desktop plus narrow and long-content cases. No new fields or assets are needed. Required checks and independent review must pass before Done.
**Handoff (21 September 2026):**

- Updated `src/features/weddings/wedding-details.tsx` and `wedding.css`: wide photo, compact heading, icon-led rows, larger text, theme-specific surfaces and accessible directions labels. Removed decorative card captions. Shared RSVP appearance is preserved; theme guidance is current. The owner's untracked reference images are preserved.
- Passed `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npx.cmd playwright test tests/theme-design.spec.ts tests/details.spec.ts tests/rsvp.spec.ts tests/marketing.spec.ts` (18/18 mobile/desktop); `git diff --check`. Browser coverage includes 320–1440px widths, photo failures, empty/disabled Details, owner-to-guest updates, noindex and RSVP submission/correction/closure.
- Inspected all themes at mobile and desktop sizes using Playwright screenshots in ignored `test-results/`. Additional `node --input-type=module` Playwright presentation stress checks passed at 320px with long names, 1,000-character paragraphs and unbroken FAQ text. In-app browser connection failed before startup; repository Playwright supplied visual verification. Docker development app refreshed with `docker compose restart app`. Safari/Firefox, hosted CI and deployment were not run.
- Independent reviewer `review_f012` found no Blocking, Important or Minor issues after reviewing the diff, responsive screenshots, fallback and shared RSVP presentation. Blockers: None for F012. Next: resolve F009's existing release inputs; no release work started by this request.

## 21 September review follow-up

Source: [owner review notes](notes/21-09-2026.md). This is the delivery plan for that review, not a second MVP or a rewrite. Existing Done entries retain their historical verification; reported regressions are tracked below. Source inspection informed triage, but the reported failures have **not** been reproduced in a browser during this planning session.

**Sequence and release gate:** Fix reliability first (F013-F015), improve photography (F016-F017), then deliver artwork, RSVP design and marketing polish (F018-F020). F021 is a bounded venue-entry discovery; F022 is an owner business decision. F013-F020 must be Done before F009's final release review, unless the owner explicitly accepts a documented deferral. F021-F022 must have a recorded decision before release; they do not automatically authorise an external integration or changed purchase terms. F009's existing release/access blockers remain in force. Its host-independent preparation may continue where independent, but completing it cannot bypass this review gate.

**Delegation:** Each ID is one assignable ticket. The listed lead owns the handoff; UX and engineering work sequentially when needed. Only F013 is refined to Ready now. Prepare each subsequent Planned ticket when it becomes the next eligible item, resolving its stated design/security questions before implementation. Do not start the whole batch. Required independent reviews follow AGENTS.md. F017 and F018 both affect guest rendering; F018 and F019 share artwork/CSS; F014 and F020 share marketing entry points. Avoid concurrent edits to those shared areas without explicit file ownership.

| Owner observation | Ticket | Priority |
| --- | --- | --- |
| Details checkbox clears on save; corrupt preview separator | F013 | P1 reliability |
| Returning home appears to sign the owner out | F014 | P1 reliability |
| Wrong-looking invitation URL, intimidating token, lost RSVP on navigation, proposed secret routes | F015 | P1 guest access |
| Confusing Upload/Choose controls; no photo visible in editor | F016 | P1 usability |
| Crop/move photo in chosen theme on both landing and Details | F017 | P2 photo editing |
| Replace flowers/leaves with proper SVG assets | F018 | P2 visual quality |
| RSVP redesign and reusable, text-free background imagery | F019 | P2 visual quality |
| Friendlier homepage CTA and better icon/button treatment | F020 | P2 conversion polish |
| Map picker or address finder for venues | F021 | P3 discovery |
| Consider six rather than twelve months after wedding | F022 | Business decision |

All implementation tickets inherit the definition of done: appropriate checks from `run-app-instructions.md`, exact results in their handoff, mobile/desktop inspection for UI changes, and independent review where specified. Paths below are starting points, not instructions to rewrite whole modules.

## F013 - Reliable Details saving and readable preview status

**Status:** Done
**Priority / lead:** P1 / Software Engineer
**Purpose:** Let owners trust the saved Details visibility and preview status.
**Depends on:** F005, F012 (Done)
**References:** `src/features/workspace/details-form.tsx`, `src/features/workspace/details-actions.ts`, `src/features/weddings/details.ts`, `src/app/dashboard/preview/page.tsx`, `tests/details.spec.ts`, `tests/preview.spec.ts`.
**Scope:** Reproduce the reported checkbox reset through the real form/action flow and correct its cause. Correct the malformed separator in the Save the Date preview status; inspect the adjacent Details preview copy for the same defect. No general editor redesign.
**Done when:**

- With valid Details content, checking Show Details page and saving keeps it checked immediately, after reload, and after returning to the workspace. A published entitled site's navigation and Details route agree with the persisted setting.
- Unchecking and saving keeps it disabled after reload, hides public navigation/access and retains the saved private content. Draft preview still works.
- Invalid content, server failure and session expiry preserve entered values and visibility intent with an accurate error; no success message claims unsaved content is live. Repeated saves do not change the intended setting.
- The preview displays `Private preview · saved content` without corrupted characters at mobile and desktop widths.
- Add a regression check exercising the failing save sequence, plus enabled/disabled persistence and failure behaviour. Identify whether the original failure is client state, persistence or both rather than guessing from the report.

**Handoff (21 September 2026):** Reproduced the regression through the real owner form: a validation response caused React's form-action reset to clear the checked control even though the returned submission contained `details_enabled: true`. The Details form now dispatches the action from its submit handler without that native reset, and the action returns a bounded submitted-value snapshot on validation, session, database and connection outcomes. Invalid saves retain the visibility choice and entered content as unsaved; successful saves clear the unsaved state and persist enabled/disabled visibility across reloads. Corrected the corrupted separators in both Save the Date preview status lines.

Passed `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npx.cmd playwright test tests/details.spec.ts` (2/2 desktop/mobile, covering failed-save preservation, successful save, reload, disable, public navigation/route behaviour and preview status copy); focused `npx.cmd vitest run src/features/weddings/details.test.ts` (3/3); `git diff --check`. Inspected the generated Details workspace screenshots at 1440×1000 and iPhone 13 widths: the checked setting, success notice, fields and save/preview controls remain readable with no apparent overflow. The in-app browser could not initialise because its runtime lacked required sandbox metadata, so repository Playwright supplied the functional and visual browser verification. Independent review was not required for this narrow regression fix. Blockers: None. Next: Product Manager prepares F014; no F014 implementation started.

## F014 - Keep owner access clear when returning home

**Status:** Planned
**Priority / lead:** P1 / Software Engineer with UX for homepage account navigation
**Purpose:** Owners can leave the workspace and return without an unnecessary login.
**Depends on:** F002, F008 (Done)
**References:** `src/app/page.tsx`, `src/features/marketing/home.tsx`, `src/proxy.ts`, `src/lib/supabase/server.ts`, `src/features/account/actions.ts`, `tests/account.spec.ts`, `tests/marketing.spec.ts`, `docs/overview/architecture.md`.
**Evidence and scope:** The homepage currently renders unconditional signup/sign-in links and does not inspect authentication. This establishes misleading presentation, not proven cookie loss. First distinguish the two using dashboard -> home -> dashboard and a reload. Keep the marketing homepage available; verified signed-in owners receive a clear return-to-workspace action.
**Done when:**

- A valid signed-in owner sees an appropriate account/workspace action on `/` and can return to their own workspace after navigation/reload without signing in again. Valid refresh behaviour works; actual sign-out and expired/unrefreshable sessions require login.
- Signed-out visitors retain working signup/sign-in actions and indexable marketing content. Loading or unavailable account state never falsely claims a verified session.
- No owner data or personalised auth state leaks through shared caching; server authorisation remains mandatory and one owner's data cannot appear to another browser.
- Account and marketing browser checks cover signed-in, signed-out, refresh and expired-session cases. Independent auth review passes; update the architecture's current statement that the homepage makes no auth calls if implementation changes it.

**Next preparation:** Choose the smallest auth-aware navigation approach while preserving public marketing rendering; reproduce actual session behaviour before changing cookie configuration. No owner decision needed.

## F015 - Preserve private RSVP access across the wedding journey

**Status:** Planned
**Priority / lead:** P1 / Software Engineer with UX; independent security review required
**Purpose:** An invited guest can browse all three pages and return to their own RSVP reliably.
**Depends on:** F006 (Done)
**References:** `src/features/workspace/rsvp-manager.tsx`, `src/features/workspace/rsvp-actions.ts`, `src/features/weddings/rsvp.ts`, `src/features/weddings/wedding-navigation.tsx`, `src/app/[weddingSlug]/`, `tests/rsvp.spec.ts`, `tests/integration/rsvp.test.ts`, `docs/overview/architecture.md`.
**Product direction:** Keep the couple's stable wedding slug and a distinct per-invitation credential. The invitation label identifies the invited guest/household, not the couple's site. Clarify both labels and the copied-link presentation so the difference is obvious. Do not silently rename published sites from invitation labels. Investigate a wrong wedding slug if one differs from that owner's saved slug.

Retain existing unguessable tokens and existing shared links. A six-digit code has only one million combinations; the current per-invitation submission throttle does not by itself protect credential discovery. A single wedding-wide secret would also collapse separate invitation identities. Do not adopt `/654766/couple/...` as the access model. Make sharing friendly through clear link text and copy feedback, without weakening the credential. Guests without an invitation can still read published landing/Details pages, consistent with existing product privacy.
**Done when:**

- Opening an existing private RSVP link, visiting Save the Date and Details, then returning to RSVP retains that invitation through navigation, reload and browser back/forward. Submission and correction still target only that invitation.
- Two invitations for one wedding, two different weddings, and multiple tabs cannot silently overwrite or reuse the wrong invitation context. Explicitly opening a second invitation selects that invitation. A copied private link works in a fresh browser.
- Missing, malformed, revoked and wrong-wedding credentials fail safely; closed RSVP, unpublished weddings and expired entitlements retain their existing restrictions. Public links never grant access to a response.
- Invitation-label copy distinguishes recipient name from wedding URL; copied links use the owner's saved wedding slug. Existing links stay valid without reissuing invitations.
- Context propagation does not leak credentials to outbound directions links, referrers, analytics or logs. New credential-bearing routes/responses are noindex and not shared-cacheable; tokens remain hashed at rest and tenant boundaries remain enforced.
- Integration/browser regression checks cover navigation, invitation separation, old links and revocation. Independent review validates the chosen context design and abuse controls before Done.

**Next preparation:** Document a small context-propagation design in the architecture (including per-tab behaviour, credential lifetime and leakage controls) before Ready. Choose between explicit internal-link propagation and a securely scoped session only after checking these acceptance cases; do not introduce a route migration merely for aesthetics.

## F016 - One photo chooser with an inline saved-photo preview

**Status:** Planned
**Priority / lead:** P1 / UX then Software Engineer
**Purpose:** Choosing a photo feels like one understandable action and owners can see what is saved.
**Depends on:** F003 (Done)
**References:** `src/features/workspace/publication-form.tsx`, `src/features/workspace/publication-actions.ts`, `src/features/workspace/photo.ts`, `src/app/dashboard/photo/route.ts`, `tests/publication.spec.ts`.
**Scope and proposed interaction:** One styled, keyboard-accessible Choose photo / Change photo control opens the native file picker. A valid selection starts upload with explicit progress and live-update wording. Cancelling selection does nothing. Remove the separate empty-file Upload submission. Show the current saved image in the workspace through its authenticated endpoint, with replace/remove and clear pending/error states. Framing controls belong to F017.
**Done when:**

- Clicking the primary photo control opens the picker rather than submitting an empty form. Cancelling causes no error or data change; reselecting the same file works.
- A successful selection shows the saved photo inline; failure retains the previous photo and offers a clear retry. Replacement/removal agree with preview and public content after reload.
- Client feedback and server checks preserve existing format, size, pixel, metadata-stripping and owner/storage restrictions. Rapid selection/retry cannot make an older upload replace a newer accepted choice.
- Accessible mobile/desktop, keyboard, cancel, invalid-file, replace, failure and remove paths are verified. Review the upload/security boundary if changed.

**Next preparation:** Resolve upload state/focus behaviour and preview sizing within the existing workspace. No new asset service or gallery.

## F017 - Position and crop the photo in each page's theme frame

**Status:** Planned
**Priority / lead:** P2 / UX then Software Engineer; independent feature/database review required
**Purpose:** Owners can see and control how their one photo appears on Save the Date and Details.
**Depends on:** F016
**References:** `src/features/weddings/wedding-photo.tsx`, `src/features/weddings/save-the-date.tsx`, `src/features/weddings/wedding-details.tsx`, `src/features/weddings/wedding.ts`, `src/features/weddings/published.ts`, `src/features/workspace/`, `supabase/migrations/`, `tests/theme-design.spec.ts`, `tests/publication.spec.ts`.
**Scope:** Non-destructive positioning and zoom/crop using the existing photo. Provide separate Save the Date and Details frame previews for the selected theme, using the actual rendering geometry and representative mobile/desktop widths. Keep one source photo, not two uploads or an image-editing suite.
**Done when:**

- Owners can drag to position, adjust zoom, reset, cancel and explicitly save framing for each page independently. Keyboard alternatives and touch controls work; no drag-only operation.
- Saved framing survives reload and agrees with authenticated previews and public pages in all three themes at mobile and desktop widths. Preview explains responsive cropping rather than implying all aspect ratios are identical.
- Theme switching preserves intentionally saved framing for that theme; unseen themes and existing weddings have safe defaults. Replacing/removing a photo resets incompatible framing predictably and does not leave stale previews.
- Cancel/failure keeps previously saved framing. Saves on published sites clearly disclose the live update. Arbitrary transforms are validated server-side; new data retains RLS and narrow public projections.
- Portrait/landscape photos, crop limits, no-photo/failed-photo fallbacks, long content and cross-owner denial are covered. Migrations, responsive visual inspection and independent review pass.

**Next preparation:** Define bounded position/zoom values, per-theme/per-page persistence, responsive preview behaviour and upload-to-framing transition. Reuse the shared photo renderer; no hard-coded offsets for individual photos.

## F018 - Reusable botanical SVG artwork for the three themes

**Status:** Planned
**Priority / lead:** P2 / UX then Software Engineer; independent visual feature review
**Purpose:** Replace placeholder-looking flowers/leaves with polished reusable decoration.
**Depends on:** F011 (Done); scheduled after F017 to avoid guest-rendering conflicts
**References:** `src/features/weddings/wedding-art.tsx`, `src/features/weddings/wedding-frame.tsx`, `src/features/weddings/wedding.css`, `docs/ux/template-ui-summary.md`, `docs/ux/designs/rsvp-redesign.png`, `fixtures/README.md`.
**Scope:** Create original, genuine vector SVG botanical assets suited to each existing palette and replace the relevant existing decorative graphics across guest surfaces and examples. Store shared public decoration in `public/assets/wedding/`; record provenance and intended usage in that folder's README. Customer uploads stay in private storage. Raster artwork wrapped in an SVG is not an acceptable SVG deliverable.
**Done when:**

- Flowers/leaves and photo fallback artwork are cohesive, crisp and appropriately composed for Minimal, Romantic and Bold, with an inventory of replaced/reused assets.
- Assets contain no customer/sample names, dates, initials or baked-in UI text. SVGs contain no scripts, external references or embedded tracking; purely decorative images are hidden from assistive technology.
- Compositions remain readable with real/long content and do not obscure navigation or controls. Mobile decoration is intentionally reduced/repositioned. Guest pages and marketing examples stay representative of the same themes.
- Asset origins/usage rights, dimensions and size optimisation are recorded; mobile/desktop and missing-image inspections plus relevant theme checks pass.

**Next preparation:** Agree the small asset inventory/compositions from existing theme direction. F019 may reuse these SVGs and adds its own photographic/texture background where needed.

## F019 - RSVP redesign using the supplied reference

**Status:** Planned
**Priority / lead:** P2 / UX then Software Engineer; independent feature review
**Purpose:** Make the invitation response feel as polished as the rest of the wedding site.
**Depends on:** F015, F018
**References:** `docs/ux/designs/rsvp-redesign.png`, `docs/ux/template-ui-summary.md`, `src/features/weddings/rsvp-page.tsx`, `src/features/weddings/wedding.css`, `tests/rsvp.spec.ts`, `tests/theme-design.spec.ts`.
**Direction from inspected reference:** Spacious editorial RSVP heading, invitation context, a calm bordered form panel, prominent attendance choices, strong submit action, warm paper/floral background and a restrained closing signature. Adapt this to each theme's palette; the reference is particularly Romantic, not a reason to make all themes burgundy. Mobile form usability takes priority over the desktop side decorations.
**Done when:**

- Generate reusable text-free background imagery inspired by the reference and save optimised assets under `public/assets/wedding/`, with provenance/usage records. No names, initials, invitation labels or other user-specific content are baked into generated imagery; render all personalised text and seals dynamically.
- Name and attending/not-attending controls remain semantic, labelled and keyboard-accessible, with visible selected/focus states and comfortable touch targets. No new RSVP questions or collected personal data.
- Success, correction, validation, pending, invalid/revoked, closed and unavailable states receive the same polished treatment; F015 navigation continuity remains covered.
- All three themes pass mobile/desktop and narrow-width inspection with long names, long invitation labels, missing imagery and readable contrast. Assets do not cause layout shifts or unnecessary full-resolution mobile downloads.
- Relevant RSVP/theme checks and independent review pass; update canonical theme guidance to describe the final implemented layout.

**Next preparation:** Define mobile composition, state layouts and asset dimensions before image generation or implementation. Do not use the supplied screenshot as a page background containing UI.

## F020 - Friendlier homepage entry and polished CTA controls

**Status:** Planned
**Priority / lead:** P2 / UX then Software Engineer
**Purpose:** Starting feels approachable and the main actions look deliberate.
**Depends on:** F014
**References:** `src/features/marketing/home.tsx`, `src/features/marketing/marketing.css`, `docs/overview/site-ui.md`, `tests/marketing.spec.ts`.
**Scope:** Replace "Start your site" consistently with proposed copy "Create your save the date", supported by the existing truthful free-draft/preview message. Improve the primary CTA's spacing, icon scale, alignment, contrast, focus and hover treatment within Modern Luxe. Signed-in owners use F014's workspace action.
**Done when:** Hero and pricing actions have consistent welcoming copy, balanced visible icons and at least 44px touch targets; text wraps cleanly on narrow screens; all links lead to the correct real account/workspace flow. Price/lifetime wording remains aligned with the approved product terms. Mobile/desktop, keyboard and marketing checks pass without loss of homepage metadata/indexation.
**Next preparation:** Set final CTA wording and control treatment in the existing platform guidance; no new marketing sections, claims or animation.

## F021 - Decide the smallest useful venue address assistance

**Status:** Planned
**Priority / lead:** P3 / Product Manager with UX; engineering feasibility input
**Purpose:** Make ceremony/reception locations easier to enter accurately without adding an unnecessary maps subsystem.
**Depends on:** F013
**References:** `src/features/workspace/details-form.tsx`, `src/features/weddings/details.ts`, `src/features/weddings/wedding-details.tsx`, `docs/overview/tech-stack.md`.
**Scope:** A bounded discovery/decision ticket, not authority to buy or wire up Google Maps. Compare manual address plus directions-link assistance, address autocomplete, and a map picker against the actual ceremony/reception flow. Prefer the least complex option that solves the observed problem and preserves manual entry.
**Done when:**

- Record a recommendation and its mobile/keyboard journey, manual/failure fallback, address confirmation and handling of venues without a precise match.
- For an external provider, verify current pricing/quotas, key restrictions, attribution/licensing, data sent to the provider and account/access requirements from primary documentation. Separate known facts from estimates; obtain a business decision only where cost/data exposure warrants it.
- Either create one narrowly scoped implementation ticket with testable acceptance and explicit dependencies, or record why the existing manual flow remains sufficient and defer the integration. F021 completion means a decision, not a shipped picker.

**Next preparation:** Review the current entry flow and compare options. Owner's mention of Google Maps is a suggestion, not provider selection. This optional enhancement does not block F013-F020.

## F022 - Confirm the post-wedding publication lifetime

**Status:** Planned
**Priority / lead:** Business decision / Product Manager and owner
**Purpose:** Resolve the six-month suggestion without accidentally changing purchased terms.
**Depends on:** F007 (Done)
**References:** `docs/release-inputs.md`, `docs/overview/architecture.md` (fixed expiry at checkout), `src/features/payments/`, `supabase/migrations/`, `tests/payments.spec.ts`, `tests/integration/payments.test.ts`.
**Current position:** The approved and implemented term is twelve months after the wedding date captured at checkout. The note asks whether six months is preferable; it does not approve a change. Product recommendation: retain twelve months for launch unless an evidenced cost/support reason and explicit owner decision justify changing it. Publication expiry is separate from deleting private photos, drafts, responses and backups; halving publication time alone does not establish storage savings.
**Done when:**

- Record the owner's explicit six/twelve-month decision in release inputs with the customer wording and rationale. Until then, twelve months remains the implementation baseline; this decision does not hold up unrelated fixes.
- If twelve months is retained, no billing change is needed. If six is selected, create a separate payment-change ticket covering effective date, existing purchases/open checkout attempts, preserved entitlement snapshots, all marketing/checkout/support copy, expiry boundary tests and independent payment review. Do not retroactively shorten existing entitlements as a routine copy edit.
- Link any resulting implementation ticket into the F009 release gate. Data-retention/deletion policy remains an independent F009 input.

**Blocker / next action:** Explicit owner lifetime decision is outstanding. Bring the recommendation to the owner when completing release decisions; no code change authorised by this ticket alone.

## F009 - Launch and operate the service

**Status:** In Progress
**Purpose:** Make the implemented product deployable, recoverable, and supportable for real customers.
**Description:** Prepare a container-capable production host and managed production integrations, verify the full journey, and record concise operating instructions. Complete preparatory work before asking for missing release authority.
**Depends on:** F008; F013-F020 completion and F021-F022 decision dispositions before final release review (see review gate above)
**Prepared scope:** Proceed with host-independent production-container verification and a focused operations runbook. Extend production CI to exercise existing account/recovery, payment, theme, publication, Details and RSVP checks. Prepare runtime configuration, migration/rollback, recovery, support and SEO launch steps. Hosting selection, external provisioning, live billing and policy-dependent export/deletion remain blocked on owner decisions; do not invent retention periods or publish policies. No additional product feature or hosting purchase is authorised by this preparation.
**References:** `docs/operations.md`, `run-app-instructions.md`, `.github/workflows/ci.yml`.
**Decisions/access before release:** Production accounts/domain, live billing configuration, support contact, owner-approved terms/privacy/retention/deletion policy and site lifetime communication. Record any external review still needed; do not invent assurances.
**Done when:**

- The production application Docker image is deployed and verified on the chosen host with managed Supabase. Reproducible deployment/environment setup, migrations, rollback, backup/restore, monitoring, and incident/support steps are documented and exercised where possible; secrets and environments are separated.
- Data export/deletion and site expiry follow the agreed policy; uploads/RSVP data and backups are accounted for. Production auth email delivery/recovery works; extra notification emails are optional, not a new automatic scope requirement.
- CI and staging checks pass for account creation, setup, purchase, publication, guest Details/RSVP, and owner responses, including security boundaries and failure cases.
- Independent release review and SEO launch checks pass; unresolved blockers are explicit. Actual production release and a smoke check are recorded before this feature is Done.

**Handoff (21 September 2026):**

- Added `docs/operations.md` with runtime configuration, migration/promotion/rollback, SMTP/Stripe setup, monitoring/support, recovery drills and policy-dependent data handling. Added `npm run test:release` and expanded production-container CI from publication/marketing to account recovery, themes, Details, RSVP and payment checks. Running instructions include the exact local production sequence and corrected homepage/sitemap documentation. No application UI, schema or customer-data behaviour changed.
- Passed `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npm.cmd run test:integration` (16/16); `docker build --target production -t save-the-dates:f009 .`; `npm.cmd run smoke -- http://127.0.0.1:3000`; `$env:E2E_BASE_URL='http://127.0.0.1:3000'; $env:E2E_PRODUCTION='1'; npm.cmd run test:release` (22/22 desktop/mobile against production container and local Supabase, with explicit Stripe fixture keys); `git diff --check`. Temporary verification container stopped/removed and existing development app restarted. Generated `next-env.d.ts` build churn restored. Persistence, hosted CI, managed staging/production, external SMTP/Checkout, restore/rollback drills and real-host SEO/performance were not run; local tests do not establish those results.
- Independent reviewer `review_f009_prep` found no Blocking or Important findings within preparation. Its Minor command-example finding was addressed with the full port-3000 PowerShell sequence. Full hosted release review remains outstanding.
- Blockers: owner selection/access for production host/domain and managed Supabase; live billing/release authority; support contact and approved terms/privacy/retention/deletion rules, including payment records and backups. Requested these decisions during this session; none supplied yet. Export/deletion implementation, hosted configuration, recovery objectives/drills and actual release remain unfinished. Next: resolve these inputs, implement the approved data-handling process, configure staging and exercise the hosted journey/recovery before release review and authorised production deployment. F009 remains In Progress; do not start F010. Following the owner review, F013 is the next executable ticket while external release inputs remain blocked; complete the review gate above before final release review.

## F010 - Post-launch extensions

**Status:** Deferred
**Purpose:** Keep possible enhancements visible without expanding the MVP.
**Description:** Shared couple accounts, multiple weddings per account, custom domains, password-protected sites, more themes, galleries, meal choices, plus-ones, custom RSVP questions, imports/exports beyond required data rights, and optional notification emails.
**Depends on:** F009
**Done when:** Customer evidence justifies promoting a specific capability into its own scoped feature; this holding entry does not authorise implementation.
