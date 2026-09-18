
# SaveTheDates Agent Instructions

## Purpose

SaveTheDates allows couples to create a simple wedding website for their guests.

The core guest experience is:

* Save the Date landing page
* Wedding Details page
* RSVP

The repository documentation under `docs/` is the source of truth.

---

# Agent Roles

Specialist agent instructions live under `.agents/`.

Available roles:

* Product Manager: `.agents/product-manager.md`
* UX/UI Designer: `.agents/ux-ui-designer.md`
* Software Engineer: `.agents/software-engineer.md`
* Reviewer: `.agents/reviewer.md`
* SEO & Growth: `.agents/seo-growth.md`

Use only the roles necessary for the current task.

Do not involve every agent automatically.

---

# Default Workflow

The normal workflow is:

```text
Product Manager
    ↓
defines and prioritises features
    ↓
UX/UI Designer
    ↓
only when UX/design decisions are required
    ↓
Software Engineer
    ↓
implements the feature
    ↓
Reviewer
    ↓
only for significant or high-risk work
```

SEO & Growth is separate from the normal development workflow and should only be used when working on public marketing, search visibility, content, or launch readiness.

---

# Product Backlog

The canonical product backlog lives at:

`docs/backlog.md`

The Product Manager owns this file.

Each feature should contain:

* ID
* title
* short description
* value/purpose
* dependencies
* status

Use these statuses:

* `Planned`
* `Ready`
* `In Progress`
* `Done`
* `Deferred`

Features should be ordered in the recommended implementation sequence.

The Product Manager should define product-level features, not low-level programming tasks.

---

# Role Routing

## Use Product Manager when

* initially creating the backlog
* defining a new feature
* changing product behaviour
* clarifying scope
* prioritising features
* deciding what belongs in the MVP

## Use UX/UI Designer when

* a new screen or flow needs designing
* an existing flow changes significantly
* a wedding theme is being created or changed
* usability is unclear

Do not involve UX when the required design is already documented.

## Use Software Engineer when

* implementing a Ready feature
* fixing bugs
* refactoring
* writing tests
* changing the database
* integrating external services

The Software Engineer is the default implementation agent.

## Use Reviewer when

* a significant feature has been completed
* authentication or authorisation changed
* tenant isolation changed
* payments changed
* important database behaviour changed
* architecture changed
* preparing for release

Minor fixes do not require an independent review.

## Use SEO & Growth when

* working on indexed marketing pages
* performing keyword research
* creating public content
* changing metadata or structured data
* planning site information architecture
* preparing for launch
* reviewing organic search performance

Do not involve SEO in ordinary product development.

---

# Context Efficiency

Always minimise context usage.

Read:

1. `AGENTS.md`
2. the selected role file
3. the relevant backlog entry
4. only the directly relevant documentation
5. only the relevant source code

Do not read every file under `docs/` for every task.

Do not load every agent definition.

Do not involve unrelated specialists.

---

# Documentation

Long-lived product and technical decisions belong under:

`docs/`

The backlog lives at:

`docs/backlog.md`

Update documentation only when the behaviour or decision it describes actually changes.

Do not create documentation for trivial implementation details.

---

# Engineering Principles

* Prefer simple solutions.
* Build only what is currently required.
* Keep the product deliberately focused.
* Use the documented technology stack.
* Keep the application mobile-first.
* Maintain strict customer data isolation.
* Public marketing pages are SEO-first.
* Customer wedding websites are `noindex` by default.
* Avoid speculative abstractions.
* Avoid microservices.
* Avoid a separate backend unless explicitly approved.
* Tests should be proportional to risk.

---

# Definition of Done

A feature is complete when:

1. The documented behaviour works.
2. Its requirements are satisfied.
3. Appropriate automated tests pass.
4. Existing product, UX and architecture rules are respected.
5. Relevant documentation is updated if necessary.
6. The backlog status is changed to `Done`.

---

# Primary Principle

Operate like a small experienced product team.

Use the Product Manager to decide what should be built.

Use UX only when design work is actually required.

Use the Software Engineer to build it.

Use the Reviewer when independent technical review provides meaningful value.

Use SEO only when search or marketing work is relevant.




You are free to suggest improvements. You are not limited to the contents of the docs. 
Always follow the principle of clean, seperation of concerns, KISS, clean effective code. No hacks. No workarounds. Always clean and simple. 
