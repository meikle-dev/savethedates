# SaveTheDates architecture

## Application

One repository and one Next.js App Router application. Use the stack in [tech-stack.md](tech-stack.md). No separate backend, microservices, or deployments per wedding. Use Server Actions and Route Handlers with server-side domain logic where needed; validate external input with Zod. Commit database migrations.

Create directories when required, not as empty scaffolding:

```text
AGENTS.md                  Working rules and feature selection
.agents/                   On-demand role instructions
docs/index.md              Documentation map
docs/backlog.md            Ordered features, acceptance, and handoff
docs/overview/             Product, stack, architecture, platform design
docs/ux/                   Theme guidance and reference images
src/app/                   Routes: marketing, dashboard, [weddingSlug]
src/features/              Domain behaviour when it needs its own modules
src/components/            Shared UI
src/lib/                   Infrastructure integrations
supabase/migrations/       Versioned schema and access policies
tests/                     Integration and end-to-end tests as needed
public/                    Public assets only
```

Small feature-local tests may live beside their code. Keep business logic out of presentation components where practical; do not create abstractions before there is a use for them.

## Delivery and documentation

`AGENTS.md` defines the workflow; `docs/backlog.md` is the sole delivery plan. Keep acceptance criteria and handoffs there rather than duplicating them in separate planning bundles.

Add focused design/security/operations documents only as their features need them. Link these from the backlog and documentation index. The proposed directory tree is not a list of documents to generate. Persist decisions and unfinished work so another session can continue without chat history.

## Data boundaries

- One owner per wedding initially; one wedding per account for the MVP. Shared editing is deferred.
- Persist owner identity and enforce ownership server-side and with Supabase RLS; enforce storage isolation as well. Cover both allowed access and cross-owner denial in integration tests.
- Public reads expose only explicitly published wedding content. Drafts, owner account fields, guest lists, and RSVP responses are never part of public payloads.
- `noindex` discourages search indexing; it does not make published content confidential. Password-protected sites are outside the initial scope.
- Guest RSVP writes need a deliberately designed server boundary, validation, and abuse controls. No anonymous reading or arbitrary updating of responses. Specify the chosen model before implementing RSVP.
- Service credentials stay server-side; bypassing RLS requires explicit scoped authorisation checks. Never store secrets in Git, logs, or documentation.
- Establish schema and policies with the persistence feature; do not invent a complete future schema during the first UI slice.

## Routes and publication

Guest routes are `/[weddingSlug]`, `/[weddingSlug]/details`, and `/[weddingSlug]/rsvp`. Marketing uses explicit static routes; owner management uses `/dashboard`.

Validate and normalise slugs, enforce uniqueness in the database, and reserve application routes before allowing customer choices. Start with immutable slugs after publication to avoid breaking shared links. Publishing must invalidate stale public data; unpublished pages and assets must not remain exposed through a previous public cache. Decide storage delivery accordingly before accepting real uploads.

All wedding routes are `noindex` and excluded from the marketing sitemap. Owner routes and previews are authenticated and `noindex`. Unknown and unpublished slugs return a non-revealing not-found response. Themes share content and behaviour and change only presentation.

F008 explicitly opts only the marketing homepage into indexation; root metadata stays noindex for guest, account, owner and unknown routes. `/examples/[theme]` and its Details page reuse guest components with source-controlled fictional content, remain noindex, and never read customer records or collect responses. These examples and the public licensed photo derivative are distinct from development-only `/demo` fixtures. The sitemap contains only the homepage. Canonical, sitemap and social URLs use runtime `APP_ORIGIN` (local fallback `http://localhost:3000`) so the same Docker image can move between hosts without a baked-in domain. Robots allow page crawling so crawlers can see noindex; privacy is still enforced by server/database access checks. The homepage is dynamically server-rendered and verifies only whether a Supabase user exists so it can show account or workspace actions; it never loads owner identity or wedding data and its response is private/no-store. If auth is unavailable or unverifiable, it shows the signed-out actions. Examples are statically rendered where possible. F009 must verify the production origin and indexation on the chosen host before launch.

F004 stores a constrained `theme` ID (`minimal`, `romantic`, `bold`) on the owner-only wedding row, defaulting existing rows to Modern Minimal. The public projection includes only the applied theme. A validated query parameter overrides presentation in the authenticated preview without writing data; the Apply theme server action verifies the owner, writes only the theme and revalidates the workspace, preview and guest route. All themes use the same wedding content and renderer, with inherited CSS tokens on `.wedding-shell[data-theme]` for later guest pages.

F005 keeps the bounded Wedding Details fields on the owner-protected wedding row: ceremony and reception information, travel, accommodation, dress code, and at most five validated FAQ pairs. Server and database validation trim and limit plain text, accept only complete HTTP(S) links and FAQ pairs, and require content before Details can be enabled. The anonymous `published_wedding_details(slug)` projection returns only these guest fields when both the wedding and Details page are published; disabled, draft, and unknown pages return no row. The existing landing projection exposes only the Details-enabled flag for navigation. Disabling Details preserves private content while immediately removing its guest route and navigation. Authenticated preview reads through the owner session and never makes draft content public.

F006 uses one owner-created invitation per RSVP response. The private link carries a 256-bit random token; PostgreSQL stores only its SHA-256 digest. Invitation and response rows remain behind owner RLS, and anonymous roles receive no table privileges. Narrow security-definer functions resolve a digest only for a published, RSVP-enabled wedding and atomically create or correct that invitation's response while open. They return only that invitation's display label and response state, never other invitations. Revocation makes a token unavailable without deleting the owner's response record. Each invitation is throttled in the database to ten submission attempts per rolling ten-minute window, including validation failures handled by the submission function; Next.js Server Actions also provide same-origin request enforcement. An optional close date ends at 23:59 UTC. Public landing/details projections expose only the RSVP-enabled flag for navigation. Tokens can be shared by recipients and are bearer credentials, so the interface describes links as private without presenting them as proof of a person's real identity.

F015 preserves that invitation context by carrying the existing `?invite=` credential only on internal Save the Date, Details and RSVP navigation. Only a syntactically valid token is propagated; the RSVP database boundary still proves that it belongs to the requested wedding. The URL and browser history are the per-tab context, so different tabs and explicit second-invitation links do not mutate shared cookie or storage state. Context remains available only while the guest retains that URL/history or copied link, and its authority still ends on revocation, unpublication, RSVP closure for writes, or entitlement expiry. The request proxy applies explicit private/no-store, no-referrer and noindex response headers whenever any of these three routes carries an invitation parameter; external Details links also use `noreferrer`. The application has no guest analytics and must never log invitation tokens or query strings. This keeps existing links valid without a route migration or a second secret.

The authenticated `/dashboard/preview/rsvp` route renders the shared RSVP form using only the signed-in owner's saved names and candidate theme, even before publication or enabling RSVP. It is explicitly a preview: it creates no invitation, sends no RSVP action, and carries no guest token. Save the Date and Details preview navigation retains the candidate theme when visiting RSVP. Visiting a published wedding's RSVP without an `invite` parameter redirects only its verified owner to that private preview; anonymous users, other owners, and explicit invalid credentials retain the unavailable state. Newly created invitations offer **Open invitation** at the same token-bearing URL copied for guests. Existing hash-only tokens cannot be reconstructed after creation; preview never selects or impersonates a guest invitation.

F003 uses a narrow `published_wedding(slug)` database function for anonymous guest content; the underlying wedding table remains owner-only. PostgreSQL enforces reserved/unique slugs and permanently locks the URL after first publication, including after unpublishing. Saved edits on a published wedding are immediately live; preview renders saved content through the same component. Publication is free for development/testing until F007 adds entitlement.

Photos live in the private `wedding-photos` Supabase bucket under wedding UUID/random UUID paths. The server validates a maximum 5 MiB JPEG/PNG/WebP and 25 megapixels, re-encodes a still WebP at up to 2000px, and strips metadata. Uploads are immutable; replacement uses a compare-and-swap before deleting the old object. Failed cleanup can leave private orphaned files, which must be included in F009 retention/deletion work. RLS allows owners to insert/read/delete their own files and guests to download only the currently published photo. Download-only policies deny signing and anonymous listing (see [Supabase storage operation helpers](https://supabase.com/docs/guides/storage/schema/helper-functions)). No service key is used by the application.

F017 stores non-destructive photo framing as bounded JSON on the owner-protected wedding row: a 0–100 focal point and 1–2 zoom for each theme and for Save the Date and Details independently. Missing entries use renderer defaults, so existing weddings and unseen themes remain safe. Server and database validation reject unknown keys and arbitrary transforms. A database trigger resets all framing whenever `photo_path` changes, including changes outside the normal upload action. Public projections include only the applied theme's framing; the shared photo renderer applies the same focal point and zoom to authenticated previews and guest pages across responsive frame shapes.

Public pages and photo handlers are dynamic; photo responses use `private, no-store` and no signed links or image-optimiser cache. Unpublishing revokes access on new requests, including direct Storage downloads. Previously downloaded copies and already open pages cannot be recalled. Private preview and photo handlers derive the owner from the verified session, never from a supplied owner/wedding ID.

## Integrations and release

Docker support is required from the first application slice: provide an application Dockerfile and a simple Docker Compose entry point for local development. Next.js contains both the frontend and server-side application code in one application container. Keep a direct Node.js development option as a convenience.

When persistence is introduced, use the Supabase CLI to run the local Supabase services in their supported Docker containers. Do not put the database inside the application container or maintain a duplicate custom Supabase stack. Document and verify connectivity from both the browser and application container, local ports, environment variables, migrations, and persistent data. Local database development must not require a hosted Supabase account.

Keep `run-app-instructions.md` at the repository root as the canonical running guide. F001 provides verified application commands; extend it with local Supabase in F002. README links to it rather than duplicating setup instructions.

Build and smoke-test a production application image as well as the development container. Prefer managed Supabase for production to keep operations simple; local Supabase is a development environment, not the production deployment. Select a container-capable production host during release preparation. Vercel remains an optional source-based deployment, not the required Docker image hosting path. Do not add Kubernetes or production database self-hosting without a concrete requirement.

Add Supabase, Stripe, and Resend only when the selected feature requires them. Local fixtures for the first UI slice are explicitly development-only; they are not a substitute for production persistence or authorisation.

Use Stripe server-verified webhook events as payment authority, with idempotency and retry handling. Pricing, entitlement duration, and purchase rules must be resolved before billing is Ready. Supabase Auth owns account authentication; Resend may provide its email delivery rather than introducing a second authentication flow.

F007 uses Stripe-hosted Checkout for one £29 GBP payment per wedding. Drafting and authenticated preview remain free; an active payment entitlement is required before publication. New checkout attempts grant publication until six calendar months after the wedding date captured when checkout begins. Attempts and purchases created before the six-month change retain their frozen twelve-month expiry snapshots. Checkout Session and PaymentIntent metadata identify both the authenticated owner and wedding, but metadata is accepted only from a signature-verified webhook and rechecked against database ownership. The browser success URL never grants access. A database-backed 31-minute checkout attempt freezes the wedding-derived expiry, reuses one Stripe idempotency key and Checkout URL across tabs/retries, and prevents concurrent payable sessions. An unpaid attempt is retained until Stripe sends a signature-verified expiration event, avoiding a second chargeable session while a delayed payment webhook is still possible. An append-only Stripe event ledger makes delivery idempotent and reconciles refund/dispute events even when they arrive before the successful-payment event. Transaction-scoped per-PaymentIntent locks also serialize simultaneous success and revocation delivery. Each payment has its own entitlement, so a revoked payment does not revoke a later repurchase. Refunds and disputes immediately unpublish; public landing, Details, photo, and RSVP reads also check current entitlement so natural expiry hides content without relying on a scheduled job. Expiry does not move when the draft date is later edited. Expiry removes public access; it does not delete private data.

The webhook is the only application path using the Supabase service-role key. It first verifies the raw request with `STRIPE_WEBHOOK_SECRET`, then calls one narrowly scoped security-definer database function; payment tables and that mutation function are unavailable to anonymous and authenticated clients. Keep the Stripe secret, webhook secret, and Supabase service-role key server-only.

Production readiness requires deployment/environment instructions, migrations, backup/restore and rollback procedures, error visibility, and a deliberate customer-data retention/deletion policy. Define these in the launch feature rather than claiming the code alone makes the service ready for customers.
