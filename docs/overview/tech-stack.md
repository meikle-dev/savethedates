# SaveTheDates Technology Stack

SaveTheDates will use a **single-repository, single-application architecture** built around Next.js.

The goal is to keep the platform simple to develop and operate while supporting strong SEO, fast page delivery, secure customer accounts, payments, email, image storage, and future growth.

## Frontend and application framework

### Next.js — App Router

Next.js will be the primary application framework.

It was chosen because SaveTheDates needs to behave as both:

* an SEO-focused public website
* a SaaS-style authenticated application
* a dynamic wedding-site platform

Next.js supports static generation, server-side rendering, server components, API routes and server actions within one application.

This allows us to build:

```text
/
 /pricing
 /features
 /guides/*
 /examples
```

as highly optimised SEO pages, while also supporting:

```text
/dashboard
/[weddingSlug]
```

within the same application.

This avoids the complexity of maintaining separate frontend and backend applications.

---

### React

React is the UI layer provided by Next.js.

It gives us a strong ecosystem for building reusable components such as:

* wedding templates
* galleries
* RSVP forms
* dashboard components
* guest management interfaces
* onboarding flows

Wedding sites should be composed from reusable components rather than generated as completely separate applications.

---

### TypeScript

TypeScript will be used throughout the application.

This provides strong typing across:

* database models
* API boundaries
* components
* forms
* Stripe integration
* Supabase integration

This is particularly valuable for AI-assisted development with Codex because types provide additional structure and reduce ambiguity when modifying the codebase.

---

### Tailwind CSS

Tailwind CSS will be the main styling system.

It provides fast UI development while keeping styles close to the components that use them.

Wedding themes should still use a structured design system rather than arbitrary styles.

Where appropriate, themes should rely on CSS variables for values such as:

```text
fonts
colours
spacing
borders
backgrounds
```

This should make it possible to support multiple visual themes without duplicating the underlying application.

---

# Data and platform services

### Supabase PostgreSQL

PostgreSQL will be the primary database, hosted through Supabase.

It will hold data such as:

* users
* weddings
* wedding settings
* guests
* RSVPs
* page sections
* subscription/payment state
* theme configuration

PostgreSQL provides a mature relational model that fits this domain well.

Supabase removes much of the infrastructure and database administration overhead while retaining a standard PostgreSQL database underneath.

---

### Supabase Auth

Supabase Auth will handle authentication.

It will initially be used primarily for couples managing their wedding site through the dashboard.

Using Supabase Auth keeps authentication integrated closely with the database and avoids building a custom authentication system.

---

### Supabase Storage

Supabase Storage will be used for customer-uploaded assets such as:

* engagement photos
* wedding photos
* cover images
* gallery images

Keeping storage alongside the database and authentication platform reduces integration complexity.

Image optimisation and delivery can then be handled through the application/CDN layer.

---

# Payments

### Stripe

Stripe will handle customer payments.

SaveTheDates is expected to primarily use simple one-off purchases initially rather than complicated subscriptions.

Stripe provides:

* hosted checkout
* payment processing
* refunds
* receipts
* webhook events
* strong developer tooling

The application should treat Stripe webhook events as the authoritative source for payment state.

---

# Email

### Resend

Resend will handle transactional email.

Typical emails may include:

* account verification
* purchase confirmation
* wedding-site publication confirmation
* RSVP notifications
* password/reset emails
* operational notifications

It integrates cleanly with modern TypeScript/Next.js applications and keeps transactional email infrastructure simple.

---

# Hosting and deployment

### Vercel

Vercel will host and deploy the Next.js application.

It was chosen because it provides first-class support for Next.js, including:

* CDN delivery
* serverless execution
* preview deployments
* image optimisation
* environment configuration
* automatic GitHub deployments

This keeps deployment and infrastructure management extremely lightweight.

The architecture should not depend unnecessarily on proprietary Vercel features so migration remains possible if the platform grows significantly.

---

# Testing

### Vitest

Vitest will be used for unit and integration testing.

It is fast, TypeScript-friendly and suitable for testing:

* business logic
* validation
* utilities
* services
* domain behaviour

---

### Playwright

Playwright will be used for end-to-end testing.

Important customer journeys should be covered, including:

```text
customer signup
→ purchase
→ wedding setup
→ publishing
→ guest visit
→ RSVP submission
→ customer views RSVP
```

These tests provide confidence that the platform works as a complete system rather than only at the component level.

---

# Application architecture

SaveTheDates will initially remain a **single Next.js application**.

Server-side functionality will use:

* Next.js Server Actions
* Route Handlers
* server-side services

rather than a separate API application.

The overall architecture is:

```text
Browser
   │
   ▼
Next.js
├── Marketing pages
├── Wedding sites
├── Dashboard
├── Server Actions
└── Route Handlers
   │
   ├── Supabase
   │   ├── PostgreSQL
   │   ├── Auth
   │   └── Storage
   │
   ├── Stripe
   └── Resend
```

A separate backend service should only be introduced when there is a concrete technical reason for doing so.

---

# Routing strategy

Public marketing pages will be designed primarily for discoverability and SEO.

Examples:

```text
/
/pricing
/wedding-website
/online-wedding-rsvp
/digital-save-the-date
/guides/*
```

Customer wedding sites will use dynamic routes:

```text
/[weddingSlug]
```

For example:

```text
/chloeandross
/sophieandjames
```

Wedding sites will be generated from database content rather than existing as separate applications or deployments.

Authenticated management functionality will live under:

```text
/dashboard
```

---

# SEO strategy

SEO is a core architectural requirement.

Marketing and content pages should favour:

* static generation where possible
* server rendering where appropriate
* semantic HTML
* structured metadata
* OpenGraph metadata
* sitemap generation
* canonical URLs
* structured data
* excellent Core Web Vitals

Customer wedding sites should be **`noindex` by default** for privacy.

The SEO objective is to rank the SaveTheDates platform and its useful content, not individual customers' private wedding information.

---

# Architectural constraints

Unless future requirements justify otherwise:

* do not introduce a separate .NET API
* do not introduce microservices
* do not introduce a second frontend application
* do not create separate deployments for each wedding
* do not build custom authentication
* do not introduce unnecessary infrastructure

The default architectural principle should be:

> Choose the simplest architecture that supports the current requirements while leaving clear paths for future growth.

This stack should allow SaveTheDates to move quickly from MVP to a production SaaS platform while keeping development, infrastructure and maintenance overhead low.
