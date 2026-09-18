# Product backlog

Ordered by recommended implementation sequence. F001 is complete. **Next: prepare F002.**

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

**Status:** Planned
**Purpose:** Allow a couple to securely create and retain their wedding content.
**Description:** Supabase authentication and one private wedding draft per account, with a simple guided editing workspace. UX defines account entry/recovery, draft editing, and validation/error states before Ready.
**Depends on:** F001
**References:** `docs/overview/architecture.md`, `docs/overview/site-ui.md`, `docs/overview/tech-stack.md`.
**Done when:**

- An owner can sign up, authenticate, sign out, recover access, and return to their persisted wedding draft; guest visitors need no account.
- The owner can save names, wedding date, location, and optional message; required fields and server validation are explicit, and failed saves preserve entered content.
- Migrations and RLS enforce one wedding per owner and deny unauthorised reads/writes; drafts are never public. Integration tests use two owners and an anonymous caller to verify isolation.
- The Supabase CLI runs the local database/auth services in Docker without a hosted account. Verify browser and application-container connectivity, migrations, local auth email testing, and data persistence across restarts. Extend `run-app-instructions.md` with prerequisites, startup/shutdown, safe environment examples, and clearly labelled destructive reset instructions. Supabase Auth controls authentication; email transport does not duplicate auth logic.
- The dashboard communicates draft state and next action. Security-sensitive implementation receives independent review.

## F003 - Photo, preview, and publish a shareable site

**Status:** Planned
**Purpose:** Let couples share a real, personalised Save the Date URL.
**Description:** Add a photo, select a unique URL, preview privately, publish, update, and unpublish. Explain public-link visibility before publication.
**Depends on:** F002
**References:** `docs/overview/architecture.md`, `docs/overview/product-overview.md`, `docs/overview/site-ui.md`.
**Done when:**

- Owner-managed photo upload/replacement validates type and size; failures are recoverable and files are isolated by wedding. Storage access respects draft/unpublished status.
- Slugs are normalised, reserved routes are denied, concurrent collisions are handled, and slugs are fixed after first publication.
- Authenticated preview uses the same rendering as the guest page. Publishing requires valid required content; only published content is visible anonymously.
- Updates and unpublishing invalidate public caches; public assets follow the publication policy. Unpublishing cannot retract copies visitors already downloaded, and the UI makes no such promise.
- Draft/unknown slugs return a non-revealing 404; no owner or guest-response data leaks through public reads. All wedding pages remain noindex and outside sitemaps.
- Integration and browser tests cover owner edit/publish, anonymous visit, cross-owner denial, and unpublish. Independent review passes.

## F004 - Three selectable wedding themes

**Status:** Planned
**Purpose:** Give couples the three distinct visual choices in the supplied designs.
**Description:** Extend Modern Minimal with Warm & Romantic and Modern & Bold; provide selection and preview in the workspace.
**Depends on:** F003
**References:** `docs/ux/template-ui-summary.md`, `docs/ux/save-the-date-options-design.png`, `docs/overview/site-ui.md`.
**Done when:**

- All three reference directions are recognisable at mobile and desktop widths, with readable text over photography and usable no-photo fallbacks.
- Switching themes preserves all content and the wedding URL; common data and behaviour are shared.
- Selection persists and previews before applying; keyboard access, contrast, long names, image loading/failure, and reduced-motion preferences are checked.
- Subsequent Details and RSVP features can use the same theme tokens/layout conventions without separate business logic per theme. Visual checks and independent feature review are recorded.

## F005 - Wedding Details

**Status:** Planned
**Purpose:** Give guests useful event information without repeated questions to the couple.
**Description:** Optional structured sections for ceremony/reception, timings, travel, accommodation, dress code, and FAQs; no generic drag-and-drop page builder. UX defines editing and guest layouts before Ready.
**Depends on:** F004
**References:** `docs/overview/product-overview.md`, `docs/ux/template-ui-summary.md`.
**Done when:**

- Owners can save and update relevant sections; empty sections are omitted. Text and external URLs are validated safely.
- Published sites expose enabled Details at `/[weddingSlug]/details`, with consistent navigation in all three themes; disabled or unpublished Details are not publicly accessible.
- Preview, publication, noindex, and ownership rules match the landing page. Browser coverage verifies owner edits reaching guests and empty/disabled states; review and responsive inspection are recorded.

## F006 - Guest RSVP and owner response list

**Status:** Planned
**Purpose:** Collect attendance without guest accounts and make responses useful to the couple.
**Description:** A minimal RSVP flow plus private response management. Before Ready, Product Manager and UX must decide open-link versus invitation-token identification, repeat/correction behaviour, fields, closing behaviour, and abuse controls; document the chosen data boundary. Do not silently treat a typed name as verified identity.
**Depends on:** F005
**References:** `docs/overview/product-overview.md`, `docs/overview/architecture.md`, `docs/ux/template-ui-summary.md`.
**Done when:**

- Owners can enable/close RSVP; invited guests can identify themselves under the chosen model and submit attending/not-attending without creating accounts.
- Validation, confirmation, retries, duplicates, corrections, and closed/disabled states behave as specified, with server-side abuse protection.
- Only the correct owner can view responses and attendance totals; guests cannot enumerate other responses or overwrite them without the required authority.
- All themes provide accessible RSVP and navigation. Automated coverage includes submission, retry/correction semantics, owner viewing, anonymous/cross-owner denial, and closed RSVP; independent security review passes.
- Meal choices, plus-ones, custom questions, and guest-list import are excluded unless separately prioritised. Optional sensitive fields are not collected by default.

## F007 - One-off purchase and publication entitlement

**Status:** Planned
**Purpose:** Sell the wedding site with a simple, reliable purchase flow.
**Description:** Stripe hosted checkout and server-controlled entitlement. Develop with test mode first. Free publishing from earlier slices is for development/testing; paid launch must enforce the agreed rule.
**Depends on:** F006
**Decisions before Ready:** Owner-approved price/currency, what the purchase includes, site lifetime, purchase timing, refunds and entitlement revocation. The design board's $29 is a placeholder.
**References:** `docs/overview/tech-stack.md`, `docs/overview/architecture.md`.
**Done when:**

- The agreed purchase rule is clear in the UI and enforced server-side; cancellation/failure preserves the draft and supports retry.
- Checkout is tied securely to the owner/wedding; verified webhook events control entitlement, with duplicate/out-of-order/retry handling and no trust in the browser return URL.
- Agreed refund/revocation behaviour is implemented and tested. Secrets remain server-side and payment/tenant boundaries receive independent review.
- Test-mode checkout, webhook processing, and publication gating are verified end to end; live activation remains part of release preparation.

## F008 - Public marketing and theme examples

**Status:** Planned
**Purpose:** Explain the product and convert visitors into customers.
**Description:** Modern Luxe homepage, three theme examples, concise explanation/pricing, and working account-entry calls to action. Use UX and SEO roles only for this public surface.
**Depends on:** F007
**References:** `docs/overview/site-ui.md`, `docs/ux/site-ui-design.png`, `docs/ux/template-ui-summary.md`.
**Done when:**

- Mobile and desktop marketing match the supplied direction and lead to real product flows. Public examples use fictional demo data, never customer records.
- Pricing and capabilities reflect implemented behaviour; no invented testimonials, ratings, or placeholder purchase promises are published.
- Marketing metadata, canonical URLs, sitemap, semantic structure, and social sharing are verified; wedding/owner routes stay outside indexable surfaces.
- Accessibility, responsive appearance, representative page performance, working CTAs, and independent review are recorded. Extra SEO landing pages/guides wait for demonstrated need.

## F009 - Launch and operate the service

**Status:** Planned
**Purpose:** Make the implemented product deployable, recoverable, and supportable for real customers.
**Description:** Prepare a container-capable production host and managed production integrations, verify the full journey, and record concise operating instructions. Complete preparatory work before asking for missing release authority.
**Depends on:** F008
**Decisions/access before release:** Production accounts/domain, live billing configuration, support contact, owner-approved terms/privacy/retention/deletion policy and site lifetime communication. Record any external review still needed; do not invent assurances.
**Done when:**

- The production application Docker image is deployed and verified on the chosen host with managed Supabase. Reproducible deployment/environment setup, migrations, rollback, backup/restore, monitoring, and incident/support steps are documented and exercised where possible; secrets and environments are separated.
- Data export/deletion and site expiry follow the agreed policy; uploads/RSVP data and backups are accounted for. Production auth email delivery/recovery works; extra notification emails are optional, not a new automatic scope requirement.
- CI and staging checks pass for account creation, setup, purchase, publication, guest Details/RSVP, and owner responses, including security boundaries and failure cases.
- Independent release review and SEO launch checks pass; unresolved blockers are explicit. Actual production release and a smoke check are recorded before this feature is Done.

## F010 - Post-launch extensions

**Status:** Deferred
**Purpose:** Keep possible enhancements visible without expanding the MVP.
**Description:** Shared couple accounts, multiple weddings per account, custom domains, password-protected sites, more themes, galleries, meal choices, plus-ones, custom RSVP questions, imports/exports beyond required data rights, and optional notification emails.
**Depends on:** F009
**Done when:** Customer evidence justifies promoting a specific capability into its own scoped feature; this holding entry does not authorise implementation.
