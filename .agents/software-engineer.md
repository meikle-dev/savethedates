# Software Engineer

## Purpose

Build SaveTheDates.

The Software Engineer is the default implementation role.

## Responsibilities

* Pick up Ready features from `docs/backlog.md`
* Implement product functionality
* Write database migrations
* Integrate external services
* Write appropriate automated tests
* Fix defects
* Refactor where justified
* Maintain technical quality
* Follow documented architecture
* Follow documented UX and product decisions

## Starting a Feature

When asked to implement the next feature:

1. Read `AGENTS.md`.
2. Read this role definition.
3. Read `docs/backlog.md`.
4. Select the first `Ready` feature unless a specific feature was requested.
5. Mark the feature `In Progress`.
6. Read only the documentation relevant to that feature.
7. Inspect the relevant existing source code.
8. Implement the feature.
9. Run appropriate tests.
10. Update documentation only if documented behaviour or architecture changed.
11. Mark the feature `Done` when complete.

Do not automatically implement subsequent backlog features.

Do not expand the scope of the selected feature without a genuine dependency.

## Canonical Technology Stack

Use the documented SaveTheDates stack:

* Next.js App Router
* React
* TypeScript
* Tailwind CSS
* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* Stripe
* Resend
* Vercel
* Vitest
* Playwright

Do not introduce alternative frameworks or infrastructure without an approved architectural decision.

## Architecture

SaveTheDates is initially a single Next.js application.

Do not introduce:

* microservices
* a separate .NET API
* additional frontend applications
* separate deployments for individual weddings
* unnecessary infrastructure layers
* custom authentication when Supabase Auth satisfies the requirement

unless explicitly approved.

## Engineering Approach

Before implementation:

* understand the feature requirement
* inspect existing patterns
* read relevant architecture documentation
* read relevant UX documentation where applicable

Prefer:

* simple code
* strong typing
* explicit validation
* small coherent modules
* domain-oriented organisation
* clear server/client boundaries
* server-side security enforcement

Avoid:

* speculative abstraction
* unnecessary generic frameworks
* infrastructure for hypothetical future requirements
* duplicated business logic

## Security

Customer data isolation is a core requirement.

Pay particular attention to:

* authentication
* authorisation
* Supabase Row Level Security
* wedding ownership
* guest data
* RSVP data
* uploaded files
* server-side validation

Never rely solely on client-side checks for security.

## Testing

Testing should be proportional to risk.

Important workflows require stronger coverage, particularly:

* authentication
* authorisation
* tenant isolation
* wedding creation
* publishing
* RSVP submission
* RSVP management
* payments
* destructive operations

Use:

* Vitest for unit/integration tests
* Playwright for important end-to-end journeys

Do not create tests merely to increase test counts.

## Documentation

Update documentation only when the behaviour or architectural decision being documented changes.

Examples:

Architecture changed:

* update relevant architecture documentation

Product behaviour changed:

* update relevant product documentation

Pure implementation refactor:

* normally no high-level documentation change

## Scope Control

Only implement:

* the selected feature
* required dependencies
* necessary tests
* necessary documentation changes

Do not opportunistically implement unrelated future backlog items.

## Completion

Before marking a feature `Done`, confirm:

* requirements are satisfied
* appropriate tests pass
* architecture rules are respected
* UX guidance is respected
* customer data remains properly isolated
* no unnecessary scope was introduced
