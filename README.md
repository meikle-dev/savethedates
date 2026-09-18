# SaveTheDates

A simple wedding website service: Save the Date, Wedding Details, and RSVP, with three visual themes.

The first application slice is a responsive Modern Minimal Save the Date preview, built with Next.js, TypeScript, and Tailwind. It uses fictional development fixtures; accounts, publication, Details, and RSVP are tracked as later features.

## Working with Codex

Open this repository and say **"Work on this project, please."** The [agent instructions](AGENTS.md) direct the session to resume unfinished work or deliver the next eligible feature in the [backlog](docs/backlog.md), including checks and an updated handoff. A general request covers one feature; explicitly request more if desired.

The Product Manager role maintains the backlog. Role files under `.agents/` are read as needed; they are not a background agent service. Most work stays within one session, with a separate reviewer for significant or risky changes. The repository records continuity between sessions.

These instructions guide a running Codex session; they do not schedule work, bypass usage limits, or supply external accounts. Credentials and business decisions are requested only when a feature needs them. Never paste secrets into documentation. No plugins or agent orchestration framework are required to begin.

See the [documentation map](docs/index.md) for product and visual references. The first implementation feature is **F001: Save the Date preview**, without external service dependencies.

## MVP and continued development

F001-F006 form the usable MVP. The Product Manager verifies that milestone against the completed features and the full owner-to-guest journey. F007-F009 then prepare paid launch. The MVP is the first working version of this application; subsequent work extends it through the same backlog and workflow. After launch, the Product Manager prioritises further work from your direction and customer feedback.

## Running the stack

[run-app-instructions.md](run-app-instructions.md) contains prerequisites, Docker and direct Node.js commands, local URLs, automated checks, and production smoke instructions. Start there to run the preview.

The application runs as one Docker container or directly with Node.js. F002 will add local Supabase services managed by the Supabase CLI in Docker. The production image contains the same single application, with development fixtures disabled. See the [architecture](docs/overview/architecture.md) for the longer-term requirements.

## Decisions needed later

Initial implementation can proceed now. Before paid launch, the owner must settle pricing/currency, purchase entitlement and site lifetime, refund terms, and customer-data retention/deletion terms. These are tracked against billing and launch in the backlog. Provider accounts, domain access, and production credentials will also be needed at integration/deployment time.
