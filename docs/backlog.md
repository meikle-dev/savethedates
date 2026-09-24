# Product backlog

Ordered by recommended implementation sequence. F001-F008 and F011-F031 are complete. **Current: F009** remains In Progress with external release blockers. F034 (five additional themes) is Done. F035 (Coastal, Riviera, Velvet, Black Tie) is Done. F032 awaits UX confirmation; F033 is the next Ready ticket.

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

Fixed the workspace's missing RSVP preview: authenticated preview uses the owner's saved names and candidate theme, connects all three preview pages, and cannot submit responses. A published RSVP URL without an invitation parameter redirects only the verified wedding owner to private preview. Newly created invitations have **Open invitation** at the exact token-bearing guest URL; invalid credentials, other owners, and anonymous visits retain existing restrictions.

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

## F032 - Subtle, fast motion across the site

**Status:** Planned
**Priority / lead:** P3 / UX/UI Designer then Software Engineer; independent review of the final visual feature
**Purpose:** Navigating and changing state should feel smooth and calm instead of abrupt, without slowing anything down.
**Depends on:** F029, F030 (shared workspace shell/CSS). Becomes Ready when they are Done and UX has confirmed the motion list below against the current screens.
**References:** `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` (Next.js 16.3.5 with React 19.3: `<ViewTransition>` from `react` works in the App Router without config, route navigations activate it, persistent elements use `viewTransitionName`, and there is a "Respecting reduced motion" section), `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` (`transitionTypes`, v16.2+), `src/app/layout.tsx`, `src/features/workspace/workspace.css`, `src/features/marketing/marketing.css`, `src/features/weddings/wedding.css`, `src/components/controls.css`, `docs/overview/site-ui.md`, `docs/ux/template-ui-summary.md`.
**Proposed motion list:**

- A short crossfade (about 150-200ms, opacity plus at most an 8px translate) when moving between workspace sections, between the three wedding pages, and between marketing and account pages. Workspace and wedding headers/navigation stay fixed rather than animating.
- Gentle open/close for the F029 section menu, row correction panels and disclosure panels.
- A quick fade-in for success and error notices.
- Consistent transitions of 150ms or less on control hover and press.

Excluded: parallax, scroll-triggered effects, animated page-load heroes, animation libraries, and changes to layout timing.
**Done when:**

- Only `opacity`/`transform` are animated. Each animation lasts 250ms or less and never delays interaction or navigation. Content and focus are available immediately, with no layout shift and no animation on first load.
- `prefers-reduced-motion: reduce` turns off transitions and view-transition animations everywhere. Browsers without View Transitions support work normally.
- All three wedding themes use the same motion behaviour. Previews and noindex/private headers are unchanged.
- Browser checks cover reduced-motion (emulated), navigation still working with transitions, and absence of overflow. Visual inspection is done at mobile and desktop widths. `npm.cmd run check` passes, with no significant increase in client bundle size (record before/after). Motion guidance is recorded in `docs/overview/site-ui.md`.

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

## F009 - Launch and operate the service

**Status:** In Progress
**Purpose:** Make the implemented product deployable, recoverable, and supportable for real customers.
**Description:** Prepare a container-capable production host and managed production integrations, verify the full journey, and record concise operating instructions. Complete preparatory work before asking for missing release authority.
**Depends on:** F008; F013-F020 and F024 completion, plus F021-F022 decision dispositions before final release review (see review gate above). Also F028-F031 completion (see the 23 September gate).
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
- Blockers: source and licence record for the F034 botanicals and RSVP backdrops supplied on 23 September 2026 and the F035 WebP botanicals and backdrops supplied on 24 September 2026 (see `public/assets/wedding/README.md`); owner selection/access for production host/domain and managed Supabase; live billing/release authority; support contact and approved terms/privacy/retention/deletion rules, including payment records and backups. Requested these decisions during this session; none supplied yet. Export/deletion implementation, hosted configuration, recovery objectives/drills and actual release remain unfinished. Next: resolve these inputs, implement the approved data-handling process, configure staging and exercise the hosted journey/recovery before release review and authorised production deployment. F009 remains In Progress; do not start F010. F013-F024 are Done and the F021-F022 dispositions are recorded. F023 is not an additional release gate.

## F010 - Post-launch extensions

**Status:** Deferred
**Purpose:** Keep possible enhancements visible without expanding the MVP.
**Description:** Shared couple accounts, multiple weddings per account, custom domains, password-protected sites, more themes, galleries, meal choices, plus-ones, custom RSVP questions, imports/exports beyond required data rights, and optional notification emails.
**Depends on:** F009
**Done when:** Customer evidence justifies promoting a specific capability into its own scoped feature; this holding entry does not authorise implementation.
