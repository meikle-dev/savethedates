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

## Integrations and release

Docker support is required from the first application slice: provide an application Dockerfile and a simple Docker Compose entry point for local development. Next.js contains both the frontend and server-side application code in one application container. Keep a direct Node.js development option as a convenience.

When persistence is introduced, use the Supabase CLI to run the local Supabase services in their supported Docker containers. Do not put the database inside the application container or maintain a duplicate custom Supabase stack. Document and verify connectivity from both the browser and application container, local ports, environment variables, migrations, and persistent data. Local database development must not require a hosted Supabase account.

Keep `run-app-instructions.md` at the repository root as the canonical running guide. It is intentionally empty until F001 implements and verifies the commands; extend it with local Supabase in F002. README links to it rather than duplicating setup instructions.

Build and smoke-test a production application image as well as the development container. Prefer managed Supabase for production to keep operations simple; local Supabase is a development environment, not the production deployment. Select a container-capable production host during release preparation. Vercel remains an optional source-based deployment, not the required Docker image hosting path. Do not add Kubernetes or production database self-hosting without a concrete requirement.

Add Supabase, Stripe, and Resend only when the selected feature requires them. Local fixtures for the first UI slice are explicitly development-only; they are not a substitute for production persistence or authorisation.

Use Stripe server-verified webhook events as payment authority, with idempotency and retry handling. Pricing, entitlement duration, and purchase rules must be resolved before billing is Ready. Supabase Auth owns account authentication; Resend may provide its email delivery rather than introducing a second authentication flow.

Production readiness requires deployment/environment instructions, migrations, backup/restore and rollback procedures, error visibility, and a deliberate customer-data retention/deletion policy. Define these in the launch feature rather than claiming the code alone makes the service ready for customers.
