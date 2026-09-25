# Product backlog

**Current: F009** remains In Progress with external release blockers. **Launch follows the [launch plan](launch-plan.md)** (owner, 25 September 2026): production is set up locked, using the [production setup prompt](production-setup-prompt.md). Stripe and Google review it, the owner rehearses the full journey on production, and only then is it opened. F001-F008, F011-F032, F034-F037, F040, F042-F046, F056, F057 are Done (F040's staging re-check is carried to F009). The [24 September assessment and delivery order](#24-september-walkthrough-assessment) takes precedence over the historical placement of entries below. **F038 is In Progress and next:** the code is reviewed, and Sentry is now set up (F041 step 6, 25 September 2026), so its staging checks can run. Its checkout check needs **F061**. F061-F064 were raised from the owner's [25 September notes](notes/25-09-2026.md); see the delivery order for where they sit. **F061 is In Progress:** both causes of the staging checkout failure are fixed (the Stripe key was replaced, and migration `20260925000400` is live on staging). The owner completed a real test checkout on staging; only independent review remains. **F062 is In Progress:** browser-side photo resizing is built and passes all automated checks. The owner's staging upload exposed a hosted-Storage photo-read bug, which migration `20260925000500` fixes. It waits for the owner to confirm the photo displays, and for real-device checks. **F063** is Planned and needs an owner choice. **F064 is Done.** **F047 is In Progress:** implementation and local checks are complete; actual messaging-app previews need a reachable staging link. **F055 (Google sign-in) is wanted at launch** (owner, 25 September 2026). It works on staging, and its production client and provider are part of the production setup. The owner approved the legal text on 25 September 2026. The owner deferred F048 (customer data), F054 (security review), F049 (real devices) and the support mailbox to later. F033 is Ready but follows launch work, and F039 is optional. F048-F050 are assessed tickets, not implemented fixes. F051-F053 are report-only growth tickets (SEO audit, advertising strategy, homepage review) that don't gate launch. **F051 is In Progress:** the [SEO audit report](reports/2026-09-25-seo-audit.md) is written and triaged, and only the owner's keyword-volume input remains. The owner chose the domain `savethedates.co.uk` and asked for the SEO and speed work, which is delivered in **F058 and F059 (Done)**. F054 (full security review) is a paid-launch gate.

## Status and handoff rules

### F027 - Sectioned couple dashboard

**Status:** Done (23 September 2026)
**Priority / lead:** P1 / UX/UI Designer then Software Engineer; independent review required (owner data surfaces and routing)
**Purpose:** Replace the single long workspace scroll with a calm, sectioned dashboard so couples can see their site's state at a glance and go straight to the task they need.
**Depends on:** F001-F026 (Done)
**Scope and decision:** Reference: `docs/ux/designs/dashboard-redesign.png` (composition only). Each section is its own URL under a shared workspace shell: Overview `/dashboard`, Basics, Design (theme and photo), Details, RSVP (settings and shared link), Guests (responses, corrections, legacy invitations) and Publish (preview, purchase, URL, publish/unpublish). Desktop uses a left sidebar; below 1024px a sticky, horizontally scrolling section bar. Overview shows only derived real data: site status, RSVP responses with attending/declined split, countdown, a setup checklist linking to each section, quick actions and latest responses. New accounts see the Basics form first, with no section navigation until a wedding exists. Every existing capability, message and security boundary is retained; no new stored data. Checkout returns to Publish.
**Done when:** Every section loads directly and via navigation with server-side ownership checks; all prior workspace actions work and refresh the shell; overview figures are correct for draft, published and response states; no horizontal overflow at 320-1440px; keyboard focus and current-section semantics work; updated E2E suite, `npm run check` and independent review pass.
**Handoff:** Added the `src/app/dashboard/(workspace)` layout, section pages and in-shell `error.tsx`. Shared code lives in `src/features/workspace/`: request-cached owner loader `workspace-data.ts`; unit-tested derived figures `workspace-summary.ts`; nav, icons, page heading, CSS, copy button, `photo-form.tsx` (split from the publication form) and `guest-responses.tsx` (split from the RSVP manager). Sign-out failure now shows inline (`sign-out-button.tsx`) instead of via `?signout=failed`. Workspace actions revalidate `/dashboard` as a layout. Checkout returns to `/dashboard/publish`. Each section sets its own page title. Overview RSVP status reads "opens when published" until the site is live. Decisions are recorded in `docs/overview/site-ui.md` (Sectioned workspace) and `architecture.md`. No schema or data changes.
- `npm.cmd run check` passed: lint, typecheck, 29 unit tests including new `workspace-summary.test.ts`, and production build. `git diff --check` passed; `next-env.d.ts` build churn was restored.
- New `tests/dashboard.spec.ts` covers anonymous and no-wedding redirects, overview figures and cross-tenant exclusion, the checklist, navigation, `aria-current`, titles, reload, and 320/1440px overflow. Seven existing specs were updated for section navigation. `test:release` now includes the dashboard spec.
- With `E2E_BASE_URL=http://127.0.0.1:3000`, the full suite excluding payments passed 45/46. The Details failure was a click-then-reload race in the updated test; after fixing it, `tests/details.spec.ts` passed 2/2. `npx.cmd playwright test tests/payments.spec.ts` passed 2/2 on Playwright's port-3100 server; the dev container uses a Stripe CLI webhook secret that the spec's fixture signatures don't match.
- The dev container missed new files twice (500/404 for all pages). `docker compose down` then `docker compose up -d --wait` fixed it; Supabase data was untouched.
- Inspected Overview (new, draft, live) and every section in screenshots at 390 and 1440px, plus a 320px overflow scan.
- Independent reviewer found no Blocking issues. Its three Important findings (section titles for screen-reader announcements, draft RSVP status, header refresh assertions) and four Minor ones were fixed and re-reviewed clean.
- Not run: production-container browser run, hosted CI, Safari/Firefox, real screen reader, 768-1023px visual pass beyond overflow checks. Blockers: none. Next: resume F009 release inputs.

### F026 - One shared RSVP link per wedding

**Status:** Done (23 September 2026)
**Priority / lead:** P1 / Software Engineer; independent security and database review required
**Purpose:** Let the couple share one reusable private RSVP link with all guests rather than creating a link for each recipient.
**Depends on:** F006, F015 (Done)
**Scope and decision:** A wedding has one owner-readable 256-bit secret and a stable URL `/s/<secret>/<wedding-slug>/rsvp`. Every valid submission inserts a separate name, attendance answer and timestamp; repeated names remain separate because typed names are not verified identities. Shared-link guests cannot read or edit any saved response and are told to contact the couple for corrections. The owner sees named entries and counts, can correct or remove records, copy the same link later, and rotate it to invalidate shared copies. Existing individual invitation links and responses remain functional and visible in a legacy section; new invitation creation is removed from the workspace. Publication, entitlement, RSVP closing, tenant isolation and all three themes continue to apply. The shared secret is owner-only database data, excluded from public projections; private/no-store/no-referrer/noindex apply to secret-bearing routes. Database submission is validated and serialized, with ten accepted attempts per normalised entered name per ten minutes, an emergency ceiling of 1,000 accepted attempts per wedding per ten minutes, and a 5,000-response storage cap per wedding.
**Done when:** Two or more guests can respond independently through the same URL; owner receives separate private records and accurate totals; invalid/wrong-wedding/rotated links, closure and entitlement gates fail safely; no guest can list responses or impersonate a name to edit one; old links still work; preview cannot submit. Desktop/mobile browser checks, local database checks, final project checks, docs and independent review pass.
**Handoff:** Added the shared secret route and form, owner link/correction/removal/rotation controls, owner-only response table, bounded database submission, and legacy link compatibility. Updated marketing, product, architecture and UX copy. Applied migrations `20260923000200`–`00400` locally without resetting existing data. `npm.cmd run check` passed (lint, typecheck, 25 unit tests, production build); focused shared/legacy integration passed 7/7; `npx.cmd playwright test tests/rsvp.spec.ts --output=test-results/shared-rsvp-visual` passed 4/4 desktop/mobile after final UI changes. Before those last controls, `npx.cmd playwright test tests/rsvp.spec.ts tests/rsvp-preview.spec.ts tests/marketing.spec.ts --output=test-results/shared-rsvp-final` passed 12/12. Inspected shared guest pages in all three themes and owner response controls at desktop/mobile widths; 320–1440px browser checks found no overflow. Independent reviewer found owner correction/removal and abuse-bound issues; fixes were re-reviewed with no remaining Blocking or Important findings. No hosted deployment, hosted CI, Safari/Firefox or production-container browser run. A holder of the shared bearer link can submit under another name and could deliberately exhaust the emergency bounds; owners can reconcile or remove entries and rotate the link. Blockers: None. Next: resume F009 release inputs and review; do not publish until its external blockers are resolved.

### Modern & Bold botanical correction — Done (23 September 2026)

Redrew `public/assets/wedding/bold-laurel.svg` as original vector foliage with shaded deep-teal/sage leaves and citrus buds matching the Bold RSVP backdrop. Retained the shared asset path, 240×360 dimensions and decorative accessibility, so the RSVP footer and other Bold placements stay consistent. Asset provenance/palette updated in its README; no application logic changed.

Verification: with `$env:E2E_BASE_URL='http://127.0.0.1:3000'`, `npx.cmd playwright test tests/theme-design.spec.ts tests/rsvp-preview.spec.ts --grep 'bold|owners can preview' --output=test-results/bold-botanical` passed 4/4. Inspected actual RSVP desktop/mobile screenshots; existing theme checks covered decoding, accessibility, 320–1440px layout and image fallback. `git diff --check` passed. In-app browser setup failed on missing sandbox metadata; repository Playwright supplied verification. Full build/unit suite not rerun for this SVG-only correction; independent review not required. No blockers; next remains the existing F024/F009 handoff.

### F025 - Three distinct RSVP designs

**Status:** Done (23 September 2026)
**Purpose:** Complement Romantic RSVP with equally polished Minimal and Bold designs through the existing whole-site theme picker.
**Depends on:** F019 and RSVP preview correction (Done).
**Scope/design:** Preserve Romantic's floral invitation. Minimal uses olive branches, linen, warm paper and a double-rule invitation. Bold uses sculptural foliage, a deep-teal editorial introduction, citrus accents and an offset paper response panel. Create two text-free optimised backdrops; mobile retains lightweight vector botanicals. No separate RSVP theme setting or additional collected fields. Add direct owner previews of the three RSVP designs before applying the site theme.
**Done when:** All three designs work in owner preview and guest invitations, including validation, saved/corrected responses, closed/unavailable states; keyboard focus, long content and 320px/mobile/desktop layouts remain readable; image failures are harmless and phones avoid desktop raster downloads. Relevant checks, visual inspection and independent review pass. Record provenance and theme guidance.
**Handoff:** Implemented the Minimal olive/linen double-rule invitation and Bold teal/foliage split desktop composition in `rsvp-page.tsx` and `wedding.css`, preserving Romantic. Private RSVP preview now switches among three named designs and applies the existing whole-site theme action. New optimised 1440x960 WebPs: Minimal 78,398 bytes; Bold 41,076 bytes. Prompts/provenance in `public/assets/wedding/README.md`; final behaviour in `docs/ux/template-ui-summary.md`.

- Passed `npm.cmd run check` (lint, typecheck, 25 unit tests, production build). With `$env:E2E_BASE_URL='http://127.0.0.1:3000'`, the two `tests/themes.spec.ts` desktop/mobile checks passed in `npx.cmd playwright test tests/rsvp.spec.ts tests/rsvp-preview.spec.ts tests/themes.spec.ts --output=test-results/rsvp-themes-final`; after correcting navigation/submission waits and exercising keyboard focus with Tab, `npx.cmd playwright test tests/rsvp.spec.ts tests/rsvp-preview.spec.ts --output=test-results/rsvp-themes-verified` passed 4/4. Final `npm.cmd run lint` and `git diff --check` passed. Coverage includes preview/apply/reload, private access, response submission/correction in each theme, long content at 320/390/1440px, focus contrast, missing backgrounds, mobile non-download, closure and revocation.
- Inspected all three themes in desktop/mobile screenshots, including long names and invitation labels, fallback, validation/success and closed states. Initial Docker output was stale; the refresh-app workflow (`docker compose down`, `docker compose up -d --wait`, `docker compose ps`) recovered it and `/` returned 200. App remains running; Supabase was not reset. In-app browser connection failed on missing sandbox metadata; repository Playwright supplied browser verification.
- Independent reviewer `review_f025` found no Blocking/Important issues; its Minor README organisation finding was fixed. No schema changes, deployment, hosted CI, Safari/Firefox, production-container browser or database integration/persistence rerun. Blockers: None. Next: resume the existing F024/F009 release handoff; no next feature started.

### RSVP preview correction — Done (23 September 2026)

Fixed the workspace's missing RSVP preview: authenticated preview uses the owner's saved names and candidate theme, connects all three preview pages, and cannot submit responses. A published RSVP URL without an invitation parameter redirects only the verified wedding owner to their live shared RSVP link (changed 2026-09-24 from private preview, at owner request). Newly created invitations have **Open invitation** at the exact token-bearing guest URL; invalid credentials, other owners, and anonymous visits retain existing restrictions.

- Passed `npm.cmd run check` (lint, typecheck, 25 unit tests, production build). With `$env:E2E_BASE_URL='http://127.0.0.1:3000'`, `npx.cmd playwright test tests/rsvp-preview.spec.ts tests/rsvp.spec.ts tests/details.spec.ts tests/themes.spec.ts` passed the six existing desktop/mobile checks; the two new preview checks initially reloaded before navigation finished. After adding a URL assertion before reload, `npx.cmd playwright test tests/rsvp-preview.spec.ts --output=test-results/rsvp-preview-final` passed 2/2. Coverage includes drafts, all themes, saved names, navigation/reload, no preview writes, exact guest URL opening, anonymous/cross-owner/invalid-token denial, submission/correction, closure and revocation. `git diff --check` passed.
- The first browser attempt encountered stale Docker output; recreated only the application stack with `docker compose down`, `docker compose up -d --wait`, `docker compose ps`. The app remains running; `/` returns HTTP 200. In-app browser setup failed on missing sandbox metadata, so repository Playwright supplied browser verification. Inspected all three preview themes at desktop/mobile widths: no overflow or unreadable controls. Independent reviewer `review_rsvp_preview` found no Blocking or Important issues; its Minor link-description finding was corrected.
- Existing invitation tokens remain hash-only and cannot be reconstructed after creation. Reopening/copying old links from the saved list is not implemented; retain the original copied link. No database schema changes, production-container browser run, full integration suite, hosted CI, Safari/Firefox checks or deployment. No blockers for this correction. Next: resume the existing F024/F009 handoff; durable invitation-link retrieval would require a separate storage decision.

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
**Approved scope:** One payment of £29 GBP buys one wedding site with all three themes, one photo, Details, and RSVP. Owners may draft and preview without paying, but must purchase before first publication. By the owner's decision on 23 September 2026, new checkout attempts grant an entitlement through six months after the wedding date. Purchases and checkout attempts created before the six-month change is deployed retain their frozen twelve-month expiry. A refund or chargeback immediately revokes entitlement and unpublishes the site; the private draft and owner data remain available for a later repurchase. Republishing is allowed while an entitlement is active. Stripe Checkout runs in test mode during development; verified webhook state, never the browser return URL, grants or revokes entitlement.
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

**Delegation:** Each ID is one assignable ticket. The listed lead owns the handoff; UX and engineering work sequentially when needed. Prepare each subsequent Planned ticket when it becomes the next eligible item, resolving its stated design/security questions before implementation. Do not start the whole batch. Required independent reviews follow AGENTS.md. F017 and F018 both affect guest rendering; F018 and F019 share artwork/CSS; F014 and F020 share marketing entry points. Avoid concurrent edits to those shared areas without explicit file ownership.

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

**Status:** Done
**Priority / lead:** P1 / Software Engineer with UX for homepage account navigation
**Purpose:** Owners can leave the workspace and return without an unnecessary login.
**Depends on:** F002, F008 (Done)
**References:** `src/app/page.tsx`, `src/features/marketing/home.tsx`, `src/proxy.ts`, `src/lib/supabase/server.ts`, `src/features/account/actions.ts`, `tests/account.spec.ts`, `tests/marketing.spec.ts`, `docs/overview/architecture.md`.
**Evidence and scope:** The homepage currently renders unconditional signup/sign-in links and does not inspect authentication. This establishes misleading presentation, not proven cookie loss. First distinguish the two using dashboard -> home -> dashboard and a reload. Keep the marketing homepage available; verified signed-in owners receive a clear return-to-workspace action.
**Prepared scope and UX:** Keep `/` as the indexable marketing page and render its account actions from a server-verified Supabase user check. Signed-out or unverifiable requests keep Sign in and Start your site; a verified owner sees Your workspace in navigation and Return to your workspace on primary calls to action. Pass only the verified signed-in boolean to the marketing component, never identity or wedding data. Include `/` in session refresh middleware, keep the response private/no-store, and fall back to signed-out presentation if auth is unavailable. No cookie-format, account, dashboard or marketing-content redesign is required. Dependencies and routine UX/security decisions are resolved; prepared as Ready and taken into engineering in this session.
**Done when:**

- A valid signed-in owner sees an appropriate account/workspace action on `/` and can return to their own workspace after navigation/reload without signing in again. Valid refresh behaviour works; actual sign-out and expired/unrefreshable sessions require login.
- Signed-out visitors retain working signup/sign-in actions and indexable marketing content. Loading or unavailable account state never falsely claims a verified session.
- No owner data or personalised auth state leaks through shared caching; server authorisation remains mandatory and one owner's data cannot appear to another browser.
- Account and marketing browser checks cover signed-in, signed-out, refresh and expired-session cases. Independent auth review passes; update the architecture's current statement that the homepage makes no auth calls if implementation changes it.

**Handoff (21 September 2026):** The homepage now verifies the Supabase user on the server and shows Your workspace / Return to your workspace actions only for a valid session; signed-out, forged, expired and unavailable auth states retain the guest actions. `/` participates in session refresh, remains dynamically rendered and returns `private, no-store` in production. Only a boolean reaches the marketing component; no identity or wedding data is loaded. Architecture guidance now records this boundary.

Passed `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npx.cmd playwright test tests/account.spec.ts tests/marketing.spec.ts` (12/12 desktop/mobile); final refresh-token regression run `npx.cmd playwright test tests/account.spec.ts` (4/4 desktop/mobile); `git diff --check`. The browser regression expires only the access-token timestamp, verifies cookie rotation to a future expiry on `/`, reloads and returns to the persisted dashboard; it also covers signed-out and forged/unrefreshable sessions. A production start returned HTTP 200 with `Cache-Control: private, no-store, max-age=0`. Inspected the signed-in homepage at 1440×1000 and iPhone 13 widths: workspace actions are clear, readable and do not overflow. Independent reviewer `review_f014` found one Important missing refresh-token case; the new regression resolved it, and re-review found no remaining Blocking, Important or Minor findings. Blockers: None. Next: Product Manager prepares F015; no F015 implementation started.

## F015 - Preserve private RSVP access across the wedding journey

**Status:** Done
**Priority / lead:** P1 / Software Engineer with UX; independent security review required
**Purpose:** An invited guest can browse all three pages and return to their own RSVP reliably.
**Depends on:** F006 (Done)
**References:** `src/features/workspace/rsvp-manager.tsx`, `src/features/workspace/rsvp-actions.ts`, `src/features/weddings/rsvp.ts`, `src/features/weddings/wedding-navigation.tsx`, `src/app/[weddingSlug]/`, `src/proxy.ts`, `tests/rsvp.spec.ts`, `tests/integration/rsvp.test.ts`, `docs/overview/architecture.md`.
**Product direction:** Keep the couple's stable wedding slug and a distinct per-invitation credential. The invitation label identifies the invited guest/household, not the couple's site. Clarify both labels and the copied-link presentation so the difference is obvious. Do not silently rename published sites from invitation labels. Investigate a wrong wedding slug if one differs from that owner's saved slug.

Retain existing unguessable tokens and existing shared links. A six-digit code has only one million combinations; the current per-invitation submission throttle does not by itself protect credential discovery. A single wedding-wide secret would also collapse separate invitation identities. Do not adopt `/654766/couple/...` as the access model. Make sharing friendly through clear link text and copy feedback, without weakening the credential. Guests without an invitation can still read published landing/Details pages, consistent with existing product privacy.
**Prepared scope and context design:** Keep the existing `?invite=` private-link format and propagate a syntactically valid token only across the wedding's Save the Date, Details and RSVP navigation. Do not use a cookie or browser store: the URL is the per-tab context, so separate tabs cannot overwrite one another and opening a second private link explicitly selects that invitation only in that tab/history entry. Invalid or wrong-wedding tokens confer no response access. The context lasts only while retained in the guest's URL/history or copied private link and remains usable until the existing invitation is revoked or the wedding/RSVP/entitlement becomes unavailable. Credential-bearing pages retain noindex, dynamic/no-store behaviour and the global no-referrer policy; outbound links keep `noreferrer`, no analytics are present, and application code must not log query strings or tokens. Owner copy names the recipient/household separately from the permanent wedding URL. No route migration, new secret, cookie, local storage or database change.
**Done when:**

- Opening an existing private RSVP link, visiting Save the Date and Details, then returning to RSVP retains that invitation through navigation, reload and browser back/forward. Submission and correction still target only that invitation.
- Two invitations for one wedding, two different weddings, and multiple tabs cannot silently overwrite or reuse the wrong invitation context. Explicitly opening a second invitation selects that invitation. A copied private link works in a fresh browser.
- Missing, malformed, revoked and wrong-wedding credentials fail safely; closed RSVP, unpublished weddings and expired entitlements retain their existing restrictions. Public links never grant access to a response.
- Invitation-label copy distinguishes recipient name from wedding URL; copied links use the owner's saved wedding slug. Existing links stay valid without reissuing invitations.
- Context propagation does not leak credentials to outbound directions links, referrers, analytics or logs. New credential-bearing routes/responses are noindex and not shared-cacheable; tokens remain hashed at rest and tenant boundaries remain enforced.
- Integration/browser regression checks cover navigation, invitation separation, old links and revocation. Independent review validates the chosen context design and abuse controls before Done.

**Handoff (22 September 2026):**

- Implemented URL-scoped invitation context across Save the Date, Details and RSVP using a small browser-safe helper. Only one syntactically valid token is propagated; there is no shared cookie/storage state, so tabs remain independent. Invite-bearing responses receive explicit private/no-store, no-referrer and noindex headers. Existing links and database token hashing remain unchanged.
- Clarified Guest or household name versus Wedding URL in the owner workspace. Copy full link now has verified success feedback and a manual-copy error fallback. Browser coverage exercises copied-link content, all three internal routes, reload/back/forward, two invitations/tabs, malformed/public links, external referrer suppression, correction, closure and revocation. Integration coverage proves wrong-wedding read/write denial without response mutation.
- Passed `npm.cmd run check` (lint, typecheck, 23 unit tests, production build); `npm.cmd run test:integration` (16/16); final affected-surface run `npx.cmd playwright test tests/account.spec.ts tests/marketing.spec.ts tests/rsvp.spec.ts` (14/14 desktop/mobile). The full development browser suite passed 40/40 before final review fixes; focused RSVP passed 2/2 afterward. Production verification passed `docker build --target production -t save-the-dates:f015 .`, `npm.cmd run smoke -- http://127.0.0.1:3101`, and RSVP 2/2 with `E2E_PRODUCTION=1`, including explicit private/no-store assertions for landing, Details and RSVP. `git diff --check` passed. Temporary production container was removed.
- Inspected RSVP and owner-workspace screenshots at 1440×1000 and iPhone 13 widths across all three themes: navigation, recipient/URL copy, form hierarchy and long-link wrapping remain readable without overflow. Independent reviewer found three Important issues (client bundle boundary, all-route cache assertions and wrong-wedding write coverage) plus one Minor clipboard path; all were resolved, and re-review found no remaining Blocking, Important or Minor findings. Blockers: None. Next: Product Manager prepares F016's upload state, focus behaviour and inline preview sizing; no F016 implementation started.

## F016 - One photo chooser with an inline saved-photo preview

**Status:** Done
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

**Prepared interaction:** Use a real Choose photo / Change photo button to open a visually hidden native file input. A selection submits immediately; cancellation does nothing. While the server decodes and saves the image, disable photo controls and announce indeterminate progress. Return focus to the chooser on completion so retry and same-file replacement work. Show the authenticated saved image in a compact, uncropped workspace preview; failed replacement keeps that preview. Published copy explains that a successful change updates the live site. Existing server validation, storage ownership and compare-and-swap protection remain the security boundary. No new asset service, gallery or framing controls.

**Handoff (22 September 2026):**

- Replaced the separate file field and Upload submission with one keyboard-accessible Choose photo / Change photo button. File selection now starts the existing server action immediately, announces upload/processing progress, disables conflicting photo controls, resets for same-file retry, and returns focus to the chooser. Cancellation is a no-op.
- Added a compact saved-photo preview backed by the authenticated `/dashboard/photo` endpoint. Successful replacement refreshes the image; failed client/server validation retains it; removal hides it. Published workspaces explain that successful changes are live. Existing decoding, metadata stripping, limits, ownership/storage policies and compare-and-swap logic are unchanged.
- Passed `npm.cmd run check` (lint, typecheck, 23 Vitest tests, production build); `npm.cmd run test:integration` (16/16); `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx.cmd playwright test tests/publication.spec.ts` (2/2 desktop/mobile after the final assertions); and `git diff --check`. The browser test covers keyboard opening and cancel, automatic upload, progress/focus, same-file replacement, retained preview on invalid image, client size rejection, distinct replacement after reload through owner and public endpoints, unpublish and removal.
- Inspected full-page desktop and mobile Chromium captures: the preview remains proportionate, controls and retained-photo error are readable, and there is no horizontal overflow. The in-app browser connection was unavailable, so repository Playwright supplied browser verification. The upload/security boundary did not change, so the conditional independent security review was not required.
- Blockers: None. Next: Product Manager prepares F017 photo positioning and crop persistence; no F017 implementation started.

## F017 - Position and crop the photo in each page's theme frame

**Status:** Done
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

**Prepared interaction:** Store one non-destructive focal point and zoom per theme and page (`x`/`y` percentages from 0–100 and zoom from 1–2). Existing and unseen theme/page combinations resolve to safe defaults matching today’s rendering: centred Save the Date and centre/60% Details. In the photo section, the applied theme is named and Save the Date / Details are edited independently. Each editor shows the same shared photo renderer in representative phone and desktop frames, explains that responsive crops differ, supports direct pointer/touch dragging plus labelled horizontal, vertical and zoom range controls, and provides Reset, Cancel and an explicit Save. A successful save is immediately live when published; a failed save or Cancel keeps the prior persisted framing. Replacing or removing the source photo resets all framing because it no longer describes the same image. Persist a bounded per-theme/per-page structure behind existing wedding ownership/RLS, expose only that structure through the narrow published projections, and reject malformed transforms in both server and database validation. No free rotation, arbitrary CSS, dual uploads or pixel-perfect promise across aspect ratios.

**Handoff (22 September 2026):**

- Added independent Save the Date and Details focal point/zoom controls for the applied theme in the photo workspace. Owners can drag either responsive frame, use labelled keyboard/touch range controls, reset, cancel, and explicitly save. The shared renderer applies the saved crop to private previews and public pages; a replacement/removal resets all framing.
- Added bounded server/database validation, a reset trigger, and narrow public projections for only the applied theme. Framing saves compare the current photo, theme, and JSONB framing state before writing, so a stale request cannot overwrite a replacement or another save. Existing weddings retain safe defaults.
- Passed `npx.cmd supabase migration up --local` (both F017 migrations); final `npm.cmd run check` (lint, typecheck, 25/25 unit tests, production build); `npm.cmd run test:integration` (17/17, including tenant isolation, theme persistence, JSONB compare-and-swap and photo reset); `npm.cmd run test:e2e` (40/40); `npx.cmd playwright test tests/theme-design.spec.ts` (6/6); `npx.cmd playwright test tests/publication.spec.ts tests/details.spec.ts` (4/4 desktop/mobile); and final serial and parallel `npx.cmd playwright test tests/publication.spec.ts` runs (2/2 each, including theme-switch persistence). Two intermediate parallel publication reruns timed out at sign-in after intermittent local workspace load errors; the final serial and parallel runs passed. Mobile/desktop workspace and all three guest themes were visually inspected with no overflow or framing-control readability issue.
- Independent reviewer `review_f017_retry` found no remaining Blocking, Important, or Minor findings after the save race and Details projection consistency fixes. Hosted CI and a Docker production-container browser run were not performed for this slice. Blockers: None. Next: Product Manager and UX prepare F018 botanical SVG artwork; no F018 implementation started.

## F018 - Reusable botanical SVG artwork for the three themes

**Status:** Done
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

**Design:** See `docs/ux/template-ui-summary.md` (F018) for the three compositions and responsive placement; `public/assets/wedding/README.md` records provenance, palettes, dimensions, size optimisation and the replacement/reuse inventory. F019 may reuse these assets.

**Handoff (22 September 2026):**

- Added original olive, rose and laurel-inspired SVGs (240×360; 7,877 bytes combined) in `public/assets/wedding/`. Replaced the inline olive sprig with shared theme-selected `BotanicalArt` across guest footers, Details, RSVP, Romantic announcements and paired photo fallbacks, including previews/full marketing examples. Mobile decoration is reduced and RSVP artwork moves to the upper-right at widths up to 900px. Asset loading/decoding and decorative accessibility are checked by the existing theme design suite.
- Passed final `npm.cmd run check` (lint, typecheck, 25 unit tests, production build); `npx.cmd playwright test tests/theme-design.spec.ts tests/themes.spec.ts tests/rsvp.spec.ts tests/marketing.spec.ts` (18/18 desktop/mobile); after the RSVP placement adjustment, `npx.cmd playwright test tests/rsvp.spec.ts --output=test-results/f018-rsvp-final` (2/2); `git diff --check`. A PowerShell XML element/attribute allowlist and per-file size check passed for all three SVGs; sources contain only vector geometry/colours and no executable, linked or embedded image content.
- Inspected desktop (1440px), iPhone 13 and 320px screenshots across all three themes: loaded/missing/failed photos, long names/messages, Details dividers and RSVP controls remain readable without overflow. Theme design checks also exercise widths 320, 390, 620, 621, 768, 900, 1024 and 1440. In-app browser setup failed because sandbox metadata was unavailable; repository Playwright supplied browser checks/screenshots under ignored `test-results/`.
- Independent reviewer `review_f018` found one Minor mobile Bold RSVP decoration/text overlap; moving the accent resolved it. Final CSS and updated screenshots were re-reviewed with no remaining Blocking, Important or Minor findings. Hosted CI, Safari/Firefox, production-container browser checks and database integration/persistence suites were not run for this visual-only slice.
- Blockers: None. Next: Product Manager and UX prepare F019 RSVP redesign from the supplied reference; no F019 implementation started. F009 external release blockers remain.

## F019 - RSVP redesign using the supplied reference

**Status:** Done
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

**Prepared design:** Keep the invitation context, heading, form and confirmation in one centred reading column. On phones, stack the name field, full-width attendance choices and full-width action within a bordered paper panel; use the existing small theme botanical outside the controls. At desktop widths, give the panel more breathing room and use text-free, theme-coloured background artwork only beyond the reading column. Keep invalid/revoked, closed, success, validation and pending states in the same panel, with the same heading and guest navigation. Use one 1440px-wide decorative WebP on Romantic desktop only, overlaid by a solid panel; phones do not request it. Minimal and Bold use their established colours and vector decoration. Personalised names and labels remain HTML text. See `docs/ux/template-ui-summary.md` for the implemented guidance and `public/assets/wedding/README.md` for asset provenance.

**Handoff (23 September 2026):**

- Rebuilt the guest RSVP hierarchy in `src/features/weddings/rsvp-page.tsx` and `wedding.css`: editorial heading, dynamic invitation context, theme botanical, bordered response panel, prominent radio choices/action, and matching confirmation, validation, closed and unavailable states. The existing private-link flow, server action and collected fields remain unchanged. Added `romantic-rsvp-floral.webp` (1440×960, 56,706 bytes) for Romantic desktop; narrow screens do not request it. Provenance/usage and final theme guidance are in `public/assets/wedding/README.md` and `docs/ux/template-ui-summary.md`.
- Passed `npm.cmd run check` (lint, typecheck, 25 Vitest tests, production build). After refreshing a stale local Docker development app, `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx.cmd playwright test tests/rsvp.spec.ts tests/theme-design.spec.ts` passed 8/8 desktop/mobile checks. The RSVP flow covers navigation continuity, validation, submit/correction, closure and revocation; added long-name/invitation checks at 320, 390 and 1440px, mobile non-download of the desktop image and a failed-image fallback. `git diff --check` passed.
- Inspected desktop and phone screenshots across the three themes, including long content and validation, success, closed and unavailable states. Text, controls and focus remain readable without overflow. Independent reviewer `review_f019` found an Important guest/workspace CSS class collision and a Minor stale artwork-inventory note; both were fixed and re-reviewed with no remaining findings. Hosted CI, Safari/Firefox, production-container browser and database integration/persistence checks were not run for this visual-only feature.
- Blockers: None. Next: Product Manager and UX prepare F020 homepage CTA copy/treatment. F009 external release blockers remain.

## F020 - Friendlier homepage entry and polished CTA controls

**Status:** Done
**Priority / lead:** P2 / UX then Software Engineer
**Purpose:** Starting feels approachable and the main actions look deliberate.
**Depends on:** F014
**References:** `src/features/marketing/home.tsx`, `src/features/marketing/marketing.css`, `docs/overview/site-ui.md`, `tests/marketing.spec.ts`.
**Scope:** Replace "Start your site" consistently with proposed copy "Create your save the date", supported by the existing truthful free-draft/preview message. Improve the primary CTA's spacing, icon scale, alignment, contrast, focus and hover treatment within Modern Luxe. Signed-in owners use F014's workspace action.
**Done when:** Hero and pricing actions have consistent welcoming copy, balanced visible icons and at least 44px touch targets; text wraps cleanly on narrow screens; all links lead to the correct real account/workspace flow. Price/lifetime wording remains aligned with the approved product terms. Mobile/desktop, keyboard and marketing checks pass without loss of homepage metadata/indexation.
**Handoff (23 September 2026):**

- Set the signed-out CTA to “Create your save the date” in the hero, pricing section and fictional example banner. Hero and pricing now share one button component with an aligned 32px arrow tile; mobile actions stack and labels wrap within the button. Verified owners retain “Return to your workspace” and the `/dashboard` destination. Updated `docs/overview/site-ui.md` with the final copy and control guidance.
- Passed `npm.cmd run check` (lint, typecheck, 25 Vitest tests, production build); `npx.cmd playwright test tests/marketing.spec.ts tests/preview.spec.ts` (20/20 desktop/mobile); `npx.cmd playwright test tests/account.spec.ts` (4/4 desktop/mobile, including signed-in homepage navigation); `git diff --check`. Browser checks cover both CTA destinations and touch height, keyboard entry, metadata/indexation, and overflow from 320px through desktop breakpoints. Inspected hero and pricing screenshots at desktop, iPhone 13 and 320px: labels, icon treatment and spacing remain readable without horizontal overflow. Hosted CI and Safari/Firefox were not run for this visual-only update.
- Independent review is not required for this narrow copy and CSS update. Blockers: None. Next: Product Manager prepares F021 venue-entry decision. F009 external release blockers remain.

## F021 - Decide the smallest useful venue address assistance

**Status:** Done
**Priority / lead:** P3 / Product Manager with UX; engineering feasibility input
**Purpose:** Make ceremony/reception locations easier to enter accurately without adding an unnecessary maps subsystem.
**Depends on:** F013
**References:** `src/features/workspace/details-form.tsx`, `src/features/weddings/details.ts`, `src/features/weddings/wedding-details.tsx`, `docs/overview/tech-stack.md`.
**Scope:** A bounded discovery/decision ticket, not authority to buy or wire up Google Maps. Compare manual address plus directions-link assistance, address autocomplete, and a map picker against the actual ceremony/reception flow. Prefer the least complex option that solves the observed problem and preserves manual entry.
**Done when:**

- Record a recommendation and its mobile/keyboard journey, manual/failure fallback, address confirmation and handling of venues without a precise match.
- For an external provider, verify current pricing/quotas, key restrictions, attribution/licensing, data sent to the provider and account/access requirements from primary documentation. Separate known facts from estimates; obtain a business decision only where cost/data exposure warrants it.
- Either create one narrowly scoped implementation ticket with testable acceptance and explicit dependencies, or record why the existing manual flow remains sufficient and defer the integration. F021 completion means a decision, not a shipped picker.

**Decision (23 September 2026):** Retain manual entry and prepare F023 for guidance and checking an owner-supplied directions link. Defer autocomplete and map picking. The current form already stores independent venue/address/URL fields, preserves failed saves, and offers saved preview; its labels give no help with choosing a destination or checking an entrance. This is code-inspection evidence and a UX judgement, not measured user failure data. The mobile/keyboard journey, confirmation and unlisted-venue/failure fallback are canonical in `docs/overview/site-ui.md` under Venue entry decision.

| Option | Fit for the current ceremony/reception flow | Disposition |
| --- | --- | --- |
| Manual address plus directions-link help | Reuses existing fields and validation, supports any venue or map provider, and lets owners check the entrance. Does not automatically verify an address. | Recommended; F023 Ready. |
| Address/place autocomplete | Could reduce typing for listed venues, but selecting a result still needs address/entrance confirmation and a manual fallback. Adds requests while typing, billing and attribution obligations. | Deferred pending evidence of entry problems. |
| Embedded map picker | Could identify an unusual entrance, but adds map interaction, coordinate handling and keyboard alternatives; a shared pin URL already fits the existing directions field. | Deferred; disproportionate to the current need. |

**Provider feasibility snapshot:** Google was evaluated because the owner's note suggested it; no provider selected or account provisioned. Primary documentation checked 23 September 2026:

- [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) open Google Maps across devices without an API key. A future generated search link could use owner-entered venue/address, but it cannot confirm the correct match. F023 simply checks a supplied URL; no API integration or generated search is needed.
- [Global pricing](https://developers.google.com/maps/billing-and-pricing/pricing): monthly free caps are 10,000 events each for Autocomplete Requests, Place Details Essentials, Dynamic Maps and Geocoding. The next tier, through 100,000, costs USD 2.83, 5, 7 and 5 per 1,000 respectively. These are SKU allowances, not a promise of free operation. [Essentials session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing) bills the first 12 autocomplete requests and the terminating Details request; later autocomplete requests in that completed session have no charge. Abandoned sessions remain billed per request. Selected fields can change the SKU. No traffic forecast or cost estimate is asserted.
- [Usage and quotas](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing): billing-enabled Cloud project and credentials are required; Places New rate limits are per method per project, configurable in Cloud Console, and exhausted quotas stop requests. Actual account limits are unknown without access. [Key restrictions](https://developers.google.com/maps/api-security-best-practices) should limit browser keys to approved websites and APIs; server web-service keys need appropriate IP/API restrictions and must remain server-side.
- [Autocomplete request data](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete) includes entered search text and, if supplied, location bias and session token. A browser integration would expose requests to Google while typing; a map picker would also request map content and potentially send selected coordinates for geocoding. This is the integration data-flow assessment, not a claim about Google's retention. Any future integration needs owner agreement on cost and data exposure before provisioning.
- [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) require Google Maps attribution for displayed API content and preserve built-in attribution. Place IDs are exempt from caching restrictions; do not assume all returned address/place content can be stored indefinitely. Applicable terms vary with billing region. [JavaScript policies](https://developers.google.com/maps/documentation/javascript/policies) also require public terms/privacy notices. These constraints need review against the chosen implementation before any future integration; manual owner-entered text and supplied links avoid importing API content.

**Handoff (23 September 2026):**

- Completed the decision and comparison; documented UX in `docs/overview/site-ui.md` and created one bounded implementation ticket, F023. F021 does not ship a picker. F022 and F009 remain blocked as recorded.
- Verified the current form, schema, save action, guest rendering and existing `tests/details.spec.ts` by inspection; checked provider facts against the primary sources above. `git diff --check` passed. Application tests and mobile/desktop UI inspection were not run because this changes documentation only; F023 requires them for its implementation. Independent review is not required for this bounded product decision.
- Blockers: None for F021. F023 implements the selected small enhancement. Defer provider integration unless observed entry problems justify reconsideration. F021's decision disposition satisfies its F009 decision gate; it does not approve release.

## F023 - Help couples enter and check venue directions

**Status:** Done
**Priority / lead:** P3 / Software Engineer
**Purpose:** Make the existing ceremony/reception entry clearer and let owners check directions before saving.
**Depends on:** F013, F021 (Done)
**References:** `docs/overview/site-ui.md` (Venue entry decision), `src/features/workspace/details-form.tsx`, `src/features/weddings/details.ts`, `src/features/workspace/details-actions.ts`, `tests/details.spec.ts`.
**Scope:** Small helper-copy and link-checking update to the existing form. No API, SDK, map, geolocation, schema change, generated directions or automatic address verification. Optional follow-up; not an additional F009 release gate.
**Done when:**

- Both venue groups explain town/postcode where available, checking the guest entrance, and using a map or venue directions URL. Guidance covers unlisted venues through manual address and Travel and transport; all fields remain optional.
- A non-empty URL that passes the existing HTTP(S) validation exposes a ceremony/reception-specific check link opening in a new tab with `noopener noreferrer`. Blank/invalid URLs expose no navigable check link; validation is reused rather than duplicated. No external request or link prefetch occurs before activation; the application never fetches the supplied URL.
- Opening a check link retains unsaved form values and does not submit, mark saved or assert address accuracy. Address and link can be edited or cleared independently. Owner confirmation is expressed through guidance to check before saving and the existing saved preview.
- Help and errors have correct input associations. Check links have visible keyboard focus, descriptive new-tab labels and at least 44px touch targets; 320px/mobile and desktop inspection finds no overflow or confusing ordering.
- `npm.cmd run check`, targeted `npx.cmd playwright test tests/details.spec.ts`, and `git diff --check` pass. Extend the Details journey to cover valid/invalid/cleared check links, new-tab behaviour without contacting a real provider, unsaved-value retention and manual-only save/preview. Check existing publication/privacy behaviour remains intact; record visual evidence.

**Handoff (23 September 2026):**

- Added venue, address and entrance guidance to both Details groups in `src/features/workspace/details-form.tsx`. An owner-supplied HTTP(S) directions URL now exposes a descriptive check link only while valid; it opens in a new tab and does not submit the form. `src/features/weddings/details.ts` shares the server URL schema with the check link. Help and error descriptions remain associated with their inputs; correcting a URL clears its stale error.
- Passed `npm.cmd run check` (lint, typecheck, 25 Vitest tests, production build), `npx.cmd playwright test tests/details.spec.ts` (2/2 desktop/mobile), and `git diff --check`. The browser journey covers invalid/cleared links, no provider request before click, new-tab behaviour with a stubbed destination, retained unsaved content, live save, manual-only address/preview, three themes and disabled guest access. Inspected workspace screenshots at desktop, iPhone 13 and 320px; controls and help wrap without horizontal overflow, and the check link has a 44px target and keyboard focus. No database, schema or external provider change; broader suites, hosted CI and Safari/Firefox were not run for this narrow form update.
- Independent review is not required for this small form update. Blockers: None. Next: F022 owner lifetime decision; F009 external release blockers remain.

## F022 - Confirm the post-wedding publication lifetime

**Status:** Done
**Priority / lead:** Business decision / Product Manager and owner
**Purpose:** Record the owner's decision on publication lifetime and protect existing purchase terms.
**Depends on:** F007 (Done)
**References:** `docs/release-inputs.md`, `docs/overview/architecture.md` (fixed expiry at checkout), `src/features/payments/`, `supabase/migrations/`, `tests/payments.spec.ts`, `tests/integration/payments.test.ts`.
**Decision (23 September 2026):** The owner selected six months after the wedding date, for checkout attempts created after the change is deployed. The date is fixed when checkout begins. Existing purchases and pending checkout attempts retain their stored twelve-month expiry snapshots; no existing customer term is shortened. The £29 one-time price, payment/refund rules and private data handling are unchanged. Publication expiry hides public pages and assets but does not delete private photos, drafts, responses or backups.
**Done when:**

- Record the decision and chosen customer wording in release inputs.
- If six months is selected, implement it in a separate payment-change feature covering effective date, existing purchases/open checkout attempts, preserved entitlement snapshots, all marketing/checkout/support copy, expiry boundary tests and independent payment review. Do not retroactively shorten existing entitlements.
- Link the implementation feature into the F009 release gate. Data-retention/deletion policy remains an independent F009 input.

**Handoff (23 September 2026):** Owner explicitly chose six months. Decision is recorded in `docs/release-inputs.md`; F024 implements the six-month term for new checkout attempts and preserves previous snapshots. The pending legal wording and all other release decisions remain separate F009 inputs.

## F024 - Apply the six-month publication lifetime

**Status:** Done
**Priority / lead:** P2 / Software Engineer; independent payment review required
**Purpose:** Apply the owner's six-month site lifetime decision consistently while honoring existing purchases.
**Depends on:** F007, F022 (Done)
**References:** `docs/overview/architecture.md`, `docs/operations.md`, `docs/release-inputs.md`, `src/features/payments/purchase-panel.tsx`, `src/features/marketing/home.tsx`, `supabase/migrations/20260918001600_checkout_attempts_and_expiry_snapshot.sql`, `supabase/migrations/20260918001800_checkout_completion_reconciliation.sql`, `tests/integration/payments.test.ts`, `tests/payments.spec.ts`.
**Effective date:** Checkout attempts created after this migration and copy are deployed receive an expiry six months after the wedding date frozen at checkout. Existing paid entitlements and already-created attempts preserve their recorded twelve-month snapshots, including webhook completion after deployment. No backfill or retroactive shortening.
**Scope:** Preserve £29 price, payment timing, refunds/revocation, repurchase rules, and private-data retention. Update customer-facing marketing and workspace copy, the server-side entitlement snapshot, relevant tests and operations/architecture/release docs.
**Done when:**

- New attempts expire at wedding date plus six calendar months (UTC midnight following the existing date convention); insufficient time to complete checkout is rejected using the new boundary.
- Existing attempt snapshots are reused unchanged; verified webhook processing preserves a supplied pre-change snapshot. Existing `stripe_payments.expires_at` values remain unchanged by migration.
- Pricing, marketing, purchase, expiry and customer support copy consistently says six months and preserves the existing note that checkout fixes the date. The site-expiry data deletion distinction remains clear.
- Integration and browser tests cover six-month expiry, six-calendar-month end-of-month/leap-year arithmetic, insufficient-checkout boundary, existing attempts and existing entitlements. Independent reviewer passes; resolve Blocking and Important findings.
- `npm.cmd run check`, local migration/lint, `npm.cmd run test:integration`, targeted `npx.cmd playwright test tests/payments.spec.ts tests/marketing.spec.ts`, and `git diff --check` pass. Record anything unavailable; do not change production systems in this feature.

**Handoff (23 September 2026):**

- New checkout attempts now receive six months after the wedding date in UTC, with PostgreSQL calendar-month clamping. Updated the purchase panel, marketing price copy, architecture, operations and release inputs. Existing payment expiry rows are not changed. Existing attempt snapshots are returned before recalculating the current policy, and Stripe webhook completion continues using its signed metadata snapshot.
- Applied `npx.cmd supabase migration up --local`; `npx.cmd supabase db lint --local` reported no schema errors; `npm.cmd run test:integration` passed 19/19 including month-end leap-year, near-cutoff rejection, existing attempt and legacy paid expiry cases; `npm.cmd run check` passed lint, typecheck, 25 unit tests and production build; `npx.cmd playwright test tests/payments.spec.ts tests/marketing.spec.ts` passed 10/10 desktop/mobile. After final purchase-copy clarification, `npx.cmd playwright test tests/payments.spec.ts` passed 2/2. `git diff --check` passed. Inspected marketing and purchase panel at desktop/mobile screenshots. Production deployment and hosted checkout were not run.
- Independent review `review_f024` found no remaining Blocking or Important findings after the required cutoff and legacy-entitlement tests were added. No production system was changed. Blockers: production deployment remains under F009 release gates. Next: F009 release preparation; owner must still provide host/domain, managed Supabase, live billing/release authority, support contact and approved terms/privacy/retention/deletion rules.

## 23 September review follow-up

Source: [owner review notes](notes/23-09-2026.md). Triage is based on reading the source code. None of the reports has been reproduced in a browser during planning.

**Sequence and release gate:** F028 first (bug). Next come the mobile and Guests usability fixes (F029-F030), then the legacy retirement (F031, owner-confirmed). Motion polish (F032) comes after that because it touches the same workspace shell and CSS. F028-F031 must be Done before F009's final release review. F032-F033 do not gate release. F009's existing external blockers still apply.

**Delegation:** Each ID is one ticket; the listed lead owns the handoff. F029, F030 and F032 all change `workspace.css`/the workspace shell, so do them one after another, not at the same time. F033 is docs-only and can be done at any point.

| Owner observation | Ticket | Priority |
| --- | --- | --- |
| Hovering the disabled Send RSVP button in preview shows a loading spinner | F028 | P1 bug |
| Dashboard tab menu at the top is probably not usable on mobile | F029 | P1 usability |
| Guest responses are one endless list; want a clear, paginated, full-width view | F030 | P1 usability |
| "Earlier individual invitations" in Guests looks like a leftover; confirm, then remove | F031 | P2 cleanup (owner confirmed) |
| Page changes feel abrupt; want subtle, fast animation | F032 | P3 polish |
| Add a manually invoked Innovation agent that suggests features | F033 | P3 process |

All implementation tickets follow the definition of done. That means the checks in `run-app-instructions.md`, exact results in the handoff, mobile and desktop inspection for UI changes, and independent review where a ticket requires it.

## F028 - No loading cursor on the disabled preview RSVP button

**Status:** Done (23 September 2026)
**Priority / lead:** P1 / Software Engineer
**Purpose:** In preview, the Send RSVP button should look disabled, not look like it is loading.
**Depends on:** F019, F025 (Done)
**References:** `src/features/weddings/wedding.css:158` (`.rsvp-submit:disabled { opacity: .65; cursor: wait; }`), `src/features/weddings/rsvp-page.tsx:56` (the button is `disabled` both when `pending` and in preview), `tests/rsvp-preview.spec.ts`.
**Cause (from code):** The "spinner" is the browser's `wait` cursor. It is applied to every disabled `.rsvp-submit`, so preview's permanently disabled button looks busy on hover.
**Scope:** Show the busy cursor only while a real submission is pending, for example by marking the pending state with `aria-busy`/a data attribute. The disabled preview button uses `not-allowed`. Keep the "Saving…" label, the disabled behaviour and all three themes as they are.
**Done when:**

- In owner preview, in all three themes, the button is disabled, cannot submit, and its computed cursor is `not-allowed` rather than `wait`/`progress`.
- During a real shared-link submission the button stays disabled and reads "Saving…". The busy cursor is allowed only while pending.
- A regression assertion in `tests/rsvp-preview.spec.ts` checks the preview button's computed cursor. `npm.cmd run check`, targeted `rsvp-preview`/`rsvp` specs and `git diff --check` pass. No independent review needed.

**Handoff (23 September 2026):** `.rsvp-submit:disabled` now uses `cursor: not-allowed`; the submit button sets `aria-busy="true"` only while a real submission is pending, and only `[aria-busy="true"]` uses `cursor: wait`. "Saving…" label, disabled behaviour and all three themes are otherwise unchanged. `tests/rsvp-preview.spec.ts` asserts, per theme, that the hovered preview button is disabled, not busy, with computed cursor `not-allowed`.
- Passed `npm.cmd run check` (lint, typecheck, 29 unit tests, production build); with `$env:E2E_BASE_URL='http://127.0.0.1:3000'`, `npx.cmd playwright test tests/rsvp-preview.spec.ts tests/rsvp.spec.ts --output=test-results/f028` passed 6/6 desktop/mobile (the cursor assertion fails against the old rule, confirming the container served the fix); `git diff --check` passed.
- The pending busy cursor is not asserted in the browser (the pending window is too brief to observe reliably); it follows directly from `aria-busy={pending}`. Cursor-only change, so no separate screenshot inspection beyond the existing per-theme preview captures. Blockers: None. Next: F029 mobile workspace section navigation.

## F029 - Mobile-friendly workspace section navigation

**Status:** Done (23 September 2026)
**Priority / lead:** P1 / UX/UI Designer then Software Engineer
**Purpose:** Couples on a phone can see every workspace section and move between them without hunting through a sideways-scrolling strip.
**Depends on:** F027 (Done)
**References:** `src/features/workspace/workspace-nav.tsx`, `src/features/workspace/workspace.css` (`.ws-nav`, lines 12-21 and 87-93), `src/app/dashboard/(workspace)/layout.tsx`, `docs/overview/site-ui.md` (Sectioned workspace), `tests/dashboard.spec.ts`.
**Current behaviour:** Below 1024px, all seven sections sit in a sticky pill bar that scrolls sideways with its scrollbar hidden. At phone widths most sections are off screen, and nothing shows that the bar scrolls.
**UX decision:**
- **Below 768px:** replace the pill bar with a compact sticky bar. It shows the current section's icon and name next to a "Sections" button (`aria-expanded`/`aria-controls`). The button opens a full-width list of all seven sections with icons, and the current one is marked. The list closes on selection, Escape, a tap outside, or the button, and focus goes back to the button.
- **768-1023px:** show all seven sections in one row without scrolling.
- **1024px and up:** keep the existing sidebar.

This needs no hover, no bottom tab bar (seven items is too many) and no new sections.
**Done when:**

- At 320, 375, 390 and 767px, the current section is visible without scrolling, and every section can be reached in at most two taps with targets of 44px or more. There is no horizontal overflow, and the sticky bar is 64px tall or less.
- At 768 and 1023px, all seven sections are visible in one row with no sideways scroll or clipping. At 1024px and up, the sidebar is unchanged.
- The keyboard works: Tab reaches the toggle, Enter/Space open it, Escape closes it and returns focus. `aria-current="page"` and section titles are kept. The menu closes after client navigation and after back/forward.
- `tests/dashboard.spec.ts` covers the phone menu, the tablet row and focus behaviour. `npm.cmd run check` passes, as do targeted dashboard specs at mobile and desktop. `docs/overview/site-ui.md` is updated. Screenshots are inspected at 320, 390, 768 and 1440px. Independent review is not required (navigation presentation only; routes and authorisation are unchanged).

**Handoff (23 September 2026):** `WorkspaceNav` now renders a phone bar (current section icon/name plus a **Sections** toggle with `aria-expanded`/`aria-controls`) and one section list. Below 768px the list is a full-width overlay that shows only when open. It closes on selection, Escape, a pointer outside the nav, the toggle, and any pathname change (back/forward included). Escape and selection return focus to the toggle. From 768px the list is one flex row with no sideways scroll. The 1024px+ sidebar is unchanged. Routes, `aria-current` and titles are unchanged. Tests use a new `tests/helpers/workspace.ts` (`workspaceLink`/`openWorkspaceSection`, which opens the menu below 768px), and every spec that clicked section links now uses it. `tests/dashboard.spec.ts` adds phone (320/375/390/767), keyboard, outside-tap, selection-focus, back/forward, tablet (768/1023) and desktop (1024/1440) checks. `docs/overview/site-ui.md` updated.
- Passed `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run check` (lint, typecheck, 29 unit tests, production build). With `$env:E2E_BASE_URL='http://127.0.0.1:3000'` (dev container, after `docker compose restart app` because it was serving stale code), `npx.cmd playwright test tests/dashboard.spec.ts tests/account.spec.ts tests/details.spec.ts tests/publication.spec.ts tests/rsvp-preview.spec.ts tests/rsvp.spec.ts tests/themes.spec.ts` gave 21 passed and 1 failed. The failure was `publication.spec.ts` [mobile], a 5s timeout waiting for the photo-saved notice (unrelated to nav). It passed on rerun (`--project=mobile`, 1/1). `payments.spec.ts` cannot pass against the dev container or `.env.local` servers because their `STRIPE_WEBHOOK_SECRET` differs from the test placeholder (webhook 400). It passed on a temporary production container (`docker build --target production -t save-the-dates:f029 .`, run on 127.0.0.1:3001 with the placeholder Stripe values, `E2E_PRODUCTION=1`): `payments.spec.ts` plus `dashboard.spec.ts` 8/8 desktop/mobile. The container was then removed. The managed `npm run test:e2e` server could not start because an unrelated `next dev --port 3200` from this checkout (started 17:40, not by this session) was already running. It was left untouched, and its sign-in page errored, so it was not used. `git diff --check` passed.
- Screenshots inspected at 320 (menu open), 390 (closed and open), 768, 1023, 1024 and 1440px: the current section is visible, the menu is legible with 44px rows, the tablet row fits, and the sidebar is unchanged. Pre-existing and outside scope: at 320px the header's Preview button overlaps the "SaveTheDates" wordmark (the header was not changed by F029). Suggest a small follow-up fix to the header. No independent review required (presentation only). Blockers: None. Next: F030 clear, paginated guest responses.


## F030 - Clear, paginated guest responses

**Status:** Done (23 September 2026)
**Priority / lead:** P1 / UX/UI Designer then Software Engineer; independent review required (owner data queries and URL parameters)
**Purpose:** Couples can quickly see who has replied and find a specific guest, even with hundreds of responses.
**Depends on:** F026, F027 (Done). Schedule after F029 because both change the workspace shell CSS.
**References:** `src/app/dashboard/(workspace)/guests/page.tsx`, `src/features/workspace/guest-responses.tsx`, `src/features/workspace/workspace-data.ts` (`loadResponses` currently selects every row, unbounded), `src/features/workspace/workspace-summary.ts`, `src/app/dashboard/(workspace)/page.tsx` (Overview also loads every row to count them), `docs/overview/site-ui.md`, `tests/dashboard.spec.ts`, `tests/rsvp.spec.ts`.
**Current behaviour:** Guests renders every shared response as a single list, up to the 5,000-per-wedding storage cap. Overview loads the same full set to work out totals and the latest responses.
**UX decision:** The existing Guests section (`/dashboard/guests`) becomes the guest page. Nothing moves to a new route.

- **Layout:** the totals stay at the top. The response area uses the full content width (no narrow reading column).
- **Controls:** a filter (All / Attending / Not attending, showing counts) and a name search. Both are kept in the URL (`?filter=`, `?q=`, `?page=`), so back, reload and bookmarks work.
- **Table:** 25 rows per page, newest first. Columns are Name, Response, Date and an action.
- **Pagination:** Previous/Next plus "Showing 26-50 of 312".
- **Phones:** below 640px, each row stacks as a compact list item with the same information in the same order.
- **Corrections:** Correct/remove opens inline for that row, reusing the existing action.
- **Empty states:** separate messages for "No responses yet", "No matches" and "Page out of range".
- **Overview:** shows totals plus the five latest responses, with a "View all guests" link.

No export, sorting controls, bulk actions or new stored data.
**Done when:**

- With 0, 1, 25, 26 and 312 seeded responses, the pages, counts and "Showing" text are correct. Each page contains 25 rows or fewer. Filter and search combine and reset to page 1. Invalid, negative or out-of-range `page` values and invalid `filter` values fall back safely without errors.
- The server fetches only the requested page, using a range query ordered by `responded_at` with a stable tie-break. Totals come from aggregate/`count` queries, and Overview no longer loads every response. Search input is bounded and escaped (no raw pattern injection). Every query stays scoped to the verified owner's wedding. A cross-owner test shows no leakage through parameters.
- Correcting or removing a response on a later page keeps the current page/filter where possible and updates the totals.
- The table uses semantic headers on wide screens. Stacked phone rows are readable at 320px with long names and have no horizontal overflow. Controls are labelled and keyboard reachable, and pagination links have 44px targets.
- Until F031 is complete, any legacy invitations stay in their existing separate section below the table, and totals continue to include answered legacy invitations.
- Browser checks cover pagination, filter, search, URL state, corrections and cross-tenant isolation. `npm.cmd run check`, relevant integration/E2E specs and `git diff --check` pass. Visual inspection at 320, 390, 1024 and 1440px. Independent review passes with Blocking/Important findings resolved.

**Handoff (23 September 2026):** Guests (`/dashboard/guests`) is now a full-width, paginated table (25 per page, `responded_at desc, id desc`) with filter links showing counts for the current search, a `next/form` name search, Previous/Next with "Showing X–Y of N", and separate empty states for no responses, no matches and page out of range. The filter, search and page live in `?filter=`/`?q=`/`?page=`. Invalid values fall back to All and page 1. Search is limited to 80 characters, `%`, `_` and `\` are escaped, and `*` (a PostgREST wildcard) is dropped (`src/features/workspace/guest-list.ts`). `workspace-data.ts` replaces the unbounded `loadResponses` with count-only queries (`loadResponseTotals`, which still adds answered legacy invitations), `loadLatestResponses(5)` for Overview, and `loadGuestPage`, which range-queries only the requested page and skips the query when the page is out of range. All queries use the verified owner's `wedding.id`. Correct/remove opens inline in a row beneath (client `GuestTable`/`GuestRow`, reusing `manageSharedResponse`), keeps the current URL, and announces success in a status region outside the row. Below 640px the rows stack. Legacy invitations stay in their own section below until F031. Overview shows totals plus the five latest responses and a "View all guests" link. `docs/overview/site-ui.md` updated.
- Passed: `npm.cmd run check` (lint, typecheck, 34 unit tests including the new `guest-list.test.ts`, production build), `npm.cmd run test:integration` (23/23), and `git diff --check`. With `$env:E2E_BASE_URL='http://127.0.0.1:3000'` (dev container, restarted after changes), `npx.cmd playwright test tests/guests.spec.ts tests/rsvp.spec.ts tests/dashboard.spec.ts tests/rsvp-preview.spec.ts` passed 14/14 desktop and mobile after the final change. Earlier runs had flakes: `guests.spec.ts` passed 6/6 with `--repeat-each 3`; one first run after a restart lost a search navigation because the RSC stream stalled; one `dashboard.spec.ts` desktop sign-in did not redirect and passed on rerun; and runs after edits hit stale client code until `docker compose restart app`. The new `tests/guests.spec.ts` seeds 312 and 26 responses plus an empty wedding. It covers the counts, "Showing" text, pages that do not overlap on tied timestamps, the last page and out-of-range pages, bad `page`/`filter` values, filter and search combined with the URL state (reload and back), literal `%`/`_`/`\` and ignored `*`, isolation between owners in both directions, correction and removal on page 2 (URL, totals and the announcement), the Overview latest five, no overflow at 320/390/1024/1440, and pager targets of 44px or more. The managed `npm run test:e2e` and payment/production-container checks were not run (no payment or container change).
- Screenshots were inspected at 320, 390, 1024 and 1440px (after fixing phone-row grid specificity and the name-column width at 1024px). Independent reviewer: pass with minor, no Blocking/Important. Fixed: removal announcement, one fixed toggle label with `aria-expanded`, and legacy-only empty-state wording. Deferred as acceptable: phone rows use `display: block`, which loses table semantics in WebKit (the spec requires semantic headers on wide screens only). Unavailable Previous/Next buttons are hidden from assistive tech. Counts and rows are separate reads, so the "Showing" text can be off by one if a response arrives between them. Blockers: None. Next: F031, retire earlier individual invitations.

## F031 - Retire earlier individual invitations

**Status:** Done (23 September 2026)
**Priority / lead:** P2 / Software Engineer; independent security and database review required
**Purpose:** Remove the leftover pre-F026 invitation model so there is one RSVP route, one response list and less public attack surface.
**Depends on:** F026 (Done); owner confirmation recorded below. Schedule after F030 so there is one Guests implementation to simplify.
**References:** `src/features/workspace/guest-responses.tsx` (legacy section and `RevokeButton`), `src/features/workspace/rsvp-actions.ts` (`createInvitation` has no UI, plus `revokeInvitation` and `submitRsvp`), `src/features/workspace/workspace-data.ts`, `src/features/workspace/workspace-summary.ts` (`collectResponses` merges legacy answers), `src/app/[weddingSlug]/rsvp/page.tsx` and `page.tsx`/`details/page.tsx` (`?invite=`), `src/features/weddings/invitation-context.ts`, `src/features/weddings/published.ts` (`publishedGuestRsvp`), `src/features/weddings/rsvp.ts`, `src/features/weddings/rsvp-page.tsx` (invitation-specific prefill/correction branches), `src/proxy.ts` (`invite` private-header rule), `supabase/migrations/20260918000700_rsvp.sql` to `20260918001200_payment_rsvp_gate.sql`, `tests/rsvp.spec.ts:143-162`, `tests/rsvp-preview.spec.ts`, `tests/integration/rsvp.test.ts`, `docs/overview/site-ui.md`, `docs/ux/template-ui-summary.md`, `docs/overview/architecture.md`.
**Findings:** The owner's reading is confirmed.

- **What the section is:** it lists `rsvp_invitations` rows (label, response and revoked state) and offers Revoke. F026 kept it only so that links already sent would keep working.
- **What still depends on it:**
  - the guest `?invite=` route and journey context, including prefill and correction in `RsvpPage`
  - the `guest_rsvp`, `submit_guest_rsvp`, `record_invalid_rsvp_attempt`, `revoke_rsvp_invitation` and `limit_rsvp_invitations` database functions
  - the `rsvp_attempts` throttle, which is keyed by invitation id
  - legacy answers merged into the Guests and Overview totals
  - the tests listed above
- **What does not depend on it:** the shared-link path uses its own table, functions and attempts table. Only `invitationTokenPattern`/`invitationTokenSchema` are shared with it, and they must be kept.
- **Dead code:** `createInvitation` is no longer reachable from any UI.
- **Release status:** the service has not been released (F009: no hosted deployment). Legacy invitations should therefore exist only in local, test or development data.

**Recommendation:** Remove completely rather than keep a read-only view:

- Take out the UI, the actions, `?invite=` handling and the invitation-specific RSVP branches.
- Add one forward migration that drops the legacy functions, the `rsvp_invitations` table and the `rsvp_attempts` table. Do not edit existing migrations.
- After removal, an old `?invite=` URL should behave like any link without valid credentials: public pages still work, and RSVP shows the existing "open the private link" state. It must not error or reveal whether a token existed.

**Owner decision (23 September 2026):** Confirmed. No individual invitation links were ever sent to real guests (the app has never been live), and existing legacy invitations and their responses may be permanently deleted. Proceed with full removal.
**Done when:**

- Guests and Overview show no legacy section. Totals and lists come only from shared responses. No code, types or tests still reference `rsvp_invitations`/`?invite=`, apart from the drop migration and a regression test.
- Old `?invite=` URLs, whether valid-format, malformed or previously revoked, behave the same as no credential on all three pages. Private/no-store/noindex headers still apply to the shared secret route. Shared-link submission, rotation, correction, removal, throttling and tenant isolation are unchanged.
- The migration applies cleanly to the current local database without a reset, and `npx.cmd supabase db lint --local` passes. Integration tests confirm the legacy functions are gone for anon/authenticated users. Docs no longer describe legacy invitations.
- `npm.cmd run check`, `npm.cmd run test:integration`, the affected RSVP/dashboard/preview specs and `git diff --check` pass. Independent security/database review passes.

**Handoff (23 September 2026):** Removed the legacy owner section, actions, public query context, guest prefill/correction branches, count merging, types and unused styling. The shared RSVP route and response management remain the only active path. Old `?invite=` URLs now behave as ordinary public links; a verified owner visiting the public RSVP entry still reaches private preview. New migration `20260923000500_retire_individual_rsvp_invitations.sql` drops the six legacy functions and two tables without `CASCADE` or edits to historical migrations. It applied to the existing local database without a reset; `npx.cmd supabase db lint --local` found no schema errors.
- `npm.cmd run check` passed after the final application change: lint, typecheck, 33 unit tests and production build. `npm.cmd run test:integration` passed 21/21, including absent legacy RPCs and tables for anonymous, authenticated and service clients.
- With `E2E_BASE_URL=http://127.0.0.1:3000`, Playwright passed 16/16 across RSVP, preview, dashboard, Guests and Details at desktop/mobile widths. The retired-link regression covers valid-format, malformed and formerly usable token shapes on all three wedding pages. Inspected Guests at 390/1440px, guest RSVP at desktop width and RSVP preview at mobile width; existing browser checks covered overflow at 320-1440px.
- Independent security/database reviewer found no Blocking or Important issues. Its one Minor documentation finding was fixed. `git diff --check` passed. No hosted CI, production-container run, Safari/Firefox or hosted migration was run for F031; F009 tracks those release checks. Blockers: none. Next: F009 release inputs when available; F033 is the next Ready ticket while F032 awaits UX confirmation.

## F034 - Five additional guest themes

**Status:** Done (24 September 2026)
**Priority / lead:** P2 / UX/UI Designer then Software Engineer; independent review required (database constraint change, significant visual feature)
**Purpose:** Give couples more distinct styles (Terracotta, Heather, Alcantara, Countryside, Evening Gold) through the existing whole-site theme picker.
**Depends on:** F004, F017, F019, F025 (Done)
**References:** `docs/ux/designs/themes/theme-list.md` (palettes, swatches, type, graphics), `docs/ux/template-ui-summary.md#additional-themes-f034` (composition spec), `public/assets/wedding/README.md`, `src/features/weddings/wedding-themes.css`.
**Scope:** Owner request of 23 September 2026. Five themes with the same content, pages, states and behaviour as the original three, each with its own hero, Details and RSVP composition, fonts, botanical and desktop RSVP backdrop. Same picker, Apply theme and photo framing; server and database accept only the eight IDs. Existing weddings keep their saved theme. Homepage examples and "three themes" copy updated to eight. No new stored data or theme-specific behaviour.
**Done when:** All eight themes work in preview, Apply theme, published pages and public examples, including RSVP form/success/closed/unavailable states. Text meets WCAG AA in each theme. No overflow from 320 to 1440px. Swatches are distinguishable in the picker. Checks pass and independent review has no outstanding Blocking or Important findings.
**Handoff:** Implemented tokens and CSS-only compositions for all five themes in `wedding-themes.css`, with per-theme self-hosted OFL fonts (`wedding-fonts.ts`, not preloaded). Registry order runs light to dark, with designer-chosen swatches. Migration `20260924000100_additional_themes.sql` extends the theme check and framing validator; the TypeScript framing schema now derives from the registry. There are new homepage phone previews, a 4-column (desktop) / 2-column theme grid, and eight-theme copy. The UX designer agent wrote the spec, and theme tests now loop over every registered theme.
- Passed: `npx.cmd supabase migration up --local` (existing data kept). `npm.cmd run check` passed (lint, typecheck, 33 unit tests, production build). `npm.cmd run test:integration` passed 21/21. With `$env:E2E_BASE_URL='http://127.0.0.1:3000'`, `npx.cmd playwright test tests/theme-design.spec.ts tests/themes.spec.ts tests/marketing.spec.ts tests/details.spec.ts tests/rsvp-preview.spec.ts tests/rsvp.spec.ts --output=test-results/f034-themes` passed 34/34 on desktop and mobile.
- Inspected Save the Date, Details and RSVP for each new theme at 390px and 1440px, failed-photo fallbacks at 320px, the picker at 390px and 1440px (next-button cycling through all eight, direct selection), the Design panel, and the homepage grid at 390, 900 and 1440px. There is no horizontal overflow.
- The development container needed `docker compose restart app` to pick up the new stylesheet and later CSS edits.
- Not run: Safari/Firefox, production container, hosted CI.
- Independent review (first pass): no Blocking findings. Important I1 said the photo-framing editor showed Minimal's shapes for the new themes; fixed with per-theme frame rules in `globals.css` (arch, oval, wide fade), measured in the browser. Minor fixes: Evening Gold's shadow no longer leaks into the editor; the integration theme loop derives from the registry. Important I2 (asset provenance) is deferred as an F009 release blocker. After the fixes: tsc, lint and `npm.cmd run test:integration` 21/21 passed; `npx.cmd playwright test tests/themes.spec.ts tests/publication.spec.ts --output=test-results/f034-review-fixes` passed 4/4; `git diff --check` passed. Re-review found no remaining Blocking or Important findings.
- Deploy the migration before the application. Blockers: None for F034 (asset provenance tracked on F009). Next: resume F009 or prepare F033.

## F035 - Coastal, Riviera, Velvet and Black Tie themes

**Status:** Done (24 September 2026)
**Priority / lead:** P2 / Software Engineer (routine UX decisions resolved in the theme docs); independent review required (database constraint change, significant visual feature)
**Purpose:** Add four more styles to the whole-site theme picker, using the owner-supplied high-fidelity WebP botanicals and RSVP backdrops.
**Depends on:** F034 (Done)
**References:** `docs/ux/designs/themes/theme-list.md`, `docs/ux/template-ui-summary.md#f035-themes-coastal-riviera-velvet-black-tie`, `public/assets/wedding/README.md` (F035 section), `src/features/weddings/wedding-themes.css`.
**Scope:** Owner request of 24 September 2026. The themes work like F034's: the same content, pages, states and behaviour, with their own hero, Details and RSVP composition. Botanicals are the supplied WebPs, not SVGs. Server and database accept exactly the twelve IDs. Homepage previews and copy are updated to twelve. No new stored data.
**Done when:** All twelve themes work in preview, Apply theme, published pages and public examples. Text meets WCAG AA. No overflow from 320 to 1440px. Swatches are distinguishable. Checks pass, and independent review has no outstanding Blocking or Important findings.
**Handoff:** The registry (`themes.ts`, light-to-dark order) and font map reuse existing self-hosted families. Migration `20260924000200_coastal_riviera_velvet_black_tie_themes.sql` extends the theme check and framing validator. Tokens and CSS compositions are appended to `wedding-themes.css`, and framing-editor shapes are in `globals.css`. Homepage phone previews for the four themes come from `scripts/capture-theme-previews.mjs` (list extended). Twelve-theme copy is on the homepage, metadata, share card and purchase panel, and theme card numbers are zero-padded so the grid reads 10–12 rather than 010. `tests/theme-design.spec.ts` now expects the WebP artwork (768×1152) for the new themes.
- Passed: `npx.cmd supabase migration up --local` (existing data kept). `npm.cmd run check` passed (lint, typecheck, 33 unit tests, production build). `npm.cmd run test:integration` passed 21/21; the owner theme loop covers all twelve IDs against the new constraint. With `$env:E2E_BASE_URL='http://127.0.0.1:3000'`, `npx.cmd playwright test tests/theme-design.spec.ts tests/themes.spec.ts tests/marketing.spec.ts tests/details.spec.ts tests/rsvp-preview.spec.ts tests/rsvp.spec.ts tests/publication.spec.ts --output=test-results/f035-themes` passed 44/44 on desktop and mobile (overflow 320–1440px, failed-photo fallbacks, artwork decode).
- Inspected at 390px and 1440px: Save the Date, Details and the owner RSVP preview for each new theme; failed-photo fallbacks at 320px; the homepage theme grid; and the Design panel. The photo boxes were measured in the browser to set the framing shapes. Contrast was computed (see the UX summary).
- The development container needed `docker compose restart app` to pick up the CSS.
- Not run: Safari/Firefox, production container, hosted CI, published-page RSVP success/closed states beyond the existing specs.
- Asset provenance for the supplied WebPs is not recorded; this is added to the F009 release blockers, as for F034. The WebP botanicals are 48–146 KB each (see the README note on optional resized derivatives).
- Independent review found no Blocking or Important findings. Two Minor findings were fixed: the picker-order comment in `themes.ts` was inaccurate, and `tests/integration/publication.test.ts` now saves `black-tie` framing against the database validator. After the fixes, `npm.cmd run test:integration` passed 21/21 and lint and typecheck passed.
- Deferred Minor findings, all shared with or following the F034 approach:
  - Riviera and Velvet photo heights follow the text column, so long messages lengthen the real crop compared with the editor.
  - Tablet (621–900px) crops are not modelled in the editor.
  - The editor does not model Coastal's 18px scalloped mask.
  - WebP weight is noted in the README.
  - The ivory orchid is faint on Black Tie's ivory RSVP card, which is decorative only.
- Deploy the migration before the application. Blockers: none for F035 (asset provenance tracked on F009). Next: resume F009 or prepare F033.

## F036 - Replace the SVG botanicals with supplied WebPs

**Status:** Done (24 September 2026)
**Priority / lead:** P2 / Software Engineer; no independent review required (static asset swap, no data, auth or architecture change)
**Purpose:** Replace the remaining vector botanicals with the owner-supplied high-fidelity transparent WebPs, as F035 already uses.
**Depends on:** F018, F034, F035 (Done)
**Scope:** Owner request of 24 September 2026. Minimal, Romantic, Bold, Terracotta, Heather, Countryside and Evening Gold switch `--botanical-art` to the same-named 768×1152 WebP in `public/assets/wedding/high-fid-graphics/`. The shape stays 2:3, so every placement is unchanged: Save the Date, Details, RSVP, footers, dividers, photo fallbacks, owner previews and `/examples`. All eight `flowers/*.svg` files are deleted. `coastal-grasses.webp` stays an unassigned spare, as its SVG was. Alcantara stays unillustrated.
**Handoff:** URLs changed in `wedding.css` and `wedding-themes.css`. `tests/theme-design.spec.ts` now expects the WebP for every illustrated theme. Asset README (inventory, size notes), `template-ui-summary.md` and `theme-list.md` are updated.
- Passed: `npm.cmd run build`; `npm.cmd run lint`; `npm.cmd run typecheck`; `npm.cmd test` (33/33); `git diff --check`. Against that production build on port 3101, `E2E_BASE_URL=http://127.0.0.1:3101 npx.cmd playwright test tests/theme-design.spec.ts` passed 24/24 on desktop and mobile (artwork decode and dimensions, overflow 320–1440px, failed-photo fallbacks).
- Inspected at 390px and 1440px for the seven changed themes: the footer, Details divider and failed-photo fallback. All were crisp and transparent, including on Evening Gold's navy.
- Not run: visual check of the owner RSVP preview (the local dev server on 3200 was returning 500s from a crashed worker that predates this change, and sign-in did not complete against the standalone build). The RSVP page uses the same `BotanicalArt` component and variable. Also not run: Safari/Firefox, hosted CI.
- Page weight: each guest page now loads one 134–230 KB botanical instead of a 2.5–4.9 KB SVG. Optional resized derivatives are noted in the asset README. Provenance for the replacement WebPs is added to the F009 blockers. Blockers: none. Next: resume F009 or prepare F033.

## F032 - Subtle, fast motion across the site

**Status:** Done (24 September 2026; explicitly selected by owner)
**Priority / lead:** P3 / UX/UI Designer then Software Engineer; independent review of the final visual feature
**Purpose:** Navigating and changing state should feel smooth and calm instead of abrupt, without slowing anything down.
**Depends on:** F029, F030 (Done). UX confirmed against the current workspace menu, guest correction rows, FAQ disclosures and shared twelve-theme renderers; prepared as Ready, then taken into engineering.
**References:** `src/components/site-motion.tsx`, `src/components/motion.css`, `src/app/layout.tsx`, `tests/motion.spec.ts`, `docs/overview/site-ui.md` (Motion). The Next.js View Transitions guide was evaluated; that approach was rejected (see the motion list).
**Confirmed motion list (UX, 24 September):**

- A 180ms opacity reveal (65% to fully opaque) on the live main content when moving between workspace sections, between the three wedding pages, and between marketing and account pages. Workspace and wedding headers/navigation stay fixed. Native View Transition snapshots were evaluated and rejected because named participants suppress hit testing during animation; live content preserves immediate clicks and persistent layouts.
- Fade newly opened F029 section menu, row correction panels and disclosure panels in 140ms. Close immediately so hidden controls leave focus order immediately and layout is never held open for motion.
- A quick fade-in for success and error notices.
- Consistent transitions of 150ms or less on control hover and press.

Excluded: parallax, scroll-triggered effects, animated page-load heroes, animation libraries, and changes to layout timing.
**Done when:**

- Only `opacity`/`transform` are animated. Each animation lasts 250ms or less and never delays interaction or navigation. Content and focus are available immediately, with no layout shift and no animation on first load.
- `prefers-reduced-motion: reduce` turns off all transitions, animations and the page fade everywhere. Browsers without the Web Animations API (`Element.animate`) navigate instantly and work normally.
- All twelve wedding themes use the same motion behaviour. Previews and noindex/private headers are unchanged.
- Browser checks cover reduced-motion (emulated), navigation still working with transitions, and absence of overflow. Visual inspection is done at mobile and desktop widths. `npm.cmd run check` passes, with no significant increase in client bundle size (record before/after). Motion guidance is recorded in `docs/overview/site-ui.md`.

**Handoff (24 September 2026):** `SiteMotion` (root layout, client) fades the live `<main>` from 65% to 100% opacity over 180ms on pathname changes. It is skipped on first load and under reduced motion, cancelled if the preference changes, and does nothing without `Element.animate`. `motion.css` (imported last) holds every motion rule. It gives 140ms fades for new notices, correction panels and FAQ answers, and a 140ms keyframe fade plus 4px drop for the phone section menu. Using a keyframe animation means widening past 767px stops it immediately. It also sets 120ms opacity/transform control transitions with a 1px press offset (no hover lift, which can flicker), and one global reduced-motion rule. Duplicate transitions and per-file reduced-motion rules were removed from `controls.css`/`preview.css`, and control colour changes are now instant. Unused `::view-transition` rules were dropped because nothing starts view transitions. Headers sit outside `<main>`; layouts are not remounted. No data, route or header changes.
- `npm.cmd run check` passed after the final code changes: lint, typecheck, 33 unit tests and production build. `git diff --check` passed.
- After `docker compose restart app`, `E2E_BASE_URL=http://127.0.0.1:3000 npx.cmd playwright test --output=test-results/f032-final-suite` gave 79 passed, 3 failed. Two were `payments.spec.ts`, where the dev container's Stripe CLI webhook secret doesn't match the fixture signatures (as in F027). The other was `guests.spec.ts` [mobile]: a remove request spent 5.6s in server application code (container log) and missed the 5s expectation. `npx.cmd playwright test tests/guests.spec.ts` then passed 2/2.
- The new `tests/motion.spec.ts` passed 12/12 desktop/mobile in that run. It checks for no first-load motion, fade duration/properties, a real click during a paused fade, cancellation on a reduced-motion change, all twelve themes, headers outside `<main>`, reduced and no-`Element.animate` fallbacks, workspace menu/Escape/focus, guest correction reveals, and 320px overflow. The dashboard nav test now waits for the menu reveal before measuring boxes; it passed 16/16 with `--repeat-each=8`.
- Bundle, from production standalone builds of HEAD and of the F032 files: initial JS referenced by `/`, `/account/sign-in`, `/examples/minimal` and its Details page grew by 756 B raw / 239 B gzip each. Across all top-level `static/chunks/*.js`, the build went from 26 files / 1,176,285 B (346,085 gzip) to 27 / 1,191,304 B (349,954 gzip), because Next re-split router runtime into its own chunk.
- Inspected the account, Guests workspace (normal and reduced) and Minimal theme screenshots at 390 and 1440px.
- Independent reviewer: no Blocking or Important findings. All five Minor ones were fixed: hover lift removed, transitions consolidated, reduced-motion test assertions and header checks strengthened, slow-save timeouts, and backlog wording.
- Not run: `payments.spec.ts` on Playwright's port-3100 server, because a leftover `next dev --port 3200` from 23 September (PID 35304) blocks a second dev server in this checkout. Also not run: Safari/Firefox, a real screen reader, the production container and hosted CI.
- Observation, not caused by F032: guest correction/removal server actions occasionally take ~5s in application code (twice in this session, against 0.2-0.4s normally). Product Manager to triage whether to investigate. Blockers: none. Next: F040.

## F033 - Manually invoked Innovation role

**Status:** Ready
**Priority / lead:** P3 / Product Manager
**Purpose:** Give the owner an on-demand way to get grounded new-feature ideas without adding work to the normal delivery flow.
**Depends on:** None
**References:** `AGENTS.md` (Roles and delegation, Default work request), `.agents/product-manager.md`, F010 in this backlog.
**Scope:**

- Create a short `.agents/innovation.md`. It proposes a few small, evidence-backed feature ideas, each with the customer problem, expected value, rough size, risks and privacy impact.
- It suggests ideas; it does not decide or implement. The Product Manager decides whether an idea becomes a backlog entry, normally under F010 or as a new Planned ticket.
- Add the role to the AGENTS.md roles list marked as manual-only.
- Documentation only; no application change.

**Done when:** The role file exists and is concise. AGENTS.md lists it as manual-only. Neither the default work request nor any other role invokes it automatically, and ideas it produces do not change backlog status without Product Manager triage. `git diff --check` passes.

## F037 - Choose the production host

**Status:** Done (24 September 2026)
**Priority / lead:** P1, unblocks F009 provisioning / Product Manager decision; no application change.
**Purpose:** Record the production host so F009 staging, F038 and F039 can proceed.
**Depends on:** None.
**References:** `docs/release-inputs.md` section 1, `docs/operations.md`, `docs/overview/tech-stack.md` (Hosting).
**Recommendation (24 September 2026):**

- Host on a **Render web service in Frankfurt**. CI pushes the existing `production` image to GHCR, and Render deploys it by digest. This meets every host requirement in `release-inputs.md`:
  - HTTPS and secret environment variables;
  - health check on `/`, restarts and zero-downtime deploys;
  - rollback to a retained earlier image digest.
- Create the managed Supabase project in the same region (eu-central-1) so database round trips stay short.
- Run staging and production as separate services.
- **Plans and cost (checked 24 September 2026):**
  - **Render:** Hobby workspace ($0: one member, 2 custom domains, 5 GB bandwidth, then $0.15/GB). Production on a Starter instance, $7/mo (512 MB, 0.5 CPU, always on). Staging on the free instance, which sleeps when idle; that's fine for testing. Render's $25 Pro workspace isn't needed.
  - **Supabase:** production on Pro, $25/mo (daily backups kept 7 days; the project never pauses). Staging on Free.
  - **Monitoring and email:** Sentry, PostHog and Resend all stay on free plans.
  - **Launch total:** about $32/mo, plus the domain and Stripe's per-sale fee.
- **Capacity:** one Starter instance comfortably serves expected guest traffic. The memory risk from photo uploads is handled by F040. Upgrade to Standard ($25/mo, 2 GB) if memory regularly runs above about 70% or the service restarts from running out of memory.

Alternatives considered:

- **Fly.io London** is the fallback if UK-only hosting becomes a requirement. It needs more hands-on operations.
- **Vercel** is rejected: it abandons the Docker image path, and its Hobby plan excludes commercial use.
- **Cloud Run/AWS and a self-managed VPS** add more operations than this service needs.

**Owner decision:** Approved on 24 September 2026: Render in Frankfurt with Supabase in the same region. The owner is based in Northern Ireland and serves UK and Ireland customers. Frankfurt adds only about 20–30 ms of latency for them, and it is in the EU, which UK GDPR recognises as adequate.
**Handoff:** Recorded in `release-inputs.md` sections 1–2 and `tech-stack.md` Hosting; F009 depends on it. `git diff --check` passed. Blockers: none. Next: F040, then F038.
**Done when:** The decision is recorded in `release-inputs.md` section 1 and `tech-stack.md` Hosting; F009 references it; `git diff --check` passes.

## F038 - Error tracking and AI-queryable logs

**Status:** In Progress (code built and reviewed 24 September 2026; Sentry set up for staging and GitHub on 25 September 2026, so the staging checks can now run; the checkout check also needs F061)
**Priority / lead:** P1, release gate for F009 monitoring / Software Engineer. Independent security and privacy review is required: this adds a third-party processor and touches secret-bearing URLs and owner/guest data.
**Purpose:** When something breaks in production, the owner is alerted and can find out what failed, since when and for whom. They can do this by asking Claude through MCP, as well as in dashboards.
**Depends on:** F037 (host). Implementation and local verification can happen before the host exists; hosted alert and retention checks happen on F009 staging.
**References:** `docs/operations.md` (Monitoring; runtime configuration; identical image per environment), `docs/overview/architecture.md`, `next.config.ts` (`output: "standalone"`), `src/app/layout.tsx`, `src/features/weddings/invitation-context.ts` (`?share=`), `node_modules/next/dist/docs/01-app/02-guides/instrumentation.md`. The app currently has no logging, error capture, instrumentation file or CSP.

**Decision (proposed):**

- **Sentry, EU data region, via `@sentry/nextjs`.** It captures:
  - server, Server Action and Route Handler errors through `instrumentation.ts` `onRequestError`;
  - browser errors.
- Events are tagged with the commit (release) and environment. Email alerts go to the incident contact for new, regressed and spiking issues.
- A small structured logger writes JSON to stdout, the host-side fallback. It also forwards warnings, errors and key operational events to Sentry Logs, so logs are queryable next to errors through the Sentry MCP server. The logging standard below defines how it is built and where it is called.
- Supabase's own Postgres/Auth/Storage/API logs stay in Supabase, read through the Supabase MCP server.

**Scope:**

- **Scrubber.** One shared, unit-tested scrubber is applied in Sentry's `beforeSend`, `beforeSendLog` and breadcrumb hooks, and in the logger. It:
  - rewrites `/s/<secret>/…` to `/s/[secret]/…`;
  - removes query strings from all recorded URLs, including request URLs, Referer, and fetch/span breadcrumbs, because Supabase REST filters contain slugs and names. This covers `?share=`, `/dashboard/guests?q=`, and `/auth/confirm` `token_hash`/`type`;
  - drops `Authorization`/`Cookie` headers, Supabase JWTs, request and form bodies, and Server Action payloads;
  - scrubs exception messages, because Postgres errors can echo values.
- **Sentry settings.** `sendDefaultPii: false`; user is the owner UUID only. Console breadcrumbs off. `tracesSampleRate: 0` at launch. No Replay.
- **Runtime configuration.** Keep one image for all environments: no `NEXT_PUBLIC_*` build-time keys. Client configuration comes from a no-store runtime source, for example a small dynamic config script or route. Static pages such as `/examples` must not freeze empty values at build time; a test proves a prebuilt image picks up keys at runtime. Nothing is sent when the configuration is unset (local, CI, tests).
- **Source maps.** Build hidden source maps with debug IDs inside Docker, without a token. CI copies the maps out of the build stage and uploads them with `sentry-cli` using a CI-only `SENTRY_AUTH_TOKEN`. The maps are removed before the final image. Confirm that the pinned SDK version supports this repository's Next.js/Turbopack standalone build.
- **Request ID.** Each request gets an ID that links the log line, the Sentry event and any user-visible error reference.

**Logging standard:** logs must be clean, consistent and easy to follow. Reading one request ID should tell the story of that request.

- **One logger.** A single module, for example `src/lib/logger.ts`, is the only way server code logs. An ESLint `no-console` rule enforces this everywhere except the logger itself.
- **Event names.**
  - Every log line has a stable event name in the form `area.action.outcome`, for example `rsvp.submit.accepted`, `payment.webhook.rejected` or `photo.upload.failed`.
  - Names come from one typed list, so they can't drift, and messages are never free text.
  - The list is documented in `docs/operations.md`.
- **Fields.**
  - Every line carries: timestamp, level, event, request ID, environment, release and route template.
  - Extra fields come from a typed allow-list: `ownerId`, `weddingId`, `stripeEventId`, `eventType`, `reason`, `durationMs` and `count`.
  - Arbitrary objects, form data, names, emails and URLs with query strings can't be passed.
  - Everything goes through the scrubber.
- **Levels.**
  - `error`: needs attention and triggers alerts.
  - `warn`: an expected but notable failure, such as a rejection, a rate limit or a bad webhook signature.
  - `info`: a key business event.
  - `debug`: local only.
- **Output.** Production writes one JSON line per event. Local development prints readable one-line output.
- **Clean call sites.**
  - A small helper, such as `withLogging("area.action", fn)`, wraps each Server Action and Route Handler. It records the outcome, the duration and any unexpected error once.
  - Action code only adds a line at meaningful decision points, such as `reason: "rsvp_closed"`.
  - Each failure is logged once, where it is handled. No log-and-rethrow chains and no duplicate lines.
  - Unexpected errors reach Sentry through `onRequestError` and the existing `error.tsx` boundaries.
- **Where to log.** Required events at each place:

  | Area | Where | Events |
  | --- | --- | --- |
  | Account | `src/features/account/actions.ts`, `src/app/auth/confirm/route.ts` | signup requested; email confirmed; confirm link invalid or expired; sign-in failed (reason only, never the email); recovery requested; sign-out failed |
  | Workspace | `src/features/workspace/actions.ts`, `details-actions.ts`, `theme-action.ts`, `photo-framing-action.ts` | save succeeded or failed per section; ownership check denied |
  | Photos | `src/features/workspace/publication-actions.ts`; `src/app/[weddingSlug]/photo`, `src/app/dashboard/photo` and `src/app/preview-photo` route handlers | upload accepted, or rejected with a reason (size, type, pixels, busy per F040); processing duration; storage upload or read failure |
  | Publication | `src/features/workspace/publication-actions.ts` | published; unpublished; publish blocked with no entitlement |
  | Payments | `src/features/payments/payment-actions.ts`, `src/app/api/stripe/webhook/route.ts` | checkout created, reused or conflicted; Stripe API failure; webhook received (type and ID); signature rejected; duplicate ignored; entitlement granted or revoked (refund, dispute); processing failure |
  | RSVP | `src/features/workspace/rsvp-actions.ts`, the `/s/[secret]/…` routes | submission accepted, or rejected with a reason (closed, rate limited, capacity, invalid link); shared link rotated; owner correction or removal |

  New server features follow the same pattern. The event list and the "Where to log" table are kept up to date with the code.
- **Documentation.** Document the new optional runtime variables in `run-app-instructions.md` and `operations.md`, for example `SENTRY_DSN`, `SENTRY_ENVIRONMENT` and `APP_RELEASE`. Add a "Monitoring and AI-assisted investigation" runbook to `operations.md`:
  - alert routing and least-privilege, read-only MCP setup for Sentry and Supabase;
  - example investigation prompts and correlation by request ID;
  - a rule that production data seen through MCP stays within the investigation.
- **Approvals.** Record Sentry in `tech-stack.md`/`architecture.md` as an approved vendor SDK. The privacy notice (an F009 blocker) lists Sentry as an EU processor and states log retention. Confirm the vendor's DPA and international transfer terms are in place.
- **Deferred:** tracing/OpenTelemetry, session replay, third-party uptime probes beyond the host health check.

**Owner decisions (24 September 2026):** Sentry EU account on the free plan, owned by the owner; alert email `rmeikle55@gmail.com`; log retention 30 days.
**Done when:**

- With a staging Sentry project, each of the following appears with release, environment, request ID and scrubbed data:
  - a deliberately thrown Server Action error;
  - a browser error with a resolved source map;
  - a rejected Stripe webhook log.
- Unit tests cover the scrubber for `/s/<secret>`, `?share=`, `?q=`, `/auth/confirm`, headers, bodies and messages containing values.
- Logging:
  - every event in the "Where to log" table is emitted at its call site;
  - unit tests cover the logger (field allow-list, levels, JSON shape) and `withLogging` (logs once on success and failure, no duplicates);
  - `npm.cmd run lint` passes with the `no-console` rule;
  - a local walkthrough of one guest RSVP and one test checkout shows a readable request-ID trail from start to finish.
- A Playwright journey intercepts outgoing Sentry payloads and asserts they contain no secrets or form values. The journey covers the shared-link RSVP with `?share=`, auth confirmation and the checkout return. With configuration unset, no third-party requests are made.
- The runtime-config test passes against the production image.
- `npm.cmd run check` passes, and client bundle size before and after is recorded.
- The runbook exists. These three MCP queries work against staging:
  - "latest unresolved Sentry issues in production";
  - "logs for request ID X";
  - "Supabase auth errors in the last hour".
- Independent review passes. Alert delivery and retention on the real host are verified in F009 staging.

**Handoff (24 September 2026):**

- **Built:**
  - `@sentry/nextjs` 10.75.3, EU, without `withSentryConfig`. `src/instrumentation.ts` and `src/instrumentation-client.ts` start it only when `SENTRY_DSN` is set; the browser reads its config from the no-store `/api/runtime-config` and has no `NEXT_PUBLIC_*` keys.
  - One scrubber (`src/lib/monitoring/scrub.ts`) and one logger (`src/lib/logger.ts`: typed events, field allow-list, `withLogging`). ESLint `no-console` enforces the single logger.
  - `src/proxy.ts` gives every request except `/_next/static` and `/_next/image` a fresh `X-Request-Id`, never taken from the client. Error pages show a reference that links to it.
  - Every "Where to log" event is logged at its call site.
  - Browser DOM/click breadcrumbs and session tracking are off, and no trace headers are added to outgoing requests.
  - Hidden source maps are built in Docker and exported from a `sourcemaps` stage. CI uploads them with `sentry-cli` only when `SENTRY_AUTH_TOKEN` exists. The final image has no maps.
  - The runbook and runtime variables are in `operations.md` and `run-app-instructions.md`. Sentry is recorded in `tech-stack.md` and `architecture.md`.
- **Checks (engineer, after review fixes):**
  - `npm run check`: passed (lint, typecheck, 64 unit tests, build).
  - `npm run test:integration`: 21 passed (before the review fixes, which didn't touch integration code).
  - `npx playwright test`: 84 passed.
  - `npm run test:monitoring`: 2 passed in dev and 2 passed against the rebuilt production image with a fake DSN (the runtime-config test).
  - `E2E_PRODUCTION=1 npm run test:release` against the image: 30 passed (before the review fixes).
  - Production `docker build`: passed, with 0 app `.map` files.
  - `git diff --check`: clean.
  - Local walkthrough on the image: readable request-ID trails for checkout reuse, webhook received → entitlement granted, duplicate webhook, publish, RSVP accepted and a rejected RSVP link. Stripe was simulated with locally signed webhooks because there were no test keys or Stripe CLI.
  - Not run: `npm run test:persistence`, and CI on GitHub.
- **Bundle size (gzip):** `/examples/minimal` first load went from 180.1 to 183.9 KiB. All client JS went from 341.7 to 422.1 KiB; most of the increase is the 70.8 KiB Sentry chunk, which loads only when `SENTRY_DSN` is set.
- **Independent review:**
  - The first pass failed. B1: guest names could reach Sentry through click-breadcrumb `aria-label`s. I1: session tracking sent a request on every page view. There were also six minor findings.
  - All were fixed with tests, and the new tests fail when the old settings are put back.
  - The re-review passed with conditions. It compared headers on the proxied paths against the pre-F038 image and found no regressions; `?share=` responses are now `no-store`. A signed Stripe webhook still verifies.
  - Its one remaining minor note is a cached `X-Request-Id` on public responses; it's now covered by a runbook line.
- **Outstanding (why this stays In Progress):**
  - The Sentry EU project and staging now exist (F041 steps 5 and 6).
  - On staging:
    - a thrown Server Action error, a browser error with a resolved source map and a rejected-webhook log must arrive with release, environment and request ID;
    - the three MCP queries must work;
    - alert email delivery and 30-day retention must be confirmed;
    - a real Stripe test checkout walkthrough is still needed.
  - The Sentry DPA/transfer terms and the privacy notice entry belong to F009.
- **Risks:** Next.js's own stderr error output isn't scrubbed (documented). Browser errors before the SDK loads are missed. Every full page load makes one extra no-store config request.
- **Sentry set up (25 September 2026):** org `meikle`, project `savethedates`, EU (Germany). `SENTRY_DSN` and `SENTRY_ENVIRONMENT=staging` are set on the staging Render service, and `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in GitHub. Details are in F041 step 6 and `operations.md` → "Set up Sentry (once)". `APP_RELEASE` needs no action; CI builds it in. The production service still needs its own values when it is created.
- **Early staging evidence (25 September 2026):** Render's staging logs show structured `payment.stripe.failed` lines with release, environment, route, request ID and a scrubbed reason (`StripeAuthenticationError`). That found F061. Whether the same events reached Sentry was not checked, because no Sentry connector was attached to that session.
- **Owner check (25 September 2026):** the owner reports Sentry "seems fine" on staging, and the real Stripe test checkout now works (F061). The specific checks above (a thrown Server Action error, a browser error with a resolved source map, a rejected-webhook log, the three MCP queries, and alert delivery and retention) were not individually recorded.
- **Next:** record those checks (they need a session with the Sentry connector), then mark F038 Done.

## F039 - Privacy-friendly visitor and funnel analytics

**Status:** Planned (decisions resolved; becomes Ready when F038 is Done)
**Priority / lead:** P2, wanted for launch but not a release blocker / Software Engineer with SEO & Growth input. Independent privacy review is required.
**Purpose:** The owner can see visitors, pages, referrers and campaigns, countries/cities, devices, clicks, and where people drop out between first visit and a published, paid wedding.
**Depends on:** F038 (shared scrubber and runtime configuration).
**References:** F038, `docs/overview/architecture.md` (F008 indexation), `src/app/layout.tsx`, `node_modules/next/dist/docs/01-app/02-guides/analytics.md`.

**Decision (proposed):**

- **PostHog Cloud EU with `cookieless_mode: "always"`.** Nothing is stored on the device, so no consent banner is needed; cookieless mode is compatible with PECR as amended by the Data (Use and Access) Act 2025.
- UK GDPR still applies to the hashing of IP and User-Agent. Record a legitimate-interest note, enable client-IP discarding after GeoIP, and confirm the DPA and transfer terms.
- It provides web analytics (visitors, pageviews, referrers/UTM, country/city, device), Web Vitals on marketing pages, funnels, and an official EU MCP server for AI questions.
- Cookieless mode counts unique visitors per day, not across days. That is acceptable.
- Send directly to PostHog's EU host: no `/ingest` proxy. A rewrite would forward Supabase session cookies, and every visitor would geolocate to the server. A carefully built proxy can be reconsidered later if ad-blocker loss proves material.

**Scope:**

- **Loading.** Load analytics by dynamic import when the browser is idle after load. It must never block rendering or hydration.
  - Turn off replay, surveys, heatmaps, the toolbar, feature-flag/remote-config calls and remote extensions.
  - Load it only when runtime configuration is present.
- **Autocapture** runs on marketing pages only. Dashboard and wedding pages send explicit named events, so response tables, guest names and form text are never captured.
- **Every event** carries `site_area: marketing | owner | wedding`, so guest traffic doesn't swamp acquisition figures.
- **Named events:**
  - `example_viewed {theme}`, `cta_clicked {location, target}`, `signup_started`, `signup_completed`;
  - `wedding_created`, `checkout_started`;
  - `purchase_completed {amount, currency}`, sent server-side from the verified Stripe webhook;
  - `checkout_expired`, from the `checkout.session.expired` webhook;
  - `wedding_published`, `guest_page_viewed`, `rsvp_submitted`.
- **One tracking helper.** All events go through one typed `track(event, properties)` helper for the client and one for the server. Event names and properties come from a single typed list, and nothing calls PostHog directly.
- **Identity.** Server-side events use the owner's Supabase user UUID as the distinct ID. Never email, names or personal properties.
- **Attribution.** Carry first-touch `utm_source/medium/campaign` and the referrer domain from the landing URL through the signup URL. Attach them to `signup_completed` server-side, then copy them to `purchase_completed`. Never store them in the browser.
- **Scrubbing.** All URLs, `$current_url`, `$referrer` and `$initial_referrer` pass through the F038 scrubber. Wedding paths are recorded only without query strings, so `?share=` never leaves the app. Slugs, which usually contain the couple's names, are visible only to the operator.
- **Documentation.** Add PostHog's host to any future CSP. Record PostHog in `tech-stack.md`/`architecture.md`. The privacy notice lists PostHog as an EU processor and describes cookieless analytics. Add PostHog MCP setup and example prompts to the F038 runbook.
- **Search launch steps**, added to F009 and `release-inputs.md`: verify the domain in Google Search Console by DNS, submit `/sitemap.xml`, inspect the homepage as indexable, and confirm examples show as excluded by noindex.
- **Deferred:** session replay, heatmaps, per-couple analytics shown in the dashboard, and an `/ingest` proxy.

**Owner decisions (24 September 2026):** PostHog EU Cloud on the free plan, owned by the owner. Wedding slugs may appear in the operator's analytics. Analytics retention is the PostHog default.

**Done when:**

- On staging, a marketing pageview with country, UTM attribution carried to `signup_completed` and `purchase_completed`, and each named event appear with scrubbed URLs.
- A Playwright journey intercepts PostHog payloads during a `?share=` guest visit, RSVP, auth confirmation and the checkout return. It asserts:
  - no secrets, query strings or form values are sent;
  - dashboard and wedding pages send no autocapture events;
  - no requests are made when configuration is unset.
- Homepage first-load JavaScript stays within an agreed budget.
- Mobile Lighthouse LCP, CLS and INP on the homepage don't regress against a pre-F039 baseline, allowing a performance-score drop of 5 or less. Record both figures.
- No visual change at mobile or desktop widths.
- `npm.cmd run check` passes.
- A PostHog MCP question ("visitors by country this week") works against staging.
- Independent review passes.

## F040 - Keep photo uploads within a small server's memory

**Status:** Done (24 September 2026; staging re-check carried to F009)
**Priority / lead:** P1, release gate for F009 / Software Engineer. No separate independent review: validation and storage behaviour are unchanged. It is covered by the F009 release review.
**Purpose:** The proposed launch host (F037: Render Starter, 512 MB RAM, 0.5 CPU) must not crash or slow guest pages when several couples upload large photos at the same moment. Guest traffic is light, so photo decoding is the main memory risk.
**Depends on:** None. It doesn't depend on the host. Verify again on F009 staging once the host exists.
**References:** `src/features/workspace/photo.ts` (`preparePhoto`), `src/features/workspace/publication-actions.ts` (the call at line 57), `src/features/workspace/publication.test.ts`, `Dockerfile` (`node:24.11.0-bookworm-slim`, glibc), `next.config.ts` (`serverActions.bodySizeLimit: "6mb"`), and sharp's documentation on `concurrency`, `cache` and memory allocation on glibc.
**Current behaviour:**

- `preparePhoto` buffers a file of up to 5 MiB, then decodes up to 25 megapixels, which is roughly 75–100 MB of raw pixels. It then resizes the photo to 2000 px WebP.
- Nothing limits simultaneous uploads.
- sharp's libvips thread count defaults to the detected CPU count, which inside a container can be the host machine's count. Its operation cache is on.
- glibc's allocator can keep memory high after bursts.
- The Next.js server itself uses roughly 150–250 MB. Two or three simultaneous uploads could therefore exceed 512 MB and restart the server, so guests would briefly see errors.

**Scope:**

- **One upload at a time.** Process at most one photo per server instance:
  - call `sharp.concurrency(1)` and `sharp.cache(false)` once at module load;
  - wrap `preparePhoto` in a small in-process queue (a semaphore) with a short waiting-queue cap, for example 3.
- **When the queue is full or a wait exceeds about 20 s**, return a friendly "Photo uploads are busy — please try again in a moment" message through the existing form state. Save nothing, leave the current photo and draft unchanged, and don't leak partial storage objects.
- **Decode memory.** Make sure the pipeline uses sharp's shrink-on-load for JPEG and WebP. Check whether the order of `rotate()` and `resize()` prevents it, and prefer the order that keeps peak memory lowest. Output must be unchanged: correct orientation, 2000 px maximum, metadata stripped, WebP at quality 85. Set `fastShrinkOnLoad: false` so fine patterns such as lace, pinstripes and fabric are resampled at full quality, without faint ripple (moiré) artefacts.
- **Allocator.** Following sharp's guidance for glibc, reduce fragmentation in the production image, for example with `ENV MALLOC_ARENA_MAX=2` or jemalloc. Keep whichever measures better.
- **Documentation.** Record in `docs/operations.md` the measured memory profile, and when to upgrade to Standard (2 GB): memory regularly above about 70%, restarts from running out of memory, or guest page latency rising at peak.
- **Upload guidance (24 September walkthrough):** Use plain language for the size limit without changing or understating the actual 5 MiB cap; keep the 25-megapixel rejection explicit when relevant. Do not silently relax server validation.
- **Deferred:** resizing photos in the browser before upload. Revisit only if the measurements or mobile upload times justify it. The server stays the authority on validation either way. (Delivered later in F062 at the owner's request.)

**Done when:**

- Unit tests prove that:
  - a second concurrent `preparePhoto` call waits until the first finishes;
  - a full queue returns the friendly error without calling sharp;
  - a queue place is always released (`try/finally`) when processing throws, rejects or times out, so one failed upload can't block later uploads;
  - the existing validation and output tests in `publication.test.ts` still pass.
- The production image is run with `docker run --memory=512m --cpus=0.5` against local Supabase. Five near-simultaneous 25 MP uploads are sent while a published wedding page is under steady load (for example about 10 requests per second with a simple HTTP load tool). The result:
  - the container isn't killed or restarted;
  - peak memory and guest-page p95 latency before and during the uploads are recorded, before and after the change;
  - every upload either succeeds or gets the friendly busy message.
- `npm.cmd run check` passes and the operations notes are updated. The same check is repeated on F009 staging.

**Handoff:** `src/features/workspace/photo.ts` sets `sharp.concurrency(1)` and `sharp.cache(false)` at load. It wraps processing in an in-process semaphore: one active photo, three waiting, a 20 s wait limit, and a `try/finally` release. A busy upload throws `photoBusyMessage`, which `changePhoto` already returns through the form state before any storage write. `publication-actions.ts` is unchanged. `Dockerfile` production sets `ENV MALLOC_ARENA_MAX=2`. Copy: help text is "A JPEG, PNG or WebP photo up to about 5 MB. Still photos only."; the client rejection reads "That photo is over 5 MB…"; the server size message says "up to about 5 MB". The 25-megapixel rejection text and all server limits are unchanged. `tests/publication.spec.ts` was updated to match. The measured profile and upgrade triggers are in `docs/operations.md` (Memory and photo uploads); `architecture.md` photo paragraph links it.
- Findings from sharp 0.35.4 source and measurements (`--memory=512m --cpus=0.5`, one process per photo):
  - `.rotate()` without arguments only sets `autoOrient`, which is applied after the resize. Order therefore didn't matter: 65 MiB either way for a 25 MP JPEG. Forcing orientation first peaked at 123 MiB. The code now uses the explicit `autoOrient: true` option.
  - `fastShrinkOnLoad: false` is set for JPEG. In sharp it disables WebP shrink-on-load entirely: a 24 MP WebP peaked at 211 MiB instead of 50 MiB. WebP therefore keeps fast shrink-on-load, and PNG has none.
  - On glibc, sharp already defaults to one libvips thread, but setting `MALLOC_ARENA_MAX` restores the 20-CPU default. The explicit `concurrency(1)` is therefore required.
- Unit tests: new `photo.test.ts` uses a mocked sharp. It checks that the second call waits, that a full queue returns busy without calling sharp, and that the slot is released on throw, reject and wait timeout. It also checks the module-load settings. Mutating the `finally` release or the timeout dequeue each failed one test. `publication.test.ts` adds EXIF orientation and WebP-resize checks.
- `npm.cmd run check` passed: lint, typecheck, 39 unit tests, build. `git diff --check` passed. `E2E_BASE_URL=http://127.0.0.1:3001 E2E_PRODUCTION=1 npx.cmd playwright test tests/publication.spec.ts` passed 2/2 against the final production image. Design-section screenshots were inspected at 390 and 1440 px, with no overflow.
- Load test: production image, `docker run --memory=512m --cpus=0.5 --add-host host.docker.internal:host-gateway --env-file .env.docker -e APP_ORIGIN=http://127.0.0.1:3001 -p 127.0.0.1:3001:3000`, against local Supabase. A throwaway scratchpad Node script ran five signed-in Playwright owners uploading 5000×5000 images through the real Design form and server action (three EXIF-rotated JPEGs of 3.3 MB, two PNGs), 100 ms apart. It drove an open-loop 10 req/s against a published page, sampled `docker stats`, and read cgroup `memory.peak` and `docker inspect`. Three bursts per container:
  - Before: peak 402/447/489 MiB, retained 339/442/483 MiB and still rising. Guest p95 went from 10 ms to 6.0–6.3 s during uploads. All five saved.
  - After, final image: peak 197/210/210 MiB, retained 180–189 MiB. Guest p95 went from 11–12 ms to 0.38–0.60 s. Four saved in turn (2–8.5 s); the fifth got the busy message and left no storage object and no `photo_path`.
  - Every run had zero failed guest requests, OOMKilled=false and RestartCount=0.
  - Allocator comparison: new code with default glibc peaked at 296/335/366 MiB, rising; jemalloc (`libjemalloc2` via `LD_PRELOAD`) at 239 MiB with p95 0.44–0.59 s. `MALLOC_ARENA_MAX=2` was kept: lowest peak and no new package.
- Test owners, photos and temporary containers/images were removed. The dev Compose app and Supabase were left running and unchanged.
- Not run: F009 staging re-check (no host yet; carried to F009); real phone uploads; hosted CI. No independent review, per this ticket; it is covered by the F009 release review. Deferred as scoped: browser-side resizing. Blockers: none. Next: F038.

## F041 - Production setup guide

**Status:** Planned (owner accounts/access and policy inputs outstanding; CI/image and staging-protection scope is prepared and can be split for implementation if needed)
**Priority / lead:** P1, release gate for F009 / Owner for the setup steps; Software Engineer for the product updates.
**Purpose:** One checklist of everything needed to run SaveTheDates in production.
**Depends on:** F037 (Done), F038/F040 for final staging verification, and completed F042-F048 for the final hosted journey. F039 analytics is optional and never gates F041/F009. Independent CI/image and staging-protection preparation has no dependency on those UI features.
**Rules:**

- Record non-secret values in `docs/release-inputs.md`.
- Enter secrets only in Render's environment settings or GitHub Actions secrets, never in Git, docs or chat.
- Staging and production always use separate projects, keys and webhooks.

**Cost at launch:**

| Item | Cost |
| --- | --- |
| Render production (Starter) | $7/mo |
| Supabase production (Pro) | $25/mo |
| Staging (Render free instance, Supabase Free) | $0 |
| Sentry, PostHog, Resend (free plans) | $0 |
| Domain | about £5–15/yr |
| Stripe | per-sale fee only |

### Owner setup steps

**1. Domain**

1. Buy the domain from a registrar that lets you edit DNS.
2. Production address: `https://<domain>` is `APP_ORIGIN`, and `www` redirects to it. Staging uses its free `onrender.com` address.

**2. Supabase**

1. Create an organisation with two projects in the Central EU (Frankfurt) region:
   - `savethedates-production` on Pro;
   - `savethedates-staging` on Free.

   Store each database password in a password manager.
2. In each project, open **Authentication** and set:
   - **Sign in / Providers → Email:** enabled, Confirm email on, Secure email change on, minimum password length 12, email OTP expiry 3600 seconds.
   - **URL Configuration:** Site URL = that environment's `APP_ORIGIN`. Redirect URLs = `APP_ORIGIN/auth/confirm` and `APP_ORIGIN/auth/callback`.
   - **Sign in / Providers → Google** (F055, deferred; skip for launch): set up after the Google client below.
   - **Email Templates:**
     - Confirm signup: subject "Confirm your SaveTheDates account", body from `supabase/templates/confirmation.html`.
     - Reset password: subject "Reset your SaveTheDates password", body from `supabase/templates/recovery.html`.
   - **Google sign-in** (F055, deferred by the owner; not needed for launch). When resuming it, do this once per environment, staging first:
     1. In [Google Cloud Console](https://console.cloud.google.com/), create a project named `SaveTheDates` (one project covers both environments).
     2. Open **Google Auth Platform → Branding**. Set the app name `SaveTheDates` and the support email. Under **Authorised domains**, add the production domain and each Supabase project's domain (`<project-ref>.supabase.co`). Add the privacy and terms links once the F041 policy pages exist.
     3. **Audience:** choose External, then **Publish app**. Only the basic email and profile scopes are used. Until Google verifies the brand (free, needs the policy links and domain), its consent screen says "continue to `<project-ref>.supabase.co`". Record the chosen option in `release-inputs.md` section 3.
     4. **Clients → Create client → Web application**, named `SaveTheDates staging` or `SaveTheDates production`. Authorised JavaScript origin: that environment's `APP_ORIGIN`. Authorised redirect URI: the **Callback URL** shown in Supabase under **Sign in / Providers → Google** (`https://<project-ref>.supabase.co/auth/v1/callback`).
     5. In Supabase **Sign in / Providers → Google**: enable it and paste the client ID and client secret. Keep the secret out of Git and this backlog.
     6. On that environment's Render service, set `AUTH_GOOGLE_ENABLED=true`.
3. Give the engineer access to both projects. The engineer applies the migrations using the procedure in `docs/operations.md`: staging first, then production. The migrations also create the photo storage bucket.
4. Record the project refs, region and plans in `release-inputs.md` section 2.

**3. Email (Resend)**

1. Create a Resend account and add the domain. Add the SPF, DKIM and DMARC DNS records it shows, then wait until it says Verified.
2. Create two API keys: `staging` and `production`.
3. In each Supabase project, open **Authentication → SMTP** and set:
   - host `smtp.resend.com`, port `465`, username `resend`;
   - password: that environment's API key;
   - sender: `SaveTheDates <hello@<domain>>`.
4. Record the sender details in `release-inputs.md` section 3.

**4. Stripe**

1. Complete account activation: business details, bank account, statement descriptor, support email and website address. Do this once the product updates below are live, because Stripe reviews the website.
2. Under **Settings → Branding**, set the name, logo and colour for Checkout.
3. Add the webhook endpoints:
   - **Test mode:** `https://<staging-origin>/api/stripe/webhook`.
   - **Live mode:** `https://<domain>/api/stripe/webhook`.

   Select these events for both: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `refund.created`, `charge.dispute.created`.
4. Keys:
   - Staging: test-mode secret key and the test endpoint's signing secret.
   - Production: live-mode secret key and the live endpoint's signing secret.
5. No product or price setup is needed; the app sets £29 at Checkout.
6. Record the details in `release-inputs.md` section 4.

**5. Render**

1. Create an account (Hobby workspace) and add a payment card.
2. On GitHub, create a classic personal access token with only `read:packages`. In Render, add it under **Settings → Registry Credentials**.
3. Create two web services from the existing image `ghcr.io/<owner>/<repo>`:

   | Setting | Staging | Production |
   | --- | --- | --- |
   | Name | `savethedates-staging` | `savethedates-production` |
   | Region | Frankfurt | Frankfurt |
   | Instance | Free | Starter |
   | Port | 3000 | 3000 |
   | Health check path | `/api/health` | `/api/health` |

4. Set these environment variables on each service, using that environment's values: `APP_ORIGIN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `AUTH_GOOGLE_ENABLED=true` once Google sign-in is set up in step 2. On staging only, also set `APP_ENV=staging`, `STAGING_USERNAME` and `STAGING_PASSWORD` (a password-manager password of at least 16 characters; see `docs/operations.md`, Staging access).
5. On production, add the custom domains `<domain>` and `www.<domain>`. Create the DNS records Render shows and wait for the certificate to be issued.
6. In notification settings, send deploy failures and service failures to the incident email.
7. Optional: copy the staging service's deploy hook into the GitHub Actions secret `RENDER_STAGING_DEPLOY_HOOK`, so each tested image deploys to staging automatically. Production is always promoted by hand (`docs/operations.md`, Image publishing and Render).
8. Record the host details in `release-inputs.md` section 1.

**6. Monitoring (F038 required; F039 optional)**

1. **Sentry (staging and GitHub done on 25 September 2026; see the progress notes below).** Follow "Set up Sentry (once)" in `docs/operations.md`. For production, set `SENTRY_DSN` and `SENTRY_ENVIRONMENT=production` when that service is created. In short:
   - Sign up with the EU data region and create a Next.js project.
   - On each Render service, set `SENTRY_DSN` and `SENTRY_ENVIRONMENT` (`staging` or `production`).
   - In GitHub, add the secret `SENTRY_AUTH_TOKEN` and the variables `SENTRY_ORG` and `SENTRY_PROJECT`.
   - Point alert emails at the incident email.
   - Then run the F038 staging checks.
2. **PostHog (only if optional F039 is delivered):**
   - Sign up on EU Cloud.
   - In project settings, turn on cookieless tracking and "Discard client IP data".
   - Put the project API key in Render.
3. **Claude:** connect the approved Sentry and Supabase connectors with read-only access; PostHog only if F039 is delivered.

**7. Search**

1. In Google Search Console, add the domain, verify it with the DNS TXT record, and submit `https://<domain>/sitemap.xml`.

**8. Launch**

1. Follow "Verification and promotion" in `docs/operations.md` on staging, then on production.
2. Record the results in F009.

### Product updates (Software Engineer)

Updates 1, 2 and 4 are delivered by [F056](#f056---publish-the-tested-image-and-protect-staging). Update 3 is built with drafted text that awaits the owner's approval (26 September 2026, below).

1. **CI publishes the image.** After all checks pass on `main`, CI pushes the production image to GHCR, tagged with the commit SHA (`packages: write`). Render deploys that tag. Rollback redeploys the previous tag from Render's deploy history.
2. **Staging is protected.** When `APP_ENV=staging`:
   - every response requires HTTP basic auth (`STAGING_USERNAME`/`STAGING_PASSWORD`);
   - every response is `noindex`;
   - `robots.txt` disallows everything.

   Production leaves `APP_ENV` unset. The Stripe webhook route is exempt from basic auth, because it is authenticated by its signature.
3. **Legal and contact pages (built 26 September 2026; text awaits owner approval).** Add Terms, Privacy and Refund pages using owner-approved text, plus visible Contact/support details. Link them in the site footer and next to sign-up and checkout. Verify current provider activation requirements during setup; this is an existing project launch requirement, not a legal-compliance conclusion. Do not publish placeholder policies.
4. **Documentation.** Document `APP_ENV`, the staging variables and the Render specifics (registry, health check, rollback, notifications) in `docs/operations.md` and `run-app-instructions.md`.

### Open owner decisions

These are already listed in `release-inputs.md` sections 5–6:

- policy text (terms, privacy, refunds);
- retention and deletion rules;
- incident contact;
- a backup method for uploaded photos, because Supabase backups exclude Storage.

**Owner setup progress (25 September 2026):**

- **Step 5 Render, staging done.** `savethedates-staging` (`srv-darbpap7lnhs73cp2t50`, Frankfurt, Free) runs image tag `5ae28ff…` at `https://savethedates-staging.onrender.com`. Set on it: health check `/api/health`, `PORT=3000`, `APP_ORIGIN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT=staging`, `APP_ENV=staging`, `STAGING_USERNAME`, `STAGING_PASSWORD`. The owner holds the password. A registry credential (classic `read:packages` token, no expiry) is in place. Failure notifications go to the owner's email, which is the workspace default. The deploy hook is stored as the GitHub secret `RENDER_STAGING_DEPLOY_HOOK`.
- **Production service not created:** the Render workspace has no payment card. Custom domains and DNS records follow once it exists.
- **Step 6 Sentry done.** Org `meikle`, project `savethedates`, EU (Germany) region. IP storage is off, and the default scrubbers are on. Allowed domains are the staging host, `savethedates.co.uk` and `www.savethedates.co.uk`. Three issue alerts email the owner: new issue, regression, and more than 10 events in an hour. GitHub has the secret `SENTRY_AUTH_TOKEN` and the variables `SENTRY_ORG=meikle` and `SENTRY_PROJECT=savethedates`. The org started on a 14-day Business trial (ends about 9 October 2026). Afterwards, confirm it dropped to the free Developer plan, and record the error and log retention against the 30-day decision.
- **Step 2 Supabase, staging done (26 September 2026).** One project, `savethedates-staging`, Frankfurt, Free tier, ref `onrblnlwrnbdvyeasqdt`. No production project (Pro is paid; owner deferred it). Auth → Providers → Email: Confirm email on, Secure email change on, minimum password length 12, OTP expiry 3600s. URL Configuration: Site URL and both `/auth/confirm` and `/auth/callback` redirect URLs set to the staging origin. Confirm-signup and reset-password templates copied from `supabase/templates/`. Custom SMTP set to Resend (below). `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set on the staging Render service and deployed. The owner holds the database password. All 30 migrations in `supabase/migrations/` were applied through the Supabase connector on 26 September 2026 (see below).
- **Step 3 Email (Resend), staging done.** `savethedates.co.uk` added in Resend; its SPF/DKIM/DMARC records were added in GoDaddy and the domain shows Verified. One API key (`staging`) is set as the staging Supabase project's SMTP password (host `smtp.resend.com`, port 465, username `resend`, sender `SaveTheDates <hello@savethedates.co.uk>`). No production key yet.
- **Step 4 Stripe, staging (test mode) done.** The former "Equimarket sandbox" account was renamed (Account Name, not a separate Branding display name) rather than replaced. Test-mode webhook endpoint registered at `https://savethedates-staging.onrender.com/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `refund.created`, `charge.dispute.created`. `STRIPE_SECRET_KEY` (test) and `STRIPE_WEBHOOK_SECRET` set on the staging Render service and deployed. Live-mode activation (business/bank details) still untouched, correctly, since it needs a reviewable production site.
- **F055 Google sign-in, staging configured (26 September 2026).** Google Cloud project "SaveTheDates" (project ID `savethedates`); OAuth client "SaveTheDates staging" (client ID `346083080041-kucgcqljqlh97couqc20u30g6p0vju4r.apps.googleusercontent.com`), JS origin and redirect URI matched to Supabase's Google callback. Client ID/secret set in Supabase's Google provider and enabled. `AUTH_GOOGLE_ENABLED=true` set on the staging Render service and deployed. **Consent screen is in Testing, not Published**: Google now requires Homepage and Privacy Policy URLs to publish externally, which don't exist yet (blocked on F041's legal pages). Only `rmeikle55@gmail.com` is added as a test user, so Google sign-in only works for the owner on staging until it's published. See F055's own handoff for the rest of that checklist (disposable-account staging pass, privacy notice wording) once publishing is possible.
- **Verified by curl after the above deployed:** staging `/` returns 401 with no login and 200 with the staging login; `/api/health` returns 200. The actual sign-up/Google/Stripe-checkout journeys have not been exercised end-to-end yet — that's the F038 staging pass, still to do, and needs the migrations applied first.
- **Staging migrations applied (26 September 2026).** The project was empty. The engineer applied all 30 files in order through the Supabase connector (`apply_migration`), with no errors. Each recorded statement's MD5 matches its file byte for byte, and the recorded versions were changed to the file timestamps (`20260918000100` … `20260925000300`), so `npx supabase migration list` shows them as applied. Result: 6 public tables, all with RLS on; the private `wedding-photos` bucket and its 4 storage policies; function grants as designed. Supabase advisors: the payment and attempt tables have RLS with no policies (intended: server-only); the secret-based guest functions are callable by `anon` (intended); leaked-password protection is off (an Auth setting, Pro plan only); three foreign keys lack an index and five indexes are unused on the empty database (informational).
- **Legal pages built (26 September 2026, update 3).** `/privacy`, `/terms` and `/refunds` (`src/features/marketing/legal.tsx`) describe what the code does: data collected, providers and regions, cookies, retention, rights, the £29 price and six-month period, and refunds. They are linked in the footer (with `mailto:hello@savethedates.co.uk`) and beside sign-up and checkout (`legal-agreement.tsx`), and are indexable but not in the sitemap. On staging, `/`, `/privacy`, `/terms` and `/refunds` (exact paths) now open without the password, so Google's consent screen can reach them; everything else stays gated (`src/lib/staging-access.ts`, `docs/operations.md`). **Drafted by the engineer for the owner to approve, not legal advice.** Decisions made without owner input, each easy to change in `legal.tsx`: operator named as "Ross Meikle in the United Kingdom"; contact `hello@savethedates.co.uk` (Resend receiving is off, so this address must forward to a real inbox, for example through GoDaddy email forwarding); a 14-day no-questions refund, then refunds if the site doesn't work; deletion on request by email, including our copy of payment records (no self-service tool or deletion runbook yet, F048); logs 30 days and error reports up to 90 days (Sentry trial); governing law of the UK nation where the customer lives. An independent review found and fixed four false statements (a reply download that doesn't exist, six-year payment retention that account deletion would contradict, and the dispute and partial-refund wording) and added a technical-data bullet and the agreement line under Google sign-in.
- **Outstanding:** the owner approves or edits the legal text and makes sure the contact address receives mail; then publishes the Google consent screen (Branding: Homepage `https://savethedates-staging.onrender.com/`, Privacy `…/privacy`, Terms `…/terms`, and add `savethedates-staging.onrender.com` to Authorised domains). Google may also ask to verify the staging host in Search Console; `/` is reachable for a meta-tag check.
- **To update later (production): the Google URLs still point at staging.** They are temporary. When the production service and `savethedates.co.uk` are live, create the production OAuth client and set its Branding to Homepage `https://savethedates.co.uk/`, Privacy `https://savethedates.co.uk/privacy`, Terms `https://savethedates.co.uk/terms`, with `savethedates.co.uk` in Authorised domains (verified in Search Console, F041 step 7), then request brand verification. The same URLs go in Stripe's account activation (step 4) and anywhere else a policy link is asked for. Remove the staging URLs from any production listing. The legal pages are also the owner's to re-approve whenever the operator, contact address, refund or retention rules change (`src/features/marketing/legal.tsx`). Then run the F038/operations.md staging journey, including real Stripe test Checkout and a Google sign-in test with a disposable or the owner's test-user account. Production Supabase, Render and Stripe live mode remain not started, each blocked on payment/owner authorisation as before.
- **Owner update (25 September 2026):** the legal text is approved as drafted (`release-inputs.md` section 5). The owner confirmed that a real Stripe test checkout, Google sign-in and a photo upload were exercised on staging. The photo upload exposed a hosted-Storage read bug, fixed in F062's handoff.
- **Next:** production setup, stage 2 of the [launch plan](launch-plan.md). The owner runs [production-setup-prompt.md](production-setup-prompt.md) with Claude computer use (Supabase, Resend, Render, GoDaddy, Google, Stripe and Sentry; production starts locked). The engineer applies the migrations to the new production project. Record the non-secret values in `release-inputs.md`.

**Done when:**

- Required setup inputs and steps 1–6 are complete and recorded in `release-inputs.md`; optional F039/PostHog work is excluded. Configure production securely without opening paid customer access. Step 7 Search Console submission and step 8 production promotion belong to F009 once the live domain is ready.
- The product updates have shipped with `npm.cmd run check` passing.
- Staging passes the full hosted journey in `docs/operations.md`.
- Hand off the reviewed image/configuration and staging evidence to F049/F009. F041 does not depend on F009 being Done; final release review, deployment and production smoke belong solely to F009.

## F056 - Publish the tested image and protect staging

**Status:** Done (25 September 2026; CI run #66 published the image, and hosted staging verified)
**Priority / lead:** P1, release gate via F041 / Software Engineer; independent review required (access control and CI permissions).
**Purpose:** Deliver F041 product updates 1, 2 and 4, which need no owner input, so the owner's Render setup can use a published image and a private staging site.
**Depends on:** F037, F038 (image, runtime configuration; code Done). Split from F041 on 25 September 2026 as that entry allowed.
**References:** F041 Product updates; `.github/workflows/ci.yml`, `Dockerfile`, `src/proxy.ts`, `src/app/robots.ts`, `docs/operations.md`, `run-app-instructions.md`.
**Scope/decisions:**

- CI pushes the image it has already tested, never a rebuild, to `ghcr.io/<owner>/<repo>:<commit SHA>` only after every check passes on a push to `main` (named explicitly; GitHub's default branch is still the stale `master`). The write token lives only in a separate publish job that runs no project code. An optional `RENDER_STAGING_DEPLOY_HOOK` secret deploys that tag to staging; production promotion stays a manual owner step (F009).
- `APP_ENV=staging` requires HTTP basic auth (`STAGING_USERNAME`, `STAGING_PASSWORD` of at least 16 characters) and sends `X-Robots-Tag: noindex` on every response, and `robots.txt` disallows everything. Missing credentials or any other `APP_ENV` value fail closed with 503. Production leaves `APP_ENV` unset.
- Paths open without the password: the Stripe webhook (signature-authenticated) and a new `/api/health` liveness route. Render's health check can't send credentials, so `/` can't be the staging probe. Also the twelve fictional `/media/themes/<theme>.webp` files, exact paths only: Next's image optimiser fetches them internally without request headers, so gating them would break the homepage images on staging. Other `/media/themes/...` paths match the guest routes and stay gated, and `images.localPatterns` limits the optimiser to these files.

**Done when:**

- Unit tests cover the access decision: unset, staging with valid, wrong, malformed or missing credentials, open paths, and misconfiguration. A staging-mode production container passes a scripted check in CI and locally: 401 with a challenge and noindex, 200 with credentials, open webhook/health/theme images, optimised images loading, and robots disallowing everything. The production smoke covers `/api/health`.
- CI's publish job is limited to `packages: write`, runs only on `main` pushes after `verify` passes, and records the pushed digest. Docs cover `APP_ENV`, the staging variables, image publishing, registry credentials, health check, deploy/rollback and notifications. `npm.cmd run check` and independent review pass.

**Handoff (25 September 2026):** `src/lib/staging-access.ts` decides access and `src/proxy.ts` applies it before any application code or Supabase call. `/api/health` is the liveness route for both environments, and staging `robots.txt` disallows everything. `images.localPatterns` limits the optimiser to the theme images. `scripts/smoke-staging.mjs` (`npm run smoke:staging`) checks a staging-mode container, and `scripts/smoke.mjs` now covers `/api/health`. CI labels the image, runs the staging check, and hands the tested image to a pinned, `packages: write`-only `publish-image` job. That job runs one at a time, records the digest and can optionally deploy to staging through `RENDER_STAGING_DEPLOY_HOOK`. Docs: `docs/operations.md` (Staging access, Image publishing and Render), `run-app-instructions.md` (Staging access check), F041 steps 2, 4, 5 and 7.

- `npm.cmd run check` passed: lint, typecheck, 17 files and 84 unit tests (7 new), production build. `npx.cmd playwright test tests/marketing.spec.ts tests/metadata.spec.ts --reporter=line` passed 12/12 desktop/mobile on the development server. The production image was built locally and run against local Supabase:
  - With `APP_ENV=staging` on port 3200, `node scripts/smoke-staging.mjs http://127.0.0.1:3200` passed, and an unauthenticated `POST /media/themes/rsvp` with `Next-Action` returned 401.
  - Without `APP_ENV` on port 3201, `node scripts/smoke.mjs http://127.0.0.1:3201` passed. The homepage had no `X-Robots-Tag` and `robots.txt` was unchanged. The optimiser returned 200 for a theme image and 400 for `/media/lake-como.webp`.
  - A 5-character password returned 503 on `/api/health`, `/` and the webhook.
- The workflow parses (js-yaml), and `git diff --check` passed. Temporary containers and images were removed. Generated `next-env.d.ts` churn was restored.
- Independent review: no Blocking findings. Both Important findings were fixed and re-checked by the reviewer. The `/media/themes/` prefix had opened the guest routes (names "media", secret "themes"), including a server action; only the twelve exact theme files are open now. Publishing had been keyed to GitHub's default branch, which is a stale `master`; `main` is now named explicitly. Minor points fixed: publish concurrency, the pinned `download-artifact`, `/_next/image` docs plus `localPatterns`, the classic-token wording and the cancelled-run comment.
- **First `main` push (commit `cb673ce`, run #63) failed:** `verify` failed at `npm run check` (`eslint . --max-warnings 0`) on an unrelated unused import (`todayUtc`) in `src/app/dashboard/preview/page.tsx`, left over from prior work and not caught by local checks run before that push. `publish-image` needs `verify` and did not run, so no image was published; nothing in this feature's own code executed, since the lint step fails before any Docker build/test step. Fixed and re-verified locally in commit `1db3f6f` (`npm.cmd run check` passed: lint, typecheck, 85 tests, build) and pushed to `main`.
- `1db3f6f` (run #65) failed; the next push, `5ae28ff` (Application checks run #66), passed. `publish-image` pushed `ghcr.io/meikle-dev/savethedates:5ae28ffcf9955ec7fc5ba20948c8dd2680e0e070`, digest `sha256:803540079a3b75d1d94eefadca3ec2bf834abfdc78d6c2e809cf787903fade10`. Render staging pulled this image through the registry credential, and its deploy events show the same digest.
- Hosted staging, checked with curl on 25 September 2026: `/` without a login returned 401 with the Basic challenge and `X-Robots-Tag: noindex, nofollow`; a wrong password returned 401; the correct login returned 200; `/api/health` returned 200 with no login; `robots.txt` returned `Disallow: /`.
- Not yet exercised: the `RENDER_STAGING_DEPLOY_HOOK` step, because the secret was added after run #66. The next `main` push will run it.
- **Next:** none for F056. Watch the deploy-hook and Sentry source-map steps on the next `main` push (F041). Optionally, set GitHub's default branch to `main`.

## F057 - Fast, reliable browser checks in CI

**Status:** Done (25 September 2026)
**Priority / lead:** P1, unblocks every CI run / Software Engineer; independent review required (release verification coverage).
**Purpose:** CI's browser checks kept failing on timeouts. The owner decided (25 September 2026) that tests should not take that long, instead of raising time limits again.
**Depends on:** F056 (CI workflow).
**References:** `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/`, `run-app-instructions.md` (Checks), `docs/operations.md` (Verification and promotion).
**Cause:** CI ran all 96 browser tests twice against `next dev`, which compiles each page on first request (on the runner, then through the development container), plus a `test:release` subset against the production image. Eight specs also repeated whole journeys for all twelve themes at both viewports, although the themes differ only in CSS. Tests ran at their limits: 26-31s of 30s, and up to 1.3m of 90s.
**Scope/decisions:**

- The browser suite runs once in CI, against the production image, with `E2E_PRODUCTION=1 npm run test:e2e`; `test:release` is removed. Only the `/demo` fixture tests need development, so the development container runs `tests/preview.spec.ts` alone; those tests skip in production mode. Locally, `E2E_PRODUCTION=1` makes Playwright serve the `npm run build` output instead of `next dev`.
- Behaviour tests use one theme. Every theme is still covered by `theme-design.spec.ts` (Save the Date and Details at 320-1440px, image failures; desktop project only, since it sets its own widths), `rsvp-preview.spec.ts` (RSVP form at the project width and 320px), `rsvp.spec.ts` (closed RSVP notice) and `themes.spec.ts` (long content with a failed photo). The homepage cards and the noindex of every example are still checked for all twelve. Accepted gap: the RSVP validation error and "Thank you" states, and applying a theme through the UI, are checked on one or two themes only.
- The development container is now exercised only by `/demo`, the smoke script and the sign-up fetch; the production container covers the same `.env.docker`/`host.docker.internal` wiring with the full suite.
- Tests keep Playwright's 30-second default: per-test limits are removed, and a test that needs longer is split. `publication.spec.ts` became photo upload/framing and publish/share/update/unpublish.
- The flaky forced hover in `rsvp-preview.spec.ts` is removed; the disabled cursor comes from `:disabled`, not `:hover`.

**Handoff (25 September 2026):** Implemented as scoped above; docs updated in `run-app-instructions.md` (Checks, marketing and production-container sections) and `docs/operations.md`.

- `npx eslint tests playwright.config.ts` and `npx tsc --noEmit -p .` passed. The workflow parses (js-yaml). `npm run build` then `E2E_PRODUCTION=1 CI=1 npx playwright test --retries=0` against `next start` passed 76, skipped 20 (8 `/demo`, 12 mobile `theme-design`), in 2.6 minutes.
- As CI will run it: a locally built production image on port 3000 with `.env.docker` and the webhook-test Stripe placeholders passed `npm run smoke`, then `E2E_BASE_URL=http://127.0.0.1:3000 E2E_PRODUCTION=1 CI=1 npx playwright test --retries=0`: 78 passed, 20 skipped, 0 failed or flaky, 2.4 minutes, slowest test 12.5s. `docker compose up --build -d --wait`, then `tests/preview.spec.ts` through the development container, passed 12/12 in 6.9s.
- After the review fixes, `tests/rsvp-preview.spec.ts`, `tests/rsvp.spec.ts` and `tests/publication.spec.ts` passed 12/12 against `next start` (slowest 9.7s). The whole suite was not re-run after those fixes. The temporary image was removed and the development app container restored.
- Independent review: no Blocking findings. The Important gap (no theme's RSVP page checked at 320px or in the closed state) is fixed by the 320px check in `rsvp-preview.spec.ts` and the reload-only closed-state loop in `rsvp.spec.ts`; the one-theme gaps that remain are recorded above. Minor wording, a stale marketing description and publication-test leftovers are fixed. The reviewer's second Important point stands: CI speed is not proven until GitHub Actions passes.
- **GitHub Actions verified (25 September 2026):** CI `verify` job passed. Browser suite executes once against the production image in under 3 minutes with all checks passing.
- Next: F055 (Google sign-in; later deferred by the owner, 25 September 2026).

## 24 September walkthrough assessment

**Source:** [Full walkthrough](reports/2026-09-24-ux-walkthrough-and-launch-readiness.md), reviewed against commit `76a23c0`. Product Manager triage with separate engineering, UX and independent release assessments. This is planning and source inspection, not a new browser/security audit or release approval. The original report is preserved.

**Assessment:** Accept the sharing, onboarding and readiness problems. Keep one shared bearer link and one named response per person (F026/F031). Improve the presentation without auto-enabling Details or RSVP, exposing secrets, or adding household/dietary data. No new service or parallel implementation of existing capabilities is needed. Report observations and proposed solutions are distinct; not every recommendation becomes a feature.

**Owner decisions (24 September, after triage):**

1. **One reply per person is confirmed.** Each guest fills in the RSVP themselves. Household, plus-one and party-size replies stay in F010.
2. **All guest pages move under the wedding's existing long RSVP secret, with the names first:** `/<names>/<secret>`, `/<names>/<secret>/details` and `/<names>/<secret>/rsvp`. Guests click these links rather than type them, so the long secret is kept.
   - The secret alone makes each wedding's URL unique, so the names part needs no uniqueness rule, no reservation and no payment step. This replaces the reservation design previously in F043.
   - Putting the names first makes a shared link read as the couple's own address.
   - A link can't be disguised as `/names` alone: messaging apps show the real URL, and a names-only redirect would bypass the secret. Instead, a pre-written share message (F042) and a preview card showing names and date (F047) make the shared link friendly.
   - It also removes the second, general URL, and with it the RSVP dead end. It is possible now because F031 retired individual invitations, which was F015's objection to a single wedding-wide code. F015's other objection still applies: the code must stay unguessable, so a short six-digit code is not used.
3. **Preview cards may show the couple's names and wedding date, but not their photo or location.**

**Corrections supported by the current source:**

- Expired/too-short purchases are already rejected by `begin_checkout_attempt` in `supabase/migrations/20260923000100_six_month_entitlements.sql`, with coverage in `tests/integration/payments.test.ts`. A near-cutoff date is already rejected at `payments.test.ts:167-168`. Past-date wording is F046. This is not a new payment defect.
- F007 records owner confirmation of a real Stripe test-mode flow on 19 September. That does not verify the future managed staging environment; F041/F009 still require it. The report's blanket claim that only fixtures have ever been used is too strong.
- Details already reports hidden/live status after save (`details-actions.ts`). Overview already shows RSVP state and live-site/copy actions (`dashboard/(workspace)/page.tsx`). Improve prominence and Publish readiness rather than duplicate these features.
- Design's swatches are decorative; the preview already has named previous/next controls and accessible theme choices (`preview-toolbar.tsx`). F050 addresses browsing and mobile height.
- Workspace section titles already exist; example pages share a separate example title. F047 targets the actual missing distinctions. Publish currently has a relative anchor and no copy button; the relative input with Copy full link is in RSVP.
- Account and Publish forms already validate on the server. B5 concerns presentation and error discoverability, not missing validation. The RSVP deadline really is UTC; changing its label alone would misstate the cutoff.
- A walkthrough does not prove tenant isolation, legal compliance, or provider activation requirements. Self-service deletion plus RSVP CSV is not a complete data policy. Owner-approved policy and provider requirements remain F041/F048/F009 inputs; no new legal conclusion is adopted here.

**Delivery order:** Resume any actionable F009 preparation first. Otherwise select the first eligible item in this queue: **F040 → F038 → F043 → F042 → F044 → F045 → F046 → F047 → F055 → F048 → F041 → F054 → F049 → F009 release**. Skip only genuinely blocked items and retain their blockers. **25 September additions (owner notes):** F061 goes with F038, because F038's staging checkout check needs it. F062 and F064 come next, before F047. F062 is a paid-launch gate; F064 is a small polish ticket that doesn't gate launch. F063 is done with F055's production setup and doesn't gate launch. F041's independent CI/staging preparation can proceed while owner inputs are pending; its hosted journey must verify the completed launch changes. Order does not imply a technical dependency where none is listed. F033, F039, F032 and F050 follow launch work. F051 (SEO audit) and F053 (homepage review) are report-only and may run alongside launch work without gating it; F052 (advertising strategy) follows F053. This assessment does not authorise implementation or deployment. **Owner decision (25 September 2026):** F055 (Google sign-in) is promoted from post-launch to a paid-launch gate.

**Paid-launch gate:** F038, F040-F049, F054 (security review), F061, F062 and existing F009 gates must be Done (F055 Google sign-in was deferred by the owner on 25 September 2026 and no longer gates launch) with required evidence, or a specific scope deferral must be explicitly accepted by the owner. Policy, security, payment correctness and core accessibility failures cannot be described as passed through a UX deferral. F050 and F010 enhancements do not gate launch.

| Report finding | Disposition |
| --- | --- |
| B1; Basics next step/date copy; Details visibility/save reach | F046 |
| B2/B4; RSVP off/deadline; one reply each; thank-you continuation; guest RSVP CTA | F044 |
| Two-link confusion; general-URL RSVP dead end; URL choice before payment | F043: one `/<names>/<secret>` guest URL whose names part is not unique and can be chosen at any time |
| B3; publish success/share; plural-link marketing copy | F042 |
| B5 sign-up; confirmation/resend; password visibility | F045 |
| B5 Publish (consent and URL errors) | F043 (names field) and F042 (Publish panel) |
| Expired-date purchase concern | Existing guard and integration test retained; past-date wording is F046 |
| B6; missing icon; unhelpful 404; link previews | F047: preview card with names and date, no photo (owner approved) |
| Sign-up/checkout/footer legal/support links | Existing F041; approved policy input, no placeholder pages |
| Data retention/export/deletion; guest CSV | F048; print and optional catering export remain F010 |
| Theme gallery/preview height; example RSVP and theme navigation | F050, Deferred |
| Overview duplicate previews, mobile density, optional theme checklist; framing scroll; repeated address guidance | F010, Deferred; no new tracking fields or dashboard redesign |
| Household/plus-one/dietary/note fields; editable decorative lines | Owner confirmed one reply per person (24 September); these are F010, Deferred |
| Calendar downloads and QR codes | F010, Deferred; sharing works without them |
| Upload-limit wording | F040: simplify help without misstating its actual byte/pixel limits |
| Motion; analytics; Innovation role | Existing F032/F039/F033; not launch blockers |
| Evening Gold contrast, tap targets, keyboard/screen reader, Safari/iPhone and Firefox | F049; core accessibility moved before launch |
| Hosting/Supabase/email/Stripe/staging/CI; monitoring; upload memory | Existing F041/F038/F040, no duplicate infrastructure tickets |
| Storage backups/restore, asset rights, business identity, support, release review/deploy | Existing F009/F041 and `release-inputs.md`; owner/provider/legal verification where appropriate |

**Planning verification (24 September):** Engineering, UX and release reviewers inspected source and existing evidence. Independent final documentation review found no Blocking/Important findings. `git diff --check` passed. An inline Python link/heading check passed for all seven introduced local links/anchors, 50 unique feature IDs and all nine new ticket statuses. A broader scan checked 36 existing/local links and found one pre-existing missing file, `docs/ux/designs/dashboard-redesign.png`; that unrelated reference is unchanged. No application changes, browser rerun, application tests, provider verification or deployment were performed. Exact next step: implement F040 using its existing acceptance criteria; keep F009 blocked on its outstanding external inputs.

## F042 - One clear guest link and a useful publishing handoff

**Status:** Done (25 September 2026)
**Priority / lead:** P1, paid-launch gate / UX then Software Engineer; independent security review required.
**Purpose:** Couples can confidently share one working link after publication.
**Depends on:** F043 (single guest URL); F026, F027, F031 (Done).
**References:** Report B3, sections 3.7, 4 and 5; `publication-form.tsx`, `rsvp-manager.tsx`, `copy-link-button.tsx`, `src/app/dashboard/(workspace)/page.tsx`, `src/features/weddings/invitation-context.ts`, `src/features/marketing/home.tsx`.
**Scope/decision:**

- Call the F043 URL **Your guest link**. After F043 it is the only link a couple shares.
- Make it primary in Publish's live/success panel and in the Overview.
- Offer a pre-written share message the couple can edit before sending, for example: "Save the date! Sarah & James are getting married on 12 June 2027 at Mount Stewart. Details and RSVP here: <guest link>".
  - It's built from the saved names, date and location, and isn't stored.
  - Actions: native Share (message and link) where supported, **Share on WhatsApp** through WhatsApp's own `wa.me` share link, Copy message and Copy link.
- Keep RSVP settings and link replacement in the RSVP section, and show the same current link wherever it appears.
- Explain that anyone holding the guest link can view the site and reply.
- QR codes are deferred.

**Done when:**

- Displayed, selected/copied and shared URLs are the same absolute URL using the configured application origin, never an untrusted request Host. Mobile text can be read/copied without page overflow; Copy gives accessible success/error feedback.
- Publication success and later visits show the same usable panel. Draft, unpublished, expired and revoked states do not offer an apparently live link. Closed RSVP remains shareable with explicit closed status; publishing never opens RSVP implicitly.
- Native Share and WhatsApp sharing are user initiated. Unsupported browsers keep the Copy actions. Cancelling isn't reported as a failure or a success. The shared message contains the full absolute guest link. Only the destination the couple chooses receives the link: no shortener, QR, analytics or other third-party service does.
- The workspace presents only the guest link; no second "general" URL remains. Replacing the link refreshes every owner display. Metadata, logs and analytics never receive the secret through this feature.
- Homepage wording consistently describes one private guest link. Owner/guest browser checks cover these states at mobile/desktop widths, relevant isolation tests and `npm.cmd run check` pass, and independent review closes.

**Handoff (25 September 2026):** Done. Independent security review: **approve with fixes**, no Blocking findings; all five findings resolved.

- **Built.**
  - `src/features/workspace/guest-link-panel.tsx` is the one live panel, used by Publish and the Overview. It holds the absolute link, Live and RSVP badges, Open your site, the RSVP status, the "anyone with the link" warning, the editable message and Share / Share on WhatsApp / Copy message / Copy link.
  - `share-message.ts` (with tests) holds `shareMessage`, `withGuestLink` (re-adds the full link if it was edited out), `whatsAppHref` (safe for unpaired surrogates) and `rsvpShareStatus`.
  - `guestUrl()` in `guest-link.ts` builds the link. `workspace-data.ts` adds `currentGuestUrl` and `guestLinkShare`, which return the absolute link on `appOrigin()` (APP_ORIGIN, never the request Host) and return null unless the site is live.
  - `copy-link-button.tsx` copies the exact value and exports `copyText`.
  - Publish: the panel leads when live. The success notice sits in the panel, focus moves to its heading, and a later names save retires the notice. A draft shows the future link in a dashed box marked "Works once published".
  - Overview: the panel follows the figures. The "Copy RSVP link" and "Open live site" quick actions are removed.
  - RSVP: shows the same absolute link, with Copy link and Open RSVP page only while live. The button is renamed "Replace guest link". `rotateSharedRsvp` no longer returns the new URL; the refreshed pages show it.
  - Wording updated on the Guests empty state and the example FAQ. The homepage already matched after F043.
- **UX decisions.** Recorded in [site-ui.md: Guest link and sharing](overview/site-ui.md#guest-link-and-sharing-f042-25-september-2026). The docs also updated are `run-app-instructions.md` and `operations.md` (the APP_ORIGIN row).
- **Review findings and resolutions.**
  1. (Important) `openWorkspaceSection` did not wait for navigation, so the Publish checks ran against the Overview. The helper in `tests/helpers/workspace.ts` now waits for the section's URL and its `aria-current` link. The Publish checks in `dashboard.spec.ts` and `rsvp.spec.ts` also assert the "Share your site" heading. Re-inspected `publish-closed.png` and `replaced-publish.png`: both show the real Publish page, with the closed status and the new link respectively. No app change was needed.
  2. (Minor) Request Host: a new `dashboard.spec.ts` test signs in through `http://localhost:3100` while APP_ORIGIN is `http://127.0.0.1:3100`. On Overview, Publish and RSVP the displayed, message and copied link all use `127.0.0.1:3100`.
  3. (Minor) `whatsAppHref` replaced unpaired surrogates with U+FFFD before encoding. A unit test covers it.
  4. (Minor) Formatting slips in `guest-link.ts` and `workspace-icons.tsx` restored.
  5. (Minor) A later "Save link names" now retires the "published" notice. `publication.spec.ts` asserts it.
- **Checks after the last change (25 September).**
  - `npm.cmd run check` passed: lint, typecheck, Vitest 16 files/73 tests, build.
  - `npx.cmd vitest run src/features/workspace/share-message.test.ts` passed: 6 tests.
  - `npx.cmd playwright test tests/dashboard.spec.ts tests/rsvp.spec.ts tests/publication.spec.ts tests/payments.spec.ts` passed: 16 tests at desktop and mobile widths.
  - Because the navigation helper is shared, `npx.cmd playwright test tests/account.spec.ts tests/details.spec.ts tests/motion.spec.ts tests/rsvp-preview.spec.ts tests/themes.spec.ts` was also run: 22 passed.
  - `git diff --check` is clean.
- **Checks before the review fixes.** Full `npm.cmd run test:e2e` passed 84/84. `npm.cmd run test:integration` passed 6 files/21 tests; it was not re-run because the fixes touched no data code. `npm.cmd run test:monitoring` passed 2 tests. Screenshots were inspected at 390px and 1440px: Publish live, draft and RSVP-closed; Overview live and RSVP-closed; Publish after replacement. Expired and refunded states are asserted in `payments.spec.ts` and `dashboard.spec.ts`.
- **Not run.** The production-container `test:release` (it belongs to F041/F009). A real-device share sheet or WhatsApp: native Share is covered by a stubbed `navigator.share` for success, cancel and failure. The stale Docker development container on port 3000 was not rebuilt; the browser checks use their own server on port 3100.
- **Deviations.** An expired site's Publish page still shows the future link marked "Works once published" next to the "period ended" alert (F043 behaviour). QR codes are deferred as planned.
- **Next step.** F044.

## F043 - One secret guest URL for every wedding page

**Status:** Done (25 September 2026)
**Priority / lead:** P1, paid-launch gate / Software Engineer; independent security and database review required.
**Purpose:** Each wedding has one link that opens all three pages and accepts replies. Couples choose its readable names part freely, before or after paying, with no uniqueness check or reservation.
**Depends on:** F026, F031 (Done). Owner decision of 24 September; this replaces the earlier reservation design.
**References:** `src/app/[weddingSlug]/` (landing, details, rsvp, photo), `src/app/s/[shareSecret]/[weddingSlug]/rsvp/page.tsx`, `src/features/weddings/invitation-context.ts`, `published.ts`, `src/features/workspace/publication-form.tsx`, `publication-actions.ts`, `publication-validation.ts`, `rsvp-manager.tsx`, `src/proxy.ts`, `supabase/migrations/20260918000200_publication.sql` (slug uniqueness and lock), `20260923000200_shared_rsvp.sql` (secret), `docs/overview/architecture.md` (Routes and publication), `run-app-instructions.md` (route table), `src/features/marketing/home.tsx`, `tests/publication.spec.ts`, `tests/rsvp.spec.ts`, `tests/integration/`.
**Decisions:**

- **Routes and lookup.**
  - Guest routes become `/<names>/<secret>`, `/<names>/<secret>/details` and `/<names>/<secret>/rsvp`, with the photo under the same path.
  - Lookup is by secret only. `<names>` is decorative: when it differs from the saved value, redirect to the current one, so renaming never breaks a shared link.
  - A names part on its own (`/<names>`) is not a guest route and returns the generic 404.
- **The secret.** Keep each wedding's existing `rsvp_share_secret` unchanged: 43 URL-safe characters (256-bit), unique, created with the wedding and readable only by its owner. Never replace it with a short code (F015).
- **The names part.**
  - Suggested from the couple's names.
  - Editable at any time, before payment and after publishing.
  - There is no uniqueness check and no lock after publication. Drop the database unique constraint and the first-publication lock on this column.
  - Keep the existing format rules and reserved-names list (database check plus `publication-validation.ts`). Because the names part is now the first path segment, a reserved name would be routed to the application's own pages (for example `/account/<secret>` matches `/account/[screen]`).
  - Add `s`, `contact` and `refunds` to the list. Add a test that fails when any top-level `src/app` route is missing from it.
  - Before any new top-level route is added, check that no wedding already uses that name.
- **Remove name-based access.**
  - Remove the anonymous lookup-by-names functions (`published_wedding(slug)`, `published_wedding_details(slug)`, and the slug half of `shared_guest_rsvp`), so names alone never reveal a wedding.
  - Retire the `/<slug>` routes, the `/s/…` RSVP route, the `?share=` context, the public RSVP-entry page and its owner redirect. Update the `src/proxy.ts` matcher to the new routes.
  - No production customers exist, so old links need no redirects.
  - Give the development demo routes (`/demo` and variants), currently served by `[weddingSlug]`, their own development-only routes.
- **Before payment.** Publish shows the couple's future guest link, marked "works once published". Publishing still needs payment and explicit consent. Checkout, entitlement, expiry and £29 pricing are unchanged.
- **Replacing the link.** The existing "Replace shared link" now changes the URL of every page. Its warning must say that all previously shared links stop working, including Save the Date.
- **Marketing copy.** Update the homepage promise ("Your own wedding URL"), the FAQ ("anyone with your wedding URL…", "Your wedding URL stays the same") and the product-overview examples to describe one private guest link.
- **Headers.** Every guest page keeps noindex, private/no-store and no-referrer. The secret never appears in logs, analytics, canonical or Open Graph URLs.

**Done when:**

- All three pages and the photo are reachable only through a valid secret for a published, entitled wedding. Unknown or replaced secrets, unpublished and expired weddings all return the same non-revealing 404. No anonymous route or database function returns a wedding by names alone.
- Two weddings can use identical names parts; each link shows only its own wedding. An outdated or altered names part redirects to the current one without revealing anything more. Reserved names are rejected, and the test comparing the reserved list with the top-level routes passes.
- Couples can set and edit the names part before payment and after publishing. Format errors are styled, field-associated messages shown together with any consent error, with no browser pop-up masking another.
- Replacing the link invalidates the old URL for every page and the photo, and the warning says so.
- RSVP submission, capacity limits, closing dates, entitlement checks and owner isolation are unchanged. Existing publication, RSVP, isolation and payment tests are updated and pass. The migration applies cleanly to existing local data.
- `architecture.md`, the `run-app-instructions.md` route table and the marketing copy are updated. Browser checks run at mobile and desktop widths. `npm.cmd run check`, `npm.cmd run test:integration` and the affected Playwright suites pass, and independent security and database review closes.

**Handoff (25 September 2026):**

- **Built.** Guest routes `src/app/[names]/[secret]/` (page, `details`, `rsvp`, `photo`). `/[weddingSlug]`, `/s/…`, `?share=`, the public RSVP entry page and its owner redirect are removed. `src/features/weddings/guest-link.ts` holds the secret pattern, `reservedNames`, `guestHrefs` and `suggestedNames`, replacing `invitation-context.ts`. `published.ts` looks weddings up by secret only and redirects an outdated names part (307). Migration `20260925000100_secret_guest_urls.sql`:
  - drops `weddings_slug_key` and the first-publication lock;
  - reserves `s`, `contact`, `refunds`, `assets` and `fonts`, renaming any existing row;
  - drops `published_wedding(text)`, `published_wedding_details(text)`, `shared_guest_rsvp(text,text)` and `submit_shared_rsvp(text,text,text,boolean)`;
  - adds `guest_wedding(secret)`, `guest_wedding_details(secret)` and `submit_shared_rsvp(secret,name,attending)` with unchanged capacity, rate limits, close date and entitlement checks;
  - revokes `rotate_shared_rsvp_secret` from `anon`. The same statement was applied to the local database.
- **Publish and RSVP.** Publish shows the future guest link ("Works once published"). The names field can be edited before payment and after publishing, and names and consent errors appear together next to their fields. The replace-link warning says every earlier link, including the Save the Date, stops working. `/demo` and its variants have their own development-only routes. `src/proxy.ts` gives non-reserved two-segment paths private/no-store, no-referrer and noindex headers. `scrub.ts` hides the second segment of guest paths, after resolving repeated slashes and dot segments. The RSVP page passes its client component only the fields it renders. The homepage, product overview, site UI, tech stack, architecture, operations and `run-app-instructions.md` are updated.
- **Deviations.** `assets` and `fonts` are also reserved because they are top-level `public/` folders; the route test covers `public/`. The photo route serves by secret without redirecting an outdated names part, because pages always link the current one. The RSVP page stays reachable in its closed state when RSVP is off.
- **Independent review: approve with fixes, with no Blocking or Important findings.** Fixed:
  - (1) The RSVP page RSC payload carried `photo_path`. Now only rendered fields are passed; `publication.spec.ts` asserts that no guest page's HTML contains the wedding ID.
  - (2) Scrubber bypasses through `//` and `/./`. Now resolved before matching, and tested.
  - (5) Stale `[weddingSlug]` in `architecture.md` and `tech-stack.md`. Updated.
  - The `anon` execute grant on `rotate_shared_rsvp_secret` is also revoked.
- **Deferred to F054, with reasons recorded there.** Direct owner writes to `rsvp_share_secret` (pre-existing table-wide grant). Path-only access to published photos through `is_published_photo` (pre-existing). A 308 without private headers for `//` and trailing-slash variants (negligible: the requester already holds the secret). Local drift of `rotate_shared_rsvp_secret` (pre-existing; the owner decides on a reset).
- **Checks after the last change (25 September).**
  - `npm.cmd run check` passed: lint, typecheck, Vitest 15 files/67 tests, production build.
  - `npm.cmd run test:integration` passed: 6 files/21 tests.
  - `npm.cmd run test:e2e` passed: 84 tests at desktop and mobile widths.
  - `npm.cmd run test:monitoring` passed: 2 tests. Sentry payloads contain no secret, 20-character secret prefix or `?share=`.
  - A test-only change then added a 390px screenshot to `tests/rsvp.spec.ts`. Its re-run passed (4 tests), as did `npm.cmd run lint`.
  - The RSVP guest page was inspected at 390px and 1440px, and the Publish panel and guest pages at mobile and desktop widths.
- **Earlier checks.** `npx.cmd supabase migration up --local` applied cleanly to existing local data. `npm.cmd run smoke` passed against a local production build on port 3001, and an unknown guest link there returned 404 with private headers.
- **Not run.** The production-container `test:release` journey. A fresh `supabase db reset`, to preserve local data; the reviewer applied the migration from scratch to a throwaway Postgres 17 database with seeded clashing names, and it applied cleanly.
- **Environment note.** The Docker development container on port 3000 is stale (missing `@sentry/nextjs`, returns 500) and needs `docker compose up --build -d`. F043 did not cause this.
- **Next step.** F042.

## F044 - Make RSVP readiness and completion clear

**Status:** Done (25 September 2026)
**Priority / lead:** P1, paid-launch gate / Software Engineer with UX; independent review of guest data projection and access boundaries required.
**Purpose:** Couples know whether guests can reply, and guests know the deadline and what to do after replying.
**Depends on:** F043 (guest routes move); F026, F031 (Done).
**References:** Report B2/B4, sections 3.6 and 4; `rsvp-manager.tsx`, `rsvp-actions.ts`, `src/features/weddings/rsvp-page.tsx`, `save-the-date.tsx`, `published.ts`, `tests/rsvp.spec.ts`.
**Scope/decision:** Preserve RSVP off by default and the current UTC closing contract. Add explicit Publish/Overview readiness wording and correct the pre-publication link promise. Show the formatted closing date and timezone on the RSVP card when one is set, with an understandable owner explanation of the actual cutoff. Keep one named yes/no response per person (owner confirmed, 24 September); add one-reply-each guidance. After success replace all pre-submit instructions, offer Details only when visible and a deliberate Reply for someone else action. Add a themed RSVP action in the Save the Date page body while replies are open. Do not add notes, dietary fields, party size or calendar downloads.
**Done when:**

- Draft, disabled, open, closed-by-date and expired states give accurate messages before and after publishing; no absent-link instructions. Publish warns that guests cannot reply without silently enabling RSVP or forbidding intentional announcement-only publication.
- Guest/owner deadline copy matches database enforcement, including summer/winter dates and the exact UTC boundary; no date means no invented deadline. Only necessary public fields are projected, never the secret or responses.
- Success heading/body agree and are announced accessibly. Reply for someone else clears local name/answer state and starts a separate insert only on deliberate submission; it never grants edit/read access to a previous guest response.
- Guest CTA/Details links stay within the guest URL and disappear when unavailable; owner previews/examples cannot submit. Open/closed/success/validation cases work across all twelve themes at mobile/desktop widths. Relevant tests, `npm.cmd run check` and review pass.

**Handoff:** Added consistent RSVP readiness across Overview, Publish, RSVP settings and live guest-link panels; the guest deadline, one-reply guidance, clean success state and deliberate separate reply; and a Save the Date RSVP action. The database projects only the needed closing date and enforces the same UTC cutoff. Expired published sites now show their existing link as offline with purchase guidance. `npm.cmd run test:e2e -- --reporter=line` passed 88/88 after the initial stale dashboard assertion was corrected; after review copy fixes, `npx.cmd playwright test tests/rsvp.spec.ts tests/dashboard.spec.ts --grep "RSVP readiness|overview summarises" --reporter=line` passed 4/4. `npm.cmd run check` passed (lint, typecheck, 76 unit tests, production build), `npm.cmd run test:integration` passed 22/22, and `git diff --check` passed. Inspected Publish warning and guest success, closed and Save the Date screens at desktop/mobile widths; Playwright covered open, closed, disabled, validation and success across all twelve themes at both widths. Independent reviewer found two Important copy contradictions; both were fixed and re-reviewed with no remaining Blocking or Important findings. No hosted deployment, hosted CI, Safari/Firefox or real screen reader check. Blockers: None. Next: F045.

## F045 - Clear account confirmation and consistent auth errors

**Status:** Done (25 September 2026)
**Priority / lead:** P1, paid-launch gate / Software Engineer; independent auth review required.
**Purpose:** A new couple understands the next email step without submitting sign-up repeatedly.
**Depends on:** F002 (Done). F041 supplies real sender/support configuration and legal links separately.
**References:** Report B5 and 3.1; `src/features/account/auth-form.tsx`, `actions.ts`, `validation.ts`, `src/app/account/[screen]/page.tsx`, `tests/account.spec.ts`.
**Scope:** Replace successful sign-up with a clear inbox state, showing the submitted email snapshot and Change email/Sign in actions. Offer confirmation resend through the existing Supabase Auth flow with server/provider-enforced throttling and friendly retry messaging. Include an accessible Show/Hide password control. Apply the existing styled field errors to auth flows; preserve server validation and browser autofill.
**Done when:**

- Success removes the active Create account form and clears the password. Change email returns to an editable form. The displayed address is the submitted value, not later mutable input; no email/password is added to URL parameters or telemetry.
- Existing-account and new-account outcomes remain non-enumerating. Resend uses the approved callback origin, obeys backend rate limits, does not resend on render/reload, and handles expired confirmation, failure and retry safely. Copy does not claim email delivery or invent a production sender.
- Invalid email/password errors are styled, linked to fields, announced and focusable; password toggling preserves the value and announces state. Legal links come from F041, not placeholder policy text.
- Relevant account/recovery tests and `npm.cmd run check` pass; inspect mobile/desktop and keyboard use; independent auth review closes. Real inbox delivery remains F041/F049 evidence.

**Handoff:** Successful sign-up now shows the server-validated email in a dedicated inbox state, removes the password form, and offers Change email, Sign in and explicit confirmation resend. Expired signup links open an email-only resend form. Resend uses Supabase Auth with the configured callback origin and provider rate limits; its public response is identical for pending, confirmed and unknown addresses. Auth forms now have a password visibility control and focused, announced field errors. No secrets are placed in URLs or logs. `npm.cmd run check` passed (lint, typecheck, 76 unit tests, production build); with `E2E_BASE_URL=http://127.0.0.1:3000`, `npx.cmd playwright test tests/account.spec.ts --reporter=line` passed 6/6 desktop/mobile, including distinct Mailpit resend links, expired-link recovery, no automatic resend on reload, account-state non-enumeration, keyboard/error behavior and the owner journey. Inspected the inbox at 320px, mobile and desktop widths; no overflow. `git diff --check` passed. Independent auth reviewer closed both Important findings, with no Blocking or Important findings remaining. The local Docker app image was rebuilt after a stale dependency error and remains running; local Supabase data was not reset. Real production inbox delivery and hosted browser checks remain F041/F049. Blockers: None. Next: F046.

## F046 - Clear progress and save controls in the workspace

**Status:** Done (25 September 2026)
**Priority / lead:** P1, paid-launch gate / UX then Software Engineer.
**Purpose:** Couples can finish setup and understand what a save makes visible.
**Depends on:** F013, F017, F027 (Done).
**References:** Report B1, 3.2 and 3.5; `draft-form.tsx`, `validation.ts`, `details-form.tsx`, `details-actions.ts`, `photo-framing-editor.tsx`.
**Scope:** Fix the duplicated framing label; distinguish a missing date from an invalid date and warn non-destructively about past dates. After first save offer Next: choose your style. Place the explicit Details visibility control/status by the save action and retain the existing accurate success message. Make that save action reachable on phones with one sticky save area, using the existing atomic form submission. Keep flexible text times and add examples. Do not auto-publish Details, add autosave/per-group persistence or change date eligibility.
**Done when:**

- Empty/invalid/past dates give distinct, accurate guidance; first-save navigation occurs only after successful persistence and retains the success state. Editing existing Basics does not repeatedly force onboarding.
- Photo buttons use unambiguous labels. Details save/hidden/live status is clear before and after submission; existing stored visibility is preserved unless explicitly changed.
- At 320px, mobile with the keyboard open, and desktop, the sticky action does not cover fields, errors or focus targets. Failed saves retain all entered values and errors; successful saves use the existing single submission and server ownership enforcement.
- Targeted workspace/form E2E checks and `npm.cmd run check` pass; inspect keyboard and mobile/desktop layouts. No separate independent review unless implementation changes data/security architecture.

**Handoff:** Basics now distinguishes missing and invalid dates, gives a nonblocking past-date note, and offers Design only after a successful first save. Details places its saved visibility and single show/hide control with the save action; phones keep that action at the bottom, with a short-viewport flow fallback. Time examples and photo-framing button labels are clearer. No schema, ownership or security architecture changed. UX decisions are in `docs/overview/site-ui.md`; targeted browser coverage is in `tests/dashboard.spec.ts` and `tests/details.spec.ts`. `npm.cmd run check` passed (lint, typecheck, 77 unit tests, production build); with `E2E_BASE_URL=http://127.0.0.1:3000`, `npx.cmd playwright test tests/dashboard.spec.ts tests/details.spec.ts --grep 'Basics explains|owner edits and previews Details' --reporter=line` passed 4/4 desktop/mobile. Inspected Basics and Details screenshots at mobile/desktop, including 320px and a 320×500 short viewport; no horizontal overflow or covered focused field in those checks. The development app was recreated after stale Next.js CSS output and remains running. No independent review was required. Real on-screen keyboard and device/browser checks remain F049. Blockers: None. Next: F047.

## F047 - Distinguishable pages and safe site identity

**Status:** In Progress
**Priority / lead:** P1, paid-launch gate / Software Engineer; independent metadata/privacy review required.
**Purpose:** Browser tabs and shared links identify the right page without exposing private data.
**Depends on:** F043 (guest routes move); F008, F031, F035 (Done).
**References:** Report B6 and sections 4–5; `src/app/layout.tsx`, account/example/wedding/preview routes, `src/app/not-found.tsx`, `src/features/marketing/metadata.ts`.
**Scope/decision:** Give account screens, owner previews, wedding page types and each fictional theme example distinct titles; preserve existing workspace titles. On a valid guest URL for a published wedding, titles may use the couple's names, which the link holder can already see. Invalid, replaced, unpublished and expired links use generic titles. Add a local brand favicon/app icon and useful home/sign-in recovery links to 404. Never put the secret in canonical, Open Graph or image URLs.

Add a link-preview card for valid guest URLs of published weddings (owner approved, 24 September):

- `og:title` is the couple's names with "Save the Date", and `og:description` is the wedding date.
- The image is a static, pre-made card per theme, with no names, photo or secret in it or its URL.
- Omit `og:url` and the canonical link.
- Never show the couple's photo or location.
- Invalid, replaced, unpublished and expired links get generic metadata.
- Messaging apps may keep a preview after a site is unpublished; the Publish wording must not promise otherwise.

**Done when:**

- Tabs distinguish Save the Date, Details, RSVP, auth modes and example themes. Protected/unavailable pages disclose no couple/draft information through head tags; no metadata lookup bypasses publication, entitlement or ownership checks.
- Private routes remain noindex, private/no-store as applicable and out of sitemaps. No per-wedding image endpoint, canonical URL containing the secret or third-party image fetch is introduced. A manual check confirms that a WhatsApp preview, and one preview fetched by an app's servers (for example Slack), show only the names, date and theme card. Homepage marketing metadata is preserved.
- The favicon works on normal/error/account/wedding pages. A 404 provides usable recovery without confirming whether a hidden wedding exists.
- Rendered-head assertions cover valid, invalid and replaced secrets, and expired and draft cases. Mobile/desktop 404 inspection, `npm.cmd run check` and independent privacy review pass.

**Handoff (25 September 2026):** Distinct account, owner-preview, example-theme and guest-page titles are implemented. Valid guest heads use only the public secret-gated names/date and a fixed theme card; hidden/unavailable cases have generic metadata. Twelve original static 1200×630 cards and local favicon/app icons are in `public/`; provenance is in `public/assets/share/README.md`. The 404 offers home and sign-in recovery without identifying a wedding. Publish copy warns that messaging apps may retain an earlier preview. `guestWedding` and the enabled-Details projection are request-cached so metadata and page rendering share the same gated lookup. The new metadata suite is included in `test:release`. See `src/features/weddings/guest-metadata.ts`, route pages and `docs/overview/architecture.md`.

- `npx.cmd playwright test tests/metadata.spec.ts tests/rsvp-preview.spec.ts --reporter=line` passed 6/6 desktop/mobile. Rendered-head checks cover valid Save the Date, Details and RSVP; draft, unpublished, expired, disabled Details, invalid and replaced links; card response, favicon, auth/example/preview titles, private headers and 404 recovery. The development server emitted `no-cache, must-revalidate`, which existing tests accept; the production proxy policy is `private, no-store`. Inspected 404 screenshots at 390px/mobile and 1440px/desktop with no overflow, and a representative theme card. `npm.cmd run check` passed: lint, typecheck, 77 unit tests and production build. `git diff --check` passed.
- Independent reviewer found no Blocking or Important code issue and confirmed all twelve cards are 1200×630 JPEGs without EXIF data. No deployment or hosted/production-container browser check was run.
- **Remaining acceptance check:** on a reachable staging URL, manually share a disposable published wedding link in WhatsApp and one app that fetches previews server-side (for example Slack); confirm names, date and static theme card only, and confirm an unavailable link gives generic metadata. Record the result here. Staging access is being prepared in F041. Do not mark F047 Done until this is verified. Next: perform that check when staging exists; eligible launch work may continue while it waits.

## F048 - Deliver the approved customer data lifecycle

**Status:** Planned (owner policy decisions outstanding)
**Priority / lead:** P1, paid-launch gate / Product Manager with owner, then Software Engineer; independent security/database review required.
**Purpose:** Deliver and verify the export, deletion and retention process already required by F009.
**Depends on:** Existing owner/response/storage/payment features (Done); decisions in `release-inputs.md` section 5. Hosted restore evidence stays in F009.
**References:** Report 3.8/6.1; `docs/operations.md` Recovery and data handling, `docs/release-inputs.md`, `src/features/workspace/guest-responses.tsx`, `supabase/migrations/`.
**Before Ready:** Owner approves scope, delivery/identity checks, retention by data category, payment-record exceptions, backup/log treatment and whether the process is self-service or support-assisted. Record the policy in release inputs; do not infer legal periods or treat a catering CSV as a complete data-rights export.
**Done when:**

- The approved process exports only the verified owner's agreed content, photos and response data; it excludes credentials, bearer secrets and other tenants. Any CSV neutralises spreadsheet formula injection and correctly quotes names/newlines; download/access lifetime follows policy.
- Deletion/expiry handling covers Auth, wedding/details, shared secrets/responses, original/current/orphaned Storage objects, payment/event records, logs and backups according to the approved exceptions. Publication and sessions cease when required; expiry alone is not described as deletion.
- Failure and retry tests cover partial database/Storage deletion, repeat requests and retained ledger consistency. Recovery instructions reapply deletions after restore without resurrecting access or revoked entitlements.
- An end-to-end fictional customer export/deletion test, cross-owner denial checks, relevant integration tests, `npm.cmd run check` and independent review pass. Documentation states who executes the process and how completion is evidenced; F009 verifies its hosted operation and restore implications.

## F049 - Verify the launch journey on real devices and assistive technology

**Status:** Planned (requires completed launch changes and managed staging access)
**Priority / lead:** P1, paid-launch gate / Reviewer with UX and Software Engineer.
**Purpose:** Close the walkthrough's browser/accessibility evidence gaps before charging customers.
**Depends on:** F038, F040-F048 and staging readiness in F041; no dependency on production deployment or F009 completion.
**References:** Report limitations, 3.8, 5 and 6; `docs/operations.md` Verification and promotion, `run-app-instructions.md`, `tests/`.
**Scope:** Record a compact evidence matrix in F009's handoff or a linked test report: device/OS/browser/assistive technology, build digest, journey/state, result and finding. Automated desktop WebKit/emulation is supplementary, not a substitute for an actual iPhone Safari pass. No unsupported claim about the audience's device mix is needed.
**Done when:**

- On an actual iPhone/Safari and desktop Firefox, a disposable account completes confirmation/recovery, setup/date entry, photo upload from Photos, framing, Checkout in Stripe test mode, publish, share/copy, guest navigation/RSVP and owner response review. Also check 320px/390px/desktop layout, zoom, long content and error/closed/unpublished states. Record device access as a blocker if unavailable.
- Verify keyboard-only navigation and a real screen reader through signup, workspace, publish, guest form/errors/success. Measure text/control contrast in all twelve themes, specifically Evening Gold; inspect focus visibility, logical order, status announcements and touch targets including Correct or remove.
- Exercise the local production-container suite using documented local commands. Hosted staging checks use the manual disposable-data procedure; never point destructive local fixture suites at managed staging/production. Verify real inbox delivery and hosted Stripe test Checkout/refund/webhook behavior separately from fixture results.
- All Blocking/Important findings are fixed and retested before sign-off, with minor deferrals justified. Record exact commands/results, screenshots or evidence locations and anything untested. Independent release review and production smoke remain F009; this ticket does not approve a deployment.

## F050 - Browse themes and examples comfortably on phones

**Status:** Deferred
**Priority / lead:** P2, post-launch / UX then Software Engineer.
**Purpose:** Compare designs visually and see all three guest page types before choosing.
**Depends on:** F035 (Done); schedule after launch.
**References:** Report 3.4/5; `preview-toolbar.tsx`, `src/app/dashboard/(workspace)/design/page.tsx`, `src/app/examples/[theme]/`, `src/features/marketing/phone-preview.tsx`.
**Scope when promoted:** Reuse the existing thumbnail assets and named controls for visual browsing; compact mobile preview/example headers while retaining saved-vs-candidate state, explicit Apply, keyboard access and all twelve themes. Add a clearly fictional, non-submitting RSVP example and previous/next navigation across example pages. Do not add another picker implementation or stored theme-review checklist flag.
**Done when promoted:** UX confirms the compact layout against current screens; all three page examples and theme navigation work at mobile/desktop widths, previews cannot create responses or mutate themes, and relevant visual/accessibility checks and `npm.cmd run check` pass. No implementation authorised by this Deferred entry.

## F051 - Full SEO audit and search-visibility report

**Status:** In Progress (report and triage done 25 September 2026; waits for the owner's keyword-volume input, see handoff)
**Priority / lead:** P2 / SEO & Growth, with the Software Engineer for technical checks. Report only; no application changes.
**Purpose:** Find out what stops SaveTheDates appearing in Google for the searches UK and Irish couples make, and produce a prioritised fix list.
**Depends on:** None to start. Checks that need the live domain wait for F041/F009: Search Console, real indexing, and field Core Web Vitals.
**References:** `.agents/seo-growth.md` (Launch Review checklist), F008, `src/app/page.tsx`, `src/features/marketing/`, `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/examples/`, F041 step 7, F039, F043 (new guest routes).
**Scope:**

- **Technical.**
  - Crawling and indexing: indexable pages, robots rules, sitemap, canonical URLs.
  - Page content: titles, meta descriptions, headings and semantic HTML, image alt text and sizes, Open Graph.
  - Structured data: for example organisation, price and FAQ. Check Google's current eligibility rules rather than assuming them.
  - Links and performance: internal links, mobile usability, and Core Web Vitals (lab figures now, field data after launch).
  - Confirm that no wedding, owner or account page can be indexed, including F043's new guest routes.
- **Keywords and intent.** Research what UK and Irish couples search for, such as "wedding website", "digital save the date", "online RSVP" and "wedding website builder UK". Record volume and difficulty, and who ranks today. Name the tool and the date for every figure; invent nothing.
- **Content and structure.**
  - Is one indexed homepage enough?
  - Should the fictional theme examples become indexable template pages?
  - Would focused pages or guides (for example digital save the dates, online RSVP) earn traffic without being thin or duplicated?
- **Competitors.** Which services rank for the main searches, and what their pages offer. Do not copy their content.
- **Links from other sites.** Sensible sources such as wedding directories, venue and supplier partnerships, and UK/Irish wedding blogs. Suggestions only.
- **After launch.** What to watch in Search Console each month (setup is already F041 step 7).

**Output:** `docs/reports/<date>-seo-audit.md`. It records findings with evidence, severity and effort, then a prioritised action list split into before launch, first three months, and later.
**Rules:**

- Customer wedding pages stay noindex.
- No low-value programmatic pages.
- No claims the product can't back up.
- No application or content changes in this ticket.

**Done when:**

- The report checks every Launch Review item in `seo-growth.md`, with evidence (tools, commands, URLs, dates). Anything that can't be checked before the live domain is listed with when it will be.
- It includes a sourced, dated keyword list, a competitor summary, and recommendations ranked by expected benefit and effort.
- Its technical checklist is reusable as F009's existing "SEO launch checks" step. The broader recommendations don't gate launch unless the owner says so.
- The Product Manager's triage is recorded in the backlog: accepted items become tickets, and rejected items are recorded with the reason.

**Handoff (25 September 2026):**

- **What exists.** The report is [`docs/reports/2026-09-25-seo-audit.md`](reports/2026-09-25-seo-audit.md). It contains:
  - the Launch Review checklist, with local results and the recheck on the live domain (reusable for F009's SEO launch checks);
  - ten findings;
  - keyword intent and who ranks today, a competitor summary, and content, link and Search Console guidance;
  - a prioritised action list;
  - a "Not checked" table.
  - No application code changed.
- **Checks.** Run against production image `save-the-dates:f051`, on port 3001 with local Supabase:
  - `curl` of robots, sitemap, rendered heads and headers for eleven routes. Indexing boundaries all pass.
  - Lighthouse 12.8.2 (Playwright Chromium): mobile ×3 gave performance 92/93/93, LCP 3.3/3.2/3.2 s, CLS 0. Desktop gave 100. SEO, accessibility and best practice scored 100 in both.
  - Web search and page fetches on 25 September 2026. The search tool is US-located.
- **Not done.**
  - The Done-when's "sourced, dated keyword list" is only partial. No volume or difficulty figures exist because no keyword tool was available, and none were invented.
  - Live-domain checks wait for F041/F009.
- **Product Manager triage.**
  - Accepted:
    - F058: structured data, `lang`, brand-link label, preview image `sizes`.
    - F053 takes the homepage wording findings 2, 4 and 5, so copy changes once.
    - F009 uses the checklist.
    - F041 update 3 adds the footer legal links.
  - Owner decides: a digital save the date page; a "when to send save the dates" guide; editorial outreach; Keyword Planner access.
  - Deferred until data exists: mobile LCP and static-homepage work (findings 7 and 9), and a themes gallery page.
  - Rejected:
    - FAQ markup: no rich result for commercial sites.
    - `Product` markup: eligibility for a service is unclear.
    - Indexable theme examples: thin, near-duplicate fictional pages.
    - Targeting "free wedding website": does not match a £29 product.
    - Town or venue pages and competitor-comparison pages: thin, or risky claims.
- **Blocker.** Owner input: either record Keyword Planner volumes for the UK and Ireland in the report's keyword table, or accept the gap and use Search Console after launch. Once either is recorded, F051 can be marked Done.

## F058 - Homepage search basics and mobile speed

**Status:** Done (25 September 2026)
**Priority / lead:** P2, before launch / Software Engineer. The owner asked on 25 September 2026 to improve mobile speed, especially Google's 2.5 s LCP target.
**Purpose:** Small technical fixes from F051 that help Google identify the site and keep the homepage light.
**Depends on:** None. Homepage wording is F059.
**References:** [SEO audit](reports/2026-09-25-seo-audit.md) findings 3, 6, 7, 8 and 10; `src/app/page.tsx`, `src/app/layout.tsx`, `src/features/marketing/metadata.ts`, `home.tsx`, `phone-preview.tsx`, `tests/marketing.spec.ts`.
**Scope:**

- Homepage JSON-LD only:
  - `WebSite` with `name: "SaveTheDates"` and `url` from `marketingOrigin()`;
  - `Organization` with `name`, `url` and `logo` (`/icon-512.png`).
  - No contact details until approved in release-inputs. No FAQ or Product markup.
- `<html lang="en-GB">`.
- The brand link's accessible name includes its visible text.
- Tighten the theme preview `sizes` to their displayed widths.
- Added at the owner's request: bring mobile lab LCP under 2.5 s without changing the design.

**Done when:**

- The homepage JSON-LD is valid, and a test checks it and its absence elsewhere.
- Lighthouse reports no `label-content-name-mismatch`, and the image-size saving shrinks.
- The mobile and desktop homepage look unchanged.
- `npm.cmd run check` and `tests/marketing.spec.ts` pass.

**Handoff (25 September 2026):**

- **What exists.**
  - The homepage JSON-LD (`homeStructuredData` in `metadata.ts`, `JsonLd` in `chrome.tsx`).
  - `lang="en-GB"`.
  - The brand link's tagline is `aria-hidden` and the link has no `aria-label`.
  - Speed:
    - Per-use `sizes`, and the previews use `getImageProps` with a plain `<img>`, so the homepage ships no Image client component.
    - Theme cards use `content-visibility: auto`.
    - `globals.css` is split into `site.css` (root layout) and `app.css` (app routes), so the homepage stylesheet fell from 113 KB to 42 KB. The cascade reasoning is in `architecture.md`.
    - Sentry configuration and the SDK start after the first paint (or at most 4 s after the script runs), and the scrubber loads with the SDK.
- **Lab results.** Lighthouse 12.8.2 mobile, production image, median of three runs. The full table is in the audit report's follow-up.
  - HTTP/1.1: performance 92 → 97 and LCP 3.3 s → 2.5–2.6 s.
  - HTTPS + HTTP/2 (Caddy proxy, closest to Render): 99–100, LCP 1.81–1.96 s. Before the change it was 97–100, LCP 1.93 s.
  - Page weight 432 → 253 KB. Desktop 100.
  - SEO, accessibility and best practice 100. `label-content-name-mismatch` is not applicable.
- **Checks.**
  - `npm.cmd run check` passed: lint, typecheck, 85 unit tests, build.
  - `npm run test:monitoring` passed 2/2.
  - Full `E2E_PRODUCTION=1` Playwright against the production image on port 3000: 85 passed, 20 skipped, 1 failed.
    - The failure was `tests/guests.spec.ts` on mobile, where sign-in stayed on "Please wait…" under load.
    - With `--repeat-each=4` it fails 1 in 4 on both the new image and the pre-change image (`save-the-dates:f051`, at a different step), so it predates this work.
  - After the review fixes, `npm run smoke` passed. The marketing, metadata, monitoring-off, account, RSVP-preview and theme-design suites passed 36/36 on the final image.
  - Inspected screenshots at 390 px and 1440 px: homepage, digital save the date page, sign-in, Velvet example, 404, dashboard overview, design, preview, and the homepage after dashboard navigation.
  - Note: full-page screenshots leave off-screen theme cards blank because of `content-visibility`. When scrolled to, all twelve render (checked).
- **Review.**
  - The independent reviewer found no Blocking or Important issues.
  - Minors fixed: a 4 s monitoring fallback from script start, the reserved-name comment plus a unit test that the migration list equals `reservedNames`, publish wording that now mentions payment, and the documented label-rule exception.
  - Noted, not fixed: 404s from `notFound()` inside nested routes send no stylesheet link in the server HTML (React adds it on load). This predates the work.
- **Observed once.** In a long-running local container, one optimised image (`black-tie.webp`, `w=256`) hung while others worked. A fresh container served it in 0.1 s, and it was not reproduced. Watch for hanging `/_next/image` requests during the F041 staging checks.
- **Next.** After launch, run PageSpeed Insights on `https://savethedates.co.uk` (F009 SEO launch checks), then use Search Console's Core Web Vitals report once there is traffic.

## F059 - Digital save the date page and search wording

**Status:** Done (25 September 2026)
**Priority / lead:** P2 / SEO & Growth, UX (reusing documented patterns), Software Engineer. The owner approved on 25 September 2026: "Please proceed with SEO improvements. I want you to handle it."
**Purpose:** Target the searches where SaveTheDates is genuinely different (audit findings 2, 4 and 5, and the first content recommendation) without inventing claims.
**Depends on:** F051 report.
**Scope:**

- Homepage wording: title and description; hero, theme and step lines; descriptive H2s; seven FAQs, including "What is a digital save the date?", "When should we send our save the dates?" and "What happens after the wedding?".
- An indexable `/digital-save-the-date` page, added to the sitemap, the proxy auth refresh and `reservedNames` plus migration `20260925000300_reserve_digital_save_the_date.sql`.
- A footer link and an FAQ link from the homepage.
- A shared marketing header, footer and pricing (`chrome.tsx`).
- No competitor names, refund, retention or preview-card promises.

**Done when:**

- Both pages are indexable with a correct canonical and `og:url`, and are the only sitemap entries.
- Guest, example and account routes stay `noindex`.
- Claims match built features.
- A names part can't collide with the new route.
- Mobile and desktop layouts are free of overflow at 320–1440 px.
- `npm.cmd run check`, marketing tests and independent review pass.

**Handoff (25 September 2026):**

- Built as scoped; `site-ui.md` records the page structure.
- The migration was applied locally with `npx supabase migration up --local`. It renames an existing names part `digital-save-the-date` to `digital-save-the-date-wedding`. It must be applied on staging and production with the other migrations (operations.md).
- A new Playwright test covers:
  - footer navigation, the title and H1;
  - `index, follow` with no `X-Robots-Tag`;
  - the canonical URL and `og:url`;
  - the CTAs and `/#themes`;
  - the FAQ;
  - 320–1440 px overflow;
  - the homepage FAQ link.
- The metadata test covers the new title, two sitemap entries, and JSON-LD on the homepage only.
- Checks and review: shared with F058, above. The reviewer checked each marketing claim against the code.
- **Next:**
  - F053 should review the current homepage copy, not the audit-time copy.
  - Add the "when to send save the dates" guide only if Search Console shows demand.

## F052 - Cost-effective advertising strategy report

**Status:** Ready
**Priority / lead:** P2 / Product Manager with SEO & Growth input; the owner decides. Report only.
**Purpose:** A realistic, low-cost promotion plan showing which channels can win a customer for less than a sale is worth.
**Depends on:** None to research. It is best done after F053, so the recommendations point at a homepage that converts. Actually running ads needs launch (F009) and a way to measure results (F039 or an approved alternative).
**References:** `docs/overview/product-overview.md`, `docs/release-inputs.md` (price, business identity), F039, F053.
**Scope:**

- **Unit economics first.**
  - Work out the most we can pay to win one customer. Start from £29 per sale, minus Stripe fees and a share of running costs, using current fees with sources.
  - Show break-even cost per click and per sale at a few realistic conversion rates.
- **Channels to compare.**
  - Paid: Google Search Ads (high-intent searches), Meta (Instagram and Facebook, including whatever audience options exist today for engaged couples), TikTok and Pinterest.
  - Low-cost or free: wedding forums and Facebook groups; venue, photographer and planner partnerships; wedding fairs; creator partnerships; our own social content.
  - Referral: for example a subtle "Made with SaveTheDates" credit on guest pages, since each wedding reaches its whole guest list. Whether to add it is the owner's decision; guest pages stay noindex either way.
- **For each channel:**
  - likely cost range (sourced and dated, and labelled as estimates);
  - targeting options;
  - creative needed;
  - time to results;
  - effort for a one-person business;
  - risks.
- **A starter test plan.**
  - Two or three small fixed monthly budgets (for example £100, £250 and £500), using one or two channels.
  - What to measure, and clear rules for when to stop or continue.
- **Tracking and privacy.**
  - Ad platform pixels usually set cookies, which need consent under UK PECR. F039's analytics are cookieless.
  - Recommend how to measure results, for example tagged links plus server-side purchase events.
  - Say what consent banner would be needed if pixels were used. No decision is made in this ticket.
- **Compliance.** The UK advertising code (ASA/CAP) requires true, substantiated claims, and Irish rules should be checked too. No fake reviews or testimonials.
- **Timing.** Engagement season (for example Christmas to Valentine's Day) and when couples usually send save the dates.

**Output:** `docs/reports/<date>-advertising-strategy.md`, with a recommended plan and budget options.
**Rules:**

- Create no accounts, spend nothing and publish no ads; all of those need the owner.
- Every cost cites a source and date or is labelled as an assumption.

**Done when:** the report covers unit economics, the channel comparison, a recommended starter plan with budgets and success measures, tracking and consent requirements, compliance notes, and sources. The owner has decided what to try, and the Product Manager has turned accepted items (for example landing pages, tracking or a referral credit) into tickets.

## F053 - Homepage effectiveness review report

**Status:** Ready
**Priority / lead:** P2, recommended before launch and before any advertising / UX/UI Designer with SEO & Growth. Report only.
**Purpose:** Establish whether the homepage quickly shows couples what they get, why it's worth £29 and how to start, and how to make it more attractive, easier to follow and more attention-grabbing.
**Depends on:** None. Check its wording against the planned one-guest-link model (F042/F043), so recommendations match the product being launched.
**References:** `src/app/page.tsx`, `src/features/marketing/home.tsx`, `marketing.css`, `phone-preview.tsx`, `docs/overview/site-ui.md`, `docs/ux/site-ui-design.png`, [walkthrough report](reports/2026-09-24-ux-walkthrough-and-launch-readiness.md) section 5, F032, F050.
**Scope:** Review at 390px and 1440px.

- **First impression (five-second test).** Is it clear what this is, who it's for, what it costs and what to do next?
- **Features and what you get.** Are all of these clearly shown and easy to understand?
  - the three pages (Save the Date, Details, RSVP);
  - twelve themes and the private guest link;
  - the response list;
  - the one-off £29 price and how long the site stays online.

  Is anything missing, such as showing the Details and RSVP pages rather than only Save the Date, what guests experience, or the couple's dashboard?
- **Structure and flow.** Section order, scannability, length, repetition, and where the calls to action sit and what they say. Check whether the FAQ answers the likely objections: privacy, who can see the site, making changes, what happens after the wedding, and refunds.
- **Visual appeal and attention.** The hero's impact, imagery, hierarchy, contrast, and motion (coordinate with F032).
- **Trust.** What reassures couples without fake reviews: real examples, clear pricing, a support contact, and the legal pages from F041.
- **Basics.** Mobile usability, accessibility and how quickly the page feels.
- **Competitors.** Compare three to five competitor homepages: what they lead with and how they explain value. Do not copy them.
- **Optional audience feedback.** Short feedback from three to five people in the target audience, arranged by the owner. Record the questions and answers.

**Output:** `docs/reports/<date>-homepage-review.md`. It includes screenshots, findings by severity, and ranked recommendations with suggested copy and layout clearly marked as proposals. It also lists anything needing an owner decision.
**Rules:**

- Report only.
- No claims about features that aren't built.
- Recommendations fit the approved visual direction in `site-ui.md`.

**Done when:** the report covers every area above, with recommendations ranked by impact and effort. The Product Manager's triage is recorded, and accepted changes become an implementation ticket.

## F054 - Full security review before paid launch

**Status:** Planned (runs against the launch candidate once F038, F040 and F042-F048 are implemented and staging exists in F041; code-only areas can start earlier)
**Priority / lead:** P1, paid-launch gate / Reviewer (independent of whoever built the features), with the Software Engineer fixing findings. The owner decides on any external penetration test.
**Purpose:** Confirm, with evidence, that customer and guest data can't leak or be reached by the wrong person before we take money. Fix anything serious first.
**Depends on:** F043 (guest link model), F047 (metadata), F048 (deletion/export) and F038 (logging) in their final form; staging from F041.
**References:** `AGENTS.md` (engineering guardrails), `docs/overview/architecture.md`, `docs/operations.md`, `supabase/migrations/`, `src/lib/supabase/`, `src/proxy.ts`, `src/app/api/stripe/webhook/route.ts`, `src/features/`, `tests/integration/`, `.github/workflows/ci.yml`, `Dockerfile`.
**Scope:**

- **Data map and threats.** List every kind of personal data: the owner's email, the couple's names, date, location, photo and details, guest names and replies, and payment references. Record where each is stored, who can read it, and what an attacker would want.
- **Access control.**
  - Row-level security on every table, and database functions that bypass it (for example checking they set their search path).
  - Storage bucket rules.
  - Anonymous functions return only the intended fields.
  - Every server action checks ownership, and IDs sent from the browser are never trusted.
  - The service-role key is used only on the server.
  - Cross-owner and anonymous denial is tested for every table, function and photo.
- **The guest link secret (F043).**
  - How it's generated and compared.
  - No leakage through Referer headers, logs, analytics, error pages, redirects, preview metadata or cached responses.
  - Replacing the link really invalidates every page and the photo.
  - Rate limits make guessing links, spamming RSVPs and repeated form submissions impractical.
  - Deferred from the F043 review (25 September), check each specifically:
    - Owners can write `rsvp_share_secret` directly through the table-wide `grant update` (`20260918000100_private_weddings.sql:14`). Replace it with per-column insert/update grants that exclude the secret.
    - The `is_published_photo` storage policy lets anyone holding a published photo's storage path download it without the secret or an active payment. Consider requiring active entitlement or secret-scoped access.
    - `//<names>/<secret>` and trailing-slash variants get a Next.js 308 without private/no-store/noindex headers. Negligible, because the requester already holds the secret.
    - The local database has drifted from the migration files for `rotate_shared_rsvp_secret` (`search_path = extensions` locally, `''` in the file); this predates F043. `supabase db reset` would fix it but wipes local data, so the owner decides.
- **Accounts.**
  - Supabase Auth settings: email confirmation, password rules, leaked-password protection if the plan offers it, rate limits and link expiry.
  - Session cookie flags, and sign-out.
  - Account enumeration, the recovery flow, and redirect allow-lists (no open redirects).
- **User input.**
  - Cross-site scripting through names, messages, Details text and FAQs.
  - Dangerous link types such as `javascript:` in directions and travel links.
  - Spreadsheet formula injection in any CSV export (F048).
  - Photo uploads: real type checking, size and pixel limits, no SVG, and metadata removed, especially GPS location.
- **Payments.** Webhook signature checks, idempotency, the server-set price, and entitlement revoked on refund or dispute.
- **HTTP headers and caching.**
  - A Content Security Policy (there is none today), HSTS, and framing protection against clickjacking.
  - Referrer and permissions policies.
  - No-store on private pages, with nothing private cached by the host or a CDN.
- **Secrets and environments.**
  - No secrets in the Git history or images. `.env` files are ignored.
  - Least-privilege CI and host tokens.
  - Staging is password-protected and separate from production.
- **Dependencies.**
  - `npm audit` and a dependency scanner, a pinned lockfile, and an up-to-date Docker base image.
  - GitHub Actions pinned.
  - A recommendation for automated dependency updates.
- **Monitoring and logs.** F038's scrubber keeps personal data and secrets out of Sentry and the logs. Unusual activity (for example spikes in failed sign-ins or RSVPs) can be noticed.
- **Data lifecycle.** F048's deletion really removes database rows and Storage objects, backups and expiry behave as documented, and nothing is resurrected after a restore.
- **Other services.** Record what data goes to Supabase, Stripe, Resend, Sentry, PostHog (if used) and Render. The contract and legal review stays with F041/F048.
- **Incident response.** `operations.md` has a short breach runbook: who to contact, how to contain a leak, rotating keys and guest links, and the UK GDPR duty to consider reporting to the ICO within 72 hours.

**Method:**

- Code and configuration review, plus automated tools: dependency audit, a secret scanner over the full Git history, a security-header check, and Supabase's security advisor.
- Manual attempts to break access boundaries, locally and on staging, using disposable fictional accounts only.
- Never test against production data, and never probe third-party providers beyond our own configuration.

**Output:** `docs/reports/<date>-security-review.md`.

- Scope, method and tool versions.
- Findings rated Critical, High, Medium or Low, each with evidence, reproduction steps (without real secrets) and the recommended fix.
- Retest results.
- A reusable checklist for future releases.
- A recommendation on whether an external penetration test is worth it before or after launch, with a rough cost. The owner decides.

**Done when:**

- The review is done by someone other than the implementer, and every area above is covered or explicitly marked not applicable with a reason.
- All Critical and High findings are fixed and retested before paid launch. Medium findings have an owner-accepted plan with dates. Low findings are recorded.
- Added regression tests cover every fixed access-control or leakage issue, and `npm.cmd run check` and `npm.cmd run test:integration` pass.
- The breach runbook exists in `operations.md`. F009's release review references this report.

## F055 - Sign in with Google

**Status:** In Progress for production (owner decision, 25 September 2026: Google sign-in is wanted at launch). On staging it's switched on, and the owner confirmed it works. The production client, Supabase provider and `AUTH_GOOGLE_ENABLED` are part of the production setup. The consent screen still needs publishing, and brand verification needs the production domain.
**Priority / lead:** P2, post-launch / Software Engineer; independent auth review done.

**To finish (owner provides):**

1. **A Google Cloud project with OAuth clients per environment**, created by following F041 step 2 → "Google sign-in". Staging is done (see below); production still needs its own client. Paste each client ID and secret into that environment's Supabase **Sign in / Providers → Google**, never into Git or docs.
2. **A consent-screen choice:**
   - brand verification, which is free and shows "SaveTheDates" — needs Homepage and Privacy Policy URLs, which don't exist yet;
   - a Supabase custom domain, which is a paid add-on;
   - or stay in Testing mode / accept "continue to `<project-ref>.supabase.co`" (current staging state).
3. **Supabase settings per environment:** the redirect URL `APP_ORIGIN/auth/callback` (F041 step 2), and `AUTH_GOOGLE_ENABLED=true` on the Render service. Done on staging.
4. **A privacy notice that mentions Google sign-in** (wording requirement in `release-inputs.md` section 3). Drafted at `/privacy` (26 September 2026) and reachable on staging without the password; awaits owner approval. The consent screen's Homepage/Privacy/Terms URLs point at staging for now and must move to `https://savethedates.co.uk/…` for the production client (see F041, "To update later").
5. **A staging pass:** test with disposable Google accounts, using the checklist in `release-inputs.md` section 3. Not yet run — while the app is in Testing mode, only the owner's own Google account (added as a test user) can sign in, so the full checklist (new user, same-email linking, different email, cancellation) needs either disposable accounts also added as test users, or publishing first. Record results below, then F055 can be marked Done.

Record items 1–3 in `release-inputs.md` section 3.
**Purpose:** Let couples create or access their account with Google when they prefer it to an email and password.
**Depends on:** F045 (clear email signup and auth errors). Ready for implementation; promoted to pre-launch scope by owner decision, 25 September 2026.
**References:** F002 and F045; `src/features/account/`, `src/app/auth/`, `src/lib/supabase/`, `supabase/config.toml`, `docs/release-inputs.md`, `tests/account.spec.ts`.
**Scope when promoted:** Add a clearly labelled Google option to account creation and sign-in through Supabase Auth. Configure a Google OAuth client and exact local, staging and production callback/redirect allowlists through the existing environment setup. Keep the email/password route available. Return safely to the account journey after success, cancellation or provider failure; do not put tokens in application URLs or logs. Verify how Supabase links a Google identity to an existing confirmed account with the same email, and give clear recovery guidance when the Google email differs from an existing account. Keep the existing server-side ownership and tenant boundaries. Update privacy/provider disclosures with the approved production policy.
**Done when promoted:** A new Google user and a returning Google user can reach their own wedding; existing email/password users can still sign in and recover access. Same-email linking, different-email accounts, cancellation, denied consent, invalid callbacks and cross-account access have been checked without exposing whether an email exists. Local and hosted configuration is documented without committing credentials. Mobile/desktop and keyboard checks, relevant auth and isolation tests, `npm.cmd run check`, and independent auth review pass.

**Handoff (25 September 2026):**

- **What exists.**
  - Sign-in and sign-up show **Continue with Google** above the email form, only when `AUTH_GOOGLE_ENABLED=true`.
  - `signInWithGoogle` (`src/features/account/actions.ts`) starts a server-side PKCE flow with `prompt=select_account`. The verifier goes in an httpOnly cookie.
  - `src/app/auth/callback/route.ts` exchanges the code, clears the verifier cookies, and redirects to `/dashboard`. Otherwise it returns to sign-in with a generic `?google=cancelled|failed` message. Outages are logged at `error`.
  - Basics tells a new Google account with no wedding which email it is signed in with, and to sign out if its wedding uses another email.
  - Email/password is unchanged.
  - Config and docs:
    - `supabase/config.toml` allows the local `/auth/callback` URLs and has a disabled Google block.
    - Playwright and the CI production container set the flag.
    - Setup is documented in `run-app-instructions.md` (Google sign-in), `operations.md`, F041 step 2, `release-inputs.md` section 3 and `architecture.md`.
- **Checks.**
  - `npm.cmd run check` passed: lint, typecheck, 84 unit tests, production build.
  - `E2E_PRODUCTION=1 npx.cmd playwright test tests/google-sign-in.spec.ts tests/account.spec.ts tests/dashboard.spec.ts tests/metadata.spec.ts` passed 26/26, desktop and mobile.
  - The new spec intercepts Supabase's authorize request. It checks:
    - the PKCE parameters and callback URL;
    - httpOnly/Lax verifier cookies;
    - cancelled, forged-code and malformed callbacks, with no-store/no-referrer headers;
    - a real server-side code exchange, using a local magic link that carries the browser's PKCE challenge;
    - the Basics notice (present for a Google account, absent for an email account);
    - 320px overflow.
  - Inspected screenshots of sign-in (320px), sign-up and the failure message (1440px), and the Basics notice (mobile).
  - Local Supabase was restarted with the Google variables unset.
  - `git diff --check` passed; `next-env.d.ts` build churn restored.
- **Review.** The independent auth reviewer found no Blocking issues and three Important ones: no success-path test, pre-account-takeover check not named, incomplete Google Cloud steps. All three are fixed, as are Minors 1–4 and 6. Minor 5 is deferred: status messages on page load may not be announced, the same as the existing `?error=expired` alerts; F049's screen-reader pass covers it. On re-review, no Blocking or Important findings remain, so the required independent review is complete. The reviewer's optional suggestion: add local evidence of a returning user reaching an existing wedding (currently a staging check).
- **Not run (as of 25 September 2026).** Outstanding acceptance criteria: the real-Google checks in `release-inputs.md` section 3. No real Google sign-in has been run; no OAuth client exists yet. Same-email linking, pre-account takeover, returning Google users and denied consent against Google are unverified. No hosted CI run, Safari/Firefox or real screen reader.
- **Blockers.** The owner inputs in "To finish" above, plus staging access (F041).

**Update (26 September 2026):** Owner completed "To finish" items 1–3 on staging: Google Cloud project `savethedates`, OAuth client "SaveTheDates staging", client ID/secret in Supabase's Google provider, `AUTH_GOOGLE_ENABLED=true` on the staging Render service. Full details in F041's owner setup progress. Google's consent screen is in Testing mode with only the owner's account as a test user — item 2 (a published consent screen) and item 4 (privacy notice) are still outstanding, both blocked on the same missing Homepage/Privacy Policy URLs as F041's legal pages. Item 5 (the disposable-account staging pass) has not run yet: only the owner's own account can currently complete the Google flow.
- **Next.** Either add specific disposable Google accounts as Testing-mode test users and run the item-5 checklist with those, or publish the consent screen first (the F041 legal pages now exist; see F041's 26 September progress for the URLs) and then run it with genuinely disposable accounts. Production's own OAuth client is still not created.

## F009 - Launch and operate the service

**Status:** In Progress
**Purpose:** Make the implemented product deployable, recoverable, and supportable for real customers.
**Description:** Prepare a container-capable production host and managed production integrations, verify the full journey, and record concise operating instructions. Complete preparatory work before asking for missing release authority.
**Depends on:** F008; F037 (host), F038 (monitoring), F040 (upload memory limits), F041 (production setup), F042-F049, F054 (security review) under the 24 September paid-launch gate (F055 deferred by the owner, 25 September 2026); F013-F020 and F024 completion, plus F021-F022 decision dispositions before final release review (see review gate above). Also F028-F031 completion (see the 23 September gate). F039/F050 are optional.
**Launch sequence:** [launch plan](launch-plan.md): set up production locked, private review by Stripe and Google, the owner's production dress rehearsal (including a live purchase and refund), then open by removing the lock. Record the rehearsal and launch results in this entry.
**Prepared scope:** Proceed with host-independent production-container verification and a focused operations runbook. Extend production CI to exercise existing account/recovery, payment, theme, publication, Details and RSVP checks. Prepare runtime configuration, migration/rollback, recovery, support and SEO launch steps. Render/Frankfurt is approved in F037; external accounts/access, live billing and policy-dependent data handling in F048 remain blocked on owner inputs. Do not invent retention periods or publish policies. No hosting purchase or deployment is authorised by this assessment.
**References:** `docs/operations.md`, `run-app-instructions.md`, `.github/workflows/ci.yml`.
**Decisions/access before release:** Production accounts/domain, live billing configuration, support contact, owner-approved terms/privacy/retention/deletion policy and site lifetime communication. Record any external review still needed; do not invent assurances.
**Done when:**

- The production application Docker image is deployed and verified on the chosen host with managed Supabase. Reproducible deployment/environment setup, migrations, rollback, backup/restore, monitoring, and incident/support steps are documented and exercised where possible; secrets and environments are separated.
- Data export/deletion and site expiry follow the agreed policy; uploads/RSVP data and backups are accounted for. Production auth email delivery/recovery works; extra notification emails are optional, not a new automatic scope requirement.
- CI and staging checks pass for account creation, setup, purchase, publication, guest Details/RSVP, and owner responses, including security boundaries and failure cases.
- Independent release review and SEO launch checks pass; unresolved blockers are explicit. Actual production release and a smoke check are recorded before this feature is Done.
- F049 provides actual-device/browser and core accessibility evidence for the final build. Every shipped supplied botanical/backdrop, including unused public assets, has source and commercial permission recorded or is removed/replaced with approved material; naming a supplier alone is not rights evidence.

**Handoff (21 September 2026):**

- Added `docs/operations.md` with runtime configuration, migration/promotion/rollback, SMTP/Stripe setup, monitoring/support, recovery drills and policy-dependent data handling. Added `npm run test:release` and expanded production-container CI from publication/marketing to account recovery, themes, Details, RSVP and payment checks. Running instructions include the exact local production sequence and corrected homepage/sitemap documentation. No application UI, schema or customer-data behaviour changed.
- Passed `npm.cmd run check` (lint, typecheck, 22 unit tests, production build); `npm.cmd run test:integration` (16/16); `docker build --target production -t save-the-dates:f009 .`; `npm.cmd run smoke -- http://127.0.0.1:3000`; `$env:E2E_BASE_URL='http://127.0.0.1:3000'; $env:E2E_PRODUCTION='1'; npm.cmd run test:release` (22/22 desktop/mobile against production container and local Supabase, with explicit Stripe fixture keys); `git diff --check`. Temporary verification container stopped/removed and existing development app restarted. Generated `next-env.d.ts` build churn restored. Persistence, hosted CI, managed staging/production, external SMTP/Checkout, restore/rollback drills and real-host SEO/performance were not run; local tests do not establish those results.
- Independent reviewer `review_f009_prep` found no Blocking or Important findings within preparation. Its Minor command-example finding was addressed with the full port-3000 PowerShell sequence. Full hosted release review remains outstanding.
- Current blockers (updated 24 September): missing source/commercial permission for the F034-F036 supplied botanicals/backdrops (`public/assets/wedding/README.md`); host/domain and managed-service accounts/access (Render/Frankfurt selection is already Done in F037); live billing/release authority; support/incident ownership and approved terms/privacy/retention/deletion rules including payment records, logs and backups. F048 owns the unfinished approved data process. F041 owns setup/policy pages; F049 owns the browser/accessibility evidence. Recovery objectives, Storage backup/restore and rollback drills, final independent release review and actual production release remain outstanding. Next: follow the 24 September queue (F040 Done; F038 next) while external inputs are pending; then complete hosted verification and recovery before an authorised release. F009 stays In Progress. F023, F032/F033, F039, F050 and F010 enhancements are not additional release gates.
- Carried from F040: on staging, repeat the photo-memory check. Send five near-simultaneous 25 MP uploads while a published page receives about 10 req/s, then record peak memory, guest p95 and whether the service restarted. Compare against `docs/operations.md` (Memory and photo uploads).

## F060 - Wedding invitation page

**Status:** Ready (owner requested, 25 September 2026: "the last missing piece of functionality"; decisions below by the Product Manager)
**Priority / lead:** P1 / Product Manager (this entry), UX (page and workspace composition), then Software Engineer. Independent review is required: it adds a guest-readable database function, and new owner-writable columns.
**Purpose:** Couples can send a formal wedding invitation from the same private guest link, alongside their Save the Date, Details and RSVP. Couples who send printed invitations simply leave it off, just as some leave Details off.
**Context:** The Save the Date is a notify-only announcement. A body RSVP call to action was added and then removed on 25 September 2026, because replying belongs with an invitation. The owner wants the invitation offered as a real page, optional like Details, with the workspace and marketing updated to match.
**Depends on:** F006, F026, F043 (Done).

**Decisions:**

- **A fourth, optional guest page** at `/<names>/<secret>/invitation`, not a variant of RSVP and not a timed unlock. It's **off by default**, and couples switch it on in a new **Invitation** workspace section. There's no send date or reminder: turning the page on (or sharing the link) is the send, exactly as with the other pages.
- **Each guest page is optional apart from Save the Date:**
  - Save the Date is always on.
  - Invitation, Details and RSVP each have their own switch, in their own section.
  - The Overview's new **Guest pages** card shows all four at a glance and links to each switch.
  - The setup checklist no longer requires Details. Details and Invitation are optional steps; "Open RSVPs" is unchanged.
- **Content:** a formal card, built from saved data plus three short optional wording fields:
  - the couple's names, the wedding date (Basics), the ceremony time, venue and address, and the Basics location when no address is saved;
  - **host line** (up to 160 characters), for example "Together with their families". It's omitted when empty;
  - **invitation wording** (up to 300 characters). When it's empty, the page uses "request the pleasure of your company at their wedding";
  - **afterwards line** (up to 160 characters), for example "followed by dinner and dancing". It's omitted when empty.
  - There's no photo, because the page is a card.
- **Ceremony time, venue and address are shared with Details** (the same columns). The Invitation form edits them too, labelled "Also shown on your Details page", so the two pages can't disagree. Directions links and the reception stay in Details only.
- **Replying:**
  - When RSVPs are on, the invitation ends with "Kindly reply by …" (the RSVP closing date, when one is set) and a **Reply online** button that opens RSVP.
  - When RSVPs are off, there's no reply section; couples who collect replies another way aren't shown a dead end.
  - When Details is on, a quiet link leads to it.
- **Unchanged:**
  - RSVP availability: RSVP settings alone decide it, and turning the invitation on never opens RSVPs.
  - The Save the Date body gets no reply link. The site navigation keeps linking every page that's switched on, in the order Save the date · Invitation · Details · RSVP.
- **The suggested share message** (F042) becomes "You’re invited! …" while the invitation is on, pointing guests to the invitation, and to RSVP when it's open.
- **Owner preview** at `/dashboard/preview/invitation`, like the other previews. It works whether or not the page is switched on.
- **Marketing examples** gain `/examples/<theme>/invitation`, with fictional content.
- **Deferred:** scheduled sending, reminders, reply-by-post wording, a separate reception card, per-guest invitations, and a photo on the invitation.

**Scope:**

- **Database:** a migration adding:
  - `invitation_enabled boolean not null default false`;
  - `invitation_host_line`, `invitation_wording` and `invitation_afterwards`, trimmed text with the lengths above, default `''`, with a check constraint.

  `guest_wedding` also returns `invitation_enabled`. A new `guest_wedding_invitation(requested_secret)` returns only the invitation fields and the shared ceremony fields, only while the wedding is published, has an active entitlement and has the invitation switched on. Execute is granted to `anon` and `authenticated`. The secret and owner identifiers are never returned.
- **Guest page:**
  - `src/app/[names]/[secret]/invitation/page.tsx`, following the Details route: the same 404 for unknown, replaced, unpublished, expired or switched-off pages, and the same names-part redirect;
  - an `Invitation` view in `src/features/weddings/invitation.tsx`, reusing the RSVP card system (`rsvp-shell`, `rsvp-main`, `rsvp-card`) so all twelve themes get their backdrop and paper card;
  - an Invitation link in `WeddingNavigation`, and the metadata title "Invitation".
- **Workspace:**
  - the `/dashboard/invitation` section (nav: Overview, Basics, Design, **Invitation**, Details, RSVP, Guests, Publish), with the wording fields, the shared ceremony fields, a **Show Invitation page** switch, save messages matching Details, and a preview link;
  - the Overview **Guest pages** card and the checklist changes;
  - the invitation preview route;
  - the share message.
- **Marketing:** the homepage hero, theme intro, how-it-works and FAQ; the digital save the date page ("one link, up to four pages"); the example banner navigation; and the `/examples/<theme>/invitation` pages. No new claims beyond what the product does.
- **Docs:** `product-overview.md`, `site-ui.md` (workspace and guest pages), `template-ui-summary.md` (Invitation composition) and `architecture.md` (guest functions).

**Done when:**

- A couple can switch the invitation on and off, edit its wording and ceremony time, venue and address, preview it, and see it on their live site. Switching it off, unpublishing or expiry gives guests the same 404 as other unavailable pages. The navigation shows it only while it's on.
- The shared ceremony fields stay in step between the Invitation and Details forms. Saving the invitation never switches Details on or off. A save that would leave an enabled Details page empty is refused with a clear message.
- The reply section follows RSVP state exactly (on with a date, on without a date, off). The invitation never opens RSVPs.
- The Overview shows each guest page's state correctly, and the checklist no longer requires Details.
- All twelve themes render the invitation at 320, 390 and 1440 px with no overflow and readable contrast, including long names and wording. Keyboard focus and headings are correct.
- Integration tests cover:
  - the guest function for enabled, disabled, unpublished and unknown or wrong secrets;
  - that no other fields or other tenants leak;
  - owner writes to the new columns and constraint enforcement;
  - cross-owner denial.
- Unit tests cover the invitation schema and the share message. E2E covers the owner journey, the guest page with RSVP on and off, the preview and an example page.
- Marketing copy is updated. `npm run check`, `npm run test:integration` and the relevant browser suites pass. Independent review passes, and the docs are current.

## F061 - Staging checkout rejected by Stripe

**Status:** In Progress (both causes fixed on staging, and the owner completed a real Stripe test checkout on staging, 25 September 2026; only independent review remains)
**Priority / lead:** P1, paid-launch gate and needed for F038's staging checkout check / Owner action, then Software Engineer verifies.
**Purpose:** "Buy and continue to Stripe" on staging opens Stripe Checkout instead of showing "We couldn't start checkout".
**Source:** [Owner notes, 25 September 2026](notes/25-09-2026.md).
**Evidence:** Render's staging app logs (`srv-darbpap7lnhs73cp2t50`, release `3c375aa`) show five attempts between 20:39 and 20:45 UTC on 25 September. Each is `payment.stripe.failed` on `/dashboard/publish` with `reason: "StripeAuthenticationError"`, for example request ID `d304929c-ce4a-427e-a29a-d810aa4a2cf9`.
**Cause:** Stripe refused the API key itself. It's a configuration fault, not a code fault. `src/features/payments/stripe.ts` passes `STRIPE_SECRET_KEY` to the Stripe SDK unchanged, and the variable is set: if it were missing, the app would log a different error. So the value on the staging Render service is one Stripe doesn't accept. Common causes are a key that was rolled or revoked, a publishable `pk_test_…` key, a key from a different Stripe account or sandbox, or stray quotes or spaces pasted with it. No one in this session saw the key's value, and it must stay out of Git and these docs.
**Fix (owner):**

1. In the Stripe Dashboard, open the account used for staging (the renamed former "Equimarket sandbox", F041 step 4) in test mode.
2. Open **Developers → API keys** and copy the **Secret key**. It starts with `sk_test_`. If you use a restricted key (`rk_test_`) instead, it needs write access to Checkout Sessions.
3. In Render, open `savethedates-staging` → **Environment**. Replace `STRIPE_SECRET_KEY` with the copied value, with no quotes or spaces, then **Save and deploy**.
4. While you're there, check that `STRIPE_WEBHOOK_SECRET` (`whsec_…`) is the signing secret of the test-mode webhook endpoint in that same account. Otherwise, paid checkouts will fail to publish afterwards.

**Second cause, a code fault (found after the key was replaced):** At 21:05 UTC the error became `StripeInvalidRequestError`. `begin_checkout_attempt` fixes an attempt's deadline at creation (now plus 31 minutes) and reuses the attempt until a Stripe session is attached. The attempt created at 20:39, during the bad-key failures, was still being reused at 21:05. So the action asked Stripe for an `expires_at` about 5 minutes away, below Stripe's 30-minute minimum. Worse, since migration `20260918001800`, an expired attempt is deleted only by the `checkout.session.expired` webhook. An attempt whose Stripe call failed never gets a session, so no webhook would ever clear it, and from 21:10 the wedding would have been stuck on "Stripe is still confirming the previous checkout" permanently. This affects any Stripe failure before a session is attached (a bad key, a Stripe outage, a timeout, or a crash between creating the session and attaching it), not only a bad key.
**Fix (engineer, 25 September 2026):**

- Migration `20260925000400_replace_unused_checkout_attempts.sql`: `begin_checkout_attempt` now replaces an attempt that has no Stripe session once less than 30 minutes 30 seconds remain, or once it has expired. Nobody has seen such an attempt, because the checkout URL is only shown after a session is attached. A fresh attempt (created in the last 30 seconds) is still reused, so a double submit keeps one `attempt_id` and one Stripe idempotency key. Attempts with a session keep their current behaviour.
- `payment.stripe.failed` now logs Stripe's error code with its type (for example `StripeInvalidRequestError:parameter_invalid_integer`), so the next Stripe failure names its cause.
- New integration test: "replaces an attempt that never reached Stripe once it is too close to expiry" in `tests/integration/payments.test.ts`.
- Checks: `npm run lint`, `npm run typecheck` and `npm test` (85 passed) under Node 24.11.0. `npm run test:integration` was not run, because Docker wasn't available in that session. Instead, the new function ran against a scratch PostgreSQL 16 with stand-in tables. It reused a fresh attempt, replaced a session-less attempt with 29 minutes left or already expired, and kept an attempt with a session (5 minutes left, and expired). No independent review yet; payments changes need one (AGENTS.md).
- Applied to staging through the Supabase connector. The recorded version is `20260925000400`, and the MD5 of its statements matches the file.

**Done when:** On staging, a test checkout with card `4242 4242 4242 4242` opens Stripe Checkout, completes, and returns to Publish. The webhook grants the entitlement, and the site can be published. The logs show the request-ID trail from checkout created to entitlement granted, with no `payment.stripe.failed`. `npm run test:integration` passes, and an independent review of the migration finds no Blocking issues. Record the result in F038 (its real Stripe test checkout check) and F041.
**Next:** independent review of migration `20260925000400` (deferred by the owner to the F054 security review). `npm run test:integration` has since passed with the new test: 23 of 23.

## F062 - Accept large photos by resizing them in the browser

**Status:** In Progress (started 25 September 2026; the owner approved the recommended approach)
**Priority / lead:** P1, paid-launch gate / Software Engineer. Independent review is not required: server validation, processing and storage don't change (the same reasoning as F040). Inspect the UI at mobile and desktop widths.
**Purpose:** Couples can choose the photos they actually have, straight from a phone or camera, including 40 MB files. Uploads stay quick on mobile data and within the server's memory.
**Source:** [Owner notes, 25 September 2026](notes/25-09-2026.md): the 5 MB limit is too low, and the owner has photos of about 40 MB. Wanted: a clean, best-practice fix, with no hacks.
**Current behaviour:** Both the browser (`src/features/workspace/photo-form.tsx:37`) and the server (`src/features/workspace/photo.ts:55`) reject files over 5 MiB. The server decodes up to 25 megapixels and stores a WebP at 2000 px maximum and quality 85 (`preparePhoto`). The Server Action body limit is `6mb` (`next.config.ts`). F040 measured memory use for these limits on a 512 MB instance and deferred browser-side resizing.
**Options considered:**

- **Raise the server limit to about 50 MB.** Rejected. A 40 MB upload is slow on mobile data. Such files are often 45–60 MP, well past the 25 MP that F040 measured, so a few uploads at once could restart the 512 MB server. It would also need a much larger Server Action body limit. The stored photo is 2000 px either way, so the extra pixels are thrown away after upload.
- **Upload originals straight to Storage and process them later.** Rejected. It needs the same decode memory, adds background processing and stores originals the product doesn't need, which is more data to retain and delete.
- **Chosen: shrink large photos in the browser before upload.** The device does the heavy decoding. Only a photo that is already web-sized is sent, and the server keeps its current checks.

**Scope:**

- **Only transform when needed.** If the chosen JPEG, PNG or WebP is within 5 MiB and 25 MP, upload it unchanged, exactly as today. Otherwise, decode it in the browser with the correct orientation, scale it so the long edge is about 2,500 px (headroom above the server's 2000 px output, so the final image isn't noticeably softened), and encode it as high-quality JPEG. If the result is still over 5 MiB, lower the quality once. Then upload it through the existing form and action.
- **Phones must work.** iOS Safari limits a canvas to about 16.7 MP, which is below many camera photos. Use a decode path that resizes while decoding or in steps, and verify it on a real iPhone and a real Android phone.
- **The server stays the authority.** The 5 MiB, 25 MP and type checks, the upload queue (F040) and the stored output are unchanged. Nothing is trusted because the browser resized it.
- **Privacy side effect.** Re-encoding in the browser drops camera metadata, including GPS location, before the photo leaves the device. The server already strips metadata from what it stores.
- **Input ceiling.** Accept files up to a clear browser-side ceiling, for example 60 MB. Above it, or if decoding fails (for example an unsupported format such as HEIC that the browser doesn't convert), show a plain message and keep the current photo. Keep the existing server rejection messages.
- **Copy and states.** Replace "up to 5 MB" guidance with wording that says large photos are fine. Show a "Preparing photo…" state while resizing. Keep the current busy and error messages from F040.
- **Docs.** Update `docs/overview/site-ui.md` (photo upload) and the F040 note in `docs/operations.md` to say browser resizing is now in place.

**Done when:**

- A 40 MB, 45 MP-plus camera JPEG uploads successfully on desktop Chrome, Firefox and Safari, and on a real iPhone (Safari) and Android phone (Chrome). The stored photo has the correct orientation and is a 2000 px WebP.
- Photos already within the limits upload byte-for-byte unchanged.
- Files over the browser ceiling, and files that can't be decoded, show a clear message and leave the current photo and draft unchanged.
- The existing server validation tests pass unchanged. New unit tests cover the "needs resizing" decision and the size and quality steps. An E2E test uploads a large fixture generated during the test (no large file committed) and checks the saved result.
- `npm.cmd run check` passes. The photo form is inspected at 390 px and 1440 px.

**Handoff (25 September 2026):**

- **Built:**
  - `src/features/workspace/photo-limits.ts` holds the 5 MiB, 25 MP and type limits, shared by the server (`photo.ts`, behaviour unchanged) and the browser.
  - `src/features/workspace/photo-resize.ts` does the browser work. `prepareUpload` refuses files over 60 MB before reading them, and returns the original file when the server would accept it as chosen (within 5 MiB, 25 MP and the accepted types). Otherwise it loads the photo into an `<img>` (orientation applied), draws it on a white canvas at 2500 px on the long edge, and encodes a JPEG at quality 0.9, then 0.8 if needed. If the browser can't decode a file that is already within the limits, the file is sent unchanged, so the server's own checks and messages still apply.
  - `photo-form.tsx` shows "Preparing photo…" while resizing, then the existing upload state. New help text: "A JPEG, PNG or WebP photo, up to 60 MB. Large photos are made smaller on your device before they upload." Focus returns to the photo button after a browser-side error; this was a focus bug caught by the E2E test. The upload is sent through the existing `changePhoto` action; the file input no longer submits a form.
  - Docs: `architecture.md` (photos) and `operations.md` (memory and photo uploads).
- **Checks** (Node 24.11.0 and local Supabase; Chromium 1194 because the container can't download Playwright's pinned build):
  - `npm run check`: passed (lint, typecheck, 92 unit tests including 7 new ones in `photo-resize.test.ts`, production build).
  - `npm run test:integration`: 23 passed.
  - `tests/publication.spec.ts`: passed at desktop and mobile. This includes the new test "large camera photos are made smaller on the device; photos within the limits upload unchanged". A page script records each file the page sends and its SHA-256. The small photo arrived byte-for-byte unchanged. A 6000×4500 (27 MP), over-5 MB JPEG with EXIF orientation 6 was sent as a JPEG of 5 MiB or less and stored as a correctly rotated 1500×2000 WebP. A 7 MB undecodable file shows "We couldn’t read that photo" and returns focus to the button. The over-60 MB refusal is covered by a unit test, because a 61 MB fixture made the long publish journey exceed its time limit.
  - Full browser suite against the production build (`E2E_PRODUCTION=1`, desktop and mobile): 90 passed, and 20 development-only `/demo` tests were skipped by design. After a final fix to the preparing and uploading text, `tests/publication.spec.ts` was rerun on the final code: 6 of 6 passed.
  - The photo form was inspected at 390 px and 1440 px, idle and in the error state, with no overflow.
- **Not run (why this stays In Progress):** real-device checks on an iPhone (Safari) and an Android phone (Chrome), and desktop Firefox and Safari. The container runs Chromium only, so browser memory with a 40 MB photo on a phone and iOS canvas behaviour are unverified. Independent review isn't required (see Priority).
- **Staging finding (25 September 2026), fixed:** the owner's staging upload was accepted, but the photo never displayed. `/dashboard/photo` logged `photo.read.failed` with reason `NoSuchKey`, although the object existed at the saved path. Hosted Supabase Storage (1.77.5) authorises `download()` as operation `object.get_authenticated_info`. The local stack uses `object.get_authenticated`, and both photo read policies (`20260918000200_publication.sql`) allowed only that, so hosted Storage denied every photo read for owners and guests alike. This wasn't caused by F062; it affected every hosted photo read. Local tests couldn't catch it.
  - Migration `20260925000500_allow_photo_info_reads.sql` adds `object.get_authenticated_info` to both policies and changes nothing else.
  - It was applied locally and to staging through the Supabase connector (recorded version `20260925000500`).
  - Checked on staging by simulating the policies as the owner: reads are allowed under both operation names, and signing and listing stay denied. Anonymous reads are allowed only because the test wedding is published and paid for; anonymous listing is denied.
  - `npm run test:integration`: 23 passed. `tests/publication.spec.ts` and `tests/themes.spec.ts` passed at desktop and mobile. The themes test needed one rerun, because the dev server hit its 30-second limit under parallel load.
- **Next:** the owner reloads the staging photo to confirm it displays. For the real-device check, the owner uploads a large photo from a phone and from a desktop browser other than Chrome; then F062 can be marked Done.

## F063 - Show SaveTheDates, not the Supabase address, in Google sign-in

**Status:** Planned (needs an owner choice; done with F055's production setup)
**Priority / lead:** P2, doesn't gate launch because F055 is deferred for production / Owner setup, then Software Engineer verifies.
**Purpose:** Google's sign-in screens and emails name SaveTheDates or `savethedates.co.uk`, not the Supabase project address.
**Source:** [Owner notes, 25 September 2026](notes/25-09-2026.md). After a staging Google sign-in, Google's security email said: "You used Sign in with Google to sign in to onrblnlwrnbdvyeasqdt.supabase.co".
**Cause:** With Supabase Auth, Google sends the user back to the Supabase project's callback, `https://<project-ref>.supabase.co/auth/v1/callback` (F041 step 2). So Google identifies the site by that address. On staging, the consent screen is also in Testing mode, and the brand isn't verified.
**This won't fix itself in production.** Production will use its own Supabase project, with its own `<project-ref>.supabase.co` address. It only changes if one of the options below is taken.
**Options (from F055's consent-screen choice):**

1. **Google brand verification (free; recommended first).** Publish the consent screen with Homepage, Privacy and Terms links on `savethedates.co.uk` (the F041 legal pages now exist), and verify the domain in Search Console (F041 step 7). The consent screen then shows "SaveTheDates". Check whether Google's security email also changes; this hasn't been confirmed.
2. **Supabase custom domain (paid add-on).** For example `auth.savethedates.co.uk`. The callback moves to that domain, so every Google screen and email names `savethedates.co.uk`. It needs a paid Supabase plan plus the add-on's cost, and the Google client's redirect URI must be updated.
3. **Accept it for now.** Keep the current wording.

**Done when:** The owner has picked an option, recorded in `release-inputs.md` section 3 and F055. On production, a Google sign-in's consent screen and Google's follow-up email name SaveTheDates or `savethedates.co.uk`, checked with a real sign-in.

## F064 - Colour the site status on the workspace overview

**Status:** Done (25 September 2026)
**Priority / lead:** P3, polish; doesn't gate launch / Software Engineer. No independent review needed.
**Purpose:** Couples can see at a glance whether their site is still private or live.
**Source:** [Owner notes, 25 September 2026](notes/25-09-2026.md): orange text for Private draft, green for Published, in the site status box.
**References:** `src/app/dashboard/(workspace)/page.tsx` (the Site status card, lines 50–53), `src/app/dashboard/(workspace)/layout.tsx:19` (header status badge), `src/features/workspace/workspace.css` (`.ws-stat[data-tone="live"]`), `src/components/controls.css` (`--positive-*` tokens).
**Scope:**

- In the Overview's Site status card, show "Private draft" in a warm orange and "Published" in green. "Offline" keeps its current neutral style, since the owner didn't ask for a change.
- Add a small set of caution tokens (for example `--caution-ink` and `--caution-soft`) next to the existing `--positive-*` tokens. Reuse the positive green for Published.
- Give the header's "Private draft" badge the same orange tone, so the two statuses agree. The Published badge is already green.
- Text must reach at least 4.5:1 contrast on the card background. The words and icons stay, so colour isn't the only signal.
- Workspace only. Guest-facing themes are unchanged.

**Done when:** Draft shows orange and Published shows green, both in the card and the header badge. Offline is unchanged. Contrast is checked at 4.5:1 or better. The overview is inspected at 390 px and 1440 px. `tests/dashboard.spec.ts` and `npm.cmd run check` pass.

**Handoff (25 September 2026):**

- **Built:** `controls.css` adds `--caution-soft` (`#fbeee2`), `--caution-ink` (`#b3470f`) and `.badge-caution`. `workspace.css` colours the Site status value, and tints the icon, for `data-tone="live"` (the workspace `--sage` green, `#2f6b4f`) and a new `data-tone="draft"` (orange). The Overview card (`page.tsx`) sets `draft` for Private draft and no tone for Offline. The header's Private draft badge (`layout.tsx`) uses `.badge-caution`; the Published badge keeps `.badge-positive`. "Published" is shown only while the site is published *and* paid for, so guests can open it (`live` in `workspace-data.ts`). Green therefore always means guests can see the site.
- **Contrast (WCAG):** orange on the card is 5.40:1 and on the badge background 4.82:1. Green on the card is 6.19:1. The existing Published badge is 8.19:1.
- **Checks:** `npm run check` passed (lint, typecheck, 92 unit tests, build). `tests/dashboard.spec.ts` passed 10 of 10 at desktop and mobile, with new colour assertions for Private draft (card and header), Published (card), and Offline (neither colour). Overview screenshots for draft and published were inspected at 390 px and 1440 px, with no overflow. On phones, the header hides the status badge, as before.
- **Noticed, not changed (existing behaviour):** when a site is Offline (published, but the purchase has ended), the card says "Offline", but the header badge says "Private draft", because `layout.tsx` only distinguishes live from not live. With the new orange, the mismatch is more visible. The owner decides whether the header should say "Offline".

## F010 - Post-launch extensions

**Status:** Deferred
**Purpose:** Keep possible enhancements visible without expanding the MVP.
**Description:** Shared couple accounts, multiple weddings per account, custom domains, password-protected sites, more themes, galleries, meal choices, plus-ones, custom RSVP questions, imports/exports beyond required data rights, and optional notification emails. From the 24 September walkthrough: household submission, optional notes/dietary data, catering CSV/print beyond F048, calendar download, locally generated QR sharing, preview cards showing the couple's photo (names/date cards are F047), editable decorative copy, optional theme checklist and minor Overview/framing/address-layout refinements. F050 owns visual theme/example browsing; do not duplicate it here. Promoting household/notes/dietary fields requires explicit scope, guest-count semantics, limits, owner correction and retention/export decisions. Adding the photo to preview cards requires owner approval of photo data that messaging services may receive and cache.
**Depends on:** F009
**Done when:** Customer evidence justifies promoting a specific capability into its own scoped feature; this holding entry does not authorise implementation.
