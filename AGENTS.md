# SaveTheDates agent instructions

Build a simple wedding website service: Save the Date, Wedding Details, and RSVP. `docs/` is the durable source of truth; use `docs/index.md` for relevant paths. Keep solutions clean, mobile-first, and deliberately small.

## Default work request

For "work on this project" or "build the next feature", execute this workflow, not just a plan:

1. Check the working tree; preserve existing user changes. Read `docs/backlog.md`.
2. Resume an unfinished `In Progress` feature if it can proceed. Otherwise choose the first `Ready` feature whose dependencies are `Done`.
3. If neither exists, use the Product Manager role to prepare the earliest unblocked `Planned` feature, then continue to implementation in the same session. If the backlog is missing, create it from the product overview first.
4. Read only the selected role and feature's references. Resolve routine choices autonomously. Ask only for missing information that materially affects scope, cost, data exposure, or an external action and cannot be inferred. Record genuine blockers on the feature; other independent work may proceed without silently dropping blocked work.
5. Mark the feature `In Progress`. Implement, verify, and obtain review when required below. Finish that feature before starting another; a general request covers one feature unless the user requests a larger scope.
6. Update the feature's status and handoff: what exists, checks and results, unresolved blockers, and the exact next step. Report the outcome and next feature briefly. Never mark incomplete or unverified work `Done`.

An explicit audit, planning, or review request does not authorise starting feature implementation. The current user request takes priority over this default workflow.

## Roles and delegation

Role files are instructions to read when needed, not automatically running agents:

- `.agents/product-manager.md`: scope, acceptance criteria, ordering, and backlog ownership.
- `.agents/software-engineer.md`: default implementation role.
- `.agents/ux-ui-designer.md`: new flows or unresolved visual decisions; skip when already documented.
- `.agents/reviewer.md`: independent review for significant features, auth, tenant isolation, payments, important database/architecture changes, and release readiness.
- `.agents/seo-growth.md`: indexed marketing, content, search, and launch only.

Use one main agent for sequential product, UX, and engineering work. Spawn a separate reviewer for the review cases above when supported; give it the feature ID, relevant paths, changed files, and validation results rather than the entire conversation. Parallel agents are optional only for concrete independent work with clear file ownership. Do not create a full team for every feature. If independent review is unavailable, record that fact and leave required review outstanding for a later session; do not describe self-review as independent.

## Context and documentation budget

- Read this file, the backlog selection, the active role, and directly relevant docs/code. Do not reread the whole repository every session.
- Search before loading large files; inspect PNG references only for visual work. Reuse already-read context.
- The backlog is the single delivery plan. Do not generate separate spec/plan/task documents by default. Add a focused document only when complexity warrants it; link rather than duplicate.
- Keep completed entries concise. Store decisions in the relevant canonical document and current progress on the feature, not in chat-only memory or growing session diaries.
- Use targeted tests during development and the required final checks once after the last change. Repeat only when changes or failures justify it.

## Engineering guardrails

- Follow `docs/overview/tech-stack.md` and `docs/overview/architecture.md`: one Next.js application, no separate backend or speculative infrastructure.
- Maintain server-enforced ownership and tenant isolation, including database and storage policies. Never expose secrets or trust client-side authorisation.
- Published wedding pages are accessible to anyone with the URL; `noindex` is not access control. Drafts, guest responses, and owner data must remain private.
- Keep the three themes functionally equivalent. Public marketing is SEO-first; wedding sites are `noindex` and excluded from sitemaps.
- Never overwrite unrelated work, commit credentials, invent test results, or publish placeholder marketing claims. Local development does not require repeated approval. External actions follow existing user authorisation; obtain missing access or genuinely required decisions only when needed.

## Definition of done

Acceptance criteria work; relevant automated checks pass; UI changes are inspected at mobile and desktop widths; security/architecture/design rules hold; required independent findings are resolved (or non-blocking deferrals justified); relevant docs and backlog are current. Record exact verification commands and results, including anything not run.

There is currently no application or test runner. The first feature must establish Docker support, reproducible setup, scripts, and CI checks, populating the initially empty root `run-app-instructions.md` with verified commands and linking it from README. Subsequent sessions use those commands. Do not claim documentation checks prove application behaviour.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
