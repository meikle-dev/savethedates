# SaveTheDates Project Architecture

Use a **single-repo, single-application architecture** built around Next.js App Router.

## Core repository structure

```text
savethedates/
├── AGENTS.md
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.example
│
├── docs/
│   ├── index.md
│   ├── product/
│   │   ├── vision.md
│   │   ├── requirements.md
│   │   ├── personas.md
│   │   ├── user-journeys.md
│   │   └── roadmap.md
│   │
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── data-model.md
│   │   ├── authentication.md
│   │   ├── multi-tenancy.md
│   │   ├── seo.md
│   │   └── payments.md
│   │
│   ├── decisions/
│   │   └── ADR-001-tech-stack.md
│   │
│   └── operations/
│       ├── deployment.md
│       └── environments.md
│
├── specs/
│   └── 001-example-feature/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
│
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   ├── dashboard/
│   │   ├── api/
│   │   └── [weddingSlug]/
│   │
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── types/
│   └── styles/
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── public/
```

## AGENTS.md

Keep `AGENTS.md` short.

It should tell Codex:

* what SaveTheDates is
* where canonical documentation lives
* architectural rules
* coding and testing conventions
* definition of done
* when documentation must be updated

Do not duplicate full requirements inside it.

## docs/

`docs/` is the **long-lived source of truth** for the system.

Use it for:

* product requirements
* architecture
* data model
* security
* tenancy
* SEO
* payments
* deployment
* ADRs

Think:

**`docs/` = what the system is and why it works that way.**

## GitHub Spec Kit + specs/

Use **GitHub Spec Kit** for feature-level delivery.

Each meaningful feature should get its own directory:

```text
specs/003-rsvp/
├── spec.md
├── plan.md
└── tasks.md
```

Spec Kit should drive the workflow:

```text
feature idea
→ specification
→ clarification
→ technical plan
→ tasks
→ Codex implementation
→ validation
→ docs updated if architecture/product behaviour changed
```

Think:

**`specs/` = what we are building or changing next.**

Spec Kit does not replace `docs/`; it sits alongside it.

## src/

Organise application code mainly by **feature/domain**.

Prefer:

```text
features/
├── weddings/
├── guests/
├── rsvp/
├── billing/
└── auth/
```

Shared UI goes in `components/`.

External integrations and infrastructure helpers go in `lib/`.

## Architecture rules

* One Next.js application
* No separate backend initially
* Next.js Server Actions / Route Handlers
* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage
* Stripe
* Resend
* Vercel
* Multi-tenant data model from day one
* Marketing pages optimised for SEO
* Wedding sites rendered via `/[weddingSlug]`
* Wedding sites `noindex` by default
* Strong TypeScript
* Zod validation at boundaries
* Database migrations committed to Git
* Business logic kept out of React components where practical

## Mental model

```text
AGENTS.md
    ↓
How Codex should work

docs/
    ↓
Permanent product + architecture knowledge

specs/
    ↓
GitHub Spec Kit feature workflow

src/
    ↓
Implementation
```

The repository should remain the canonical knowledge base so Codex never needs previous chat history to understand the system.
