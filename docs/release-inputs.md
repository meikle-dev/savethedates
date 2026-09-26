# Production release inputs

Fill in the non-secret decisions and identifiers below when they are available. Do **not** put passwords, API keys, private keys, webhook signing secrets, or service-role keys in this file or Git. Share those through the chosen host's secret manager or another secure channel when deployment begins.

## 1. Production ownership and hosting

- [x] Production host/provider: `Render (Hobby workspace; production on a Starter web service, deployed from the GHCR image) — approved 24 September 2026, see F037`
- [ ] Hosting account/project identifier: `Staging: savethedates-staging (srv-darbpap7lnhs73cp2t50). Production: not created yet (Render needs a payment card)`
- [x] Deployment region: `Frankfurt (EU Central)`
- [x] Production domain: `savethedates.co.uk` (owner, 25 September 2026). Canonical origin `https://savethedates.co.uk` (`APP_ORIGIN`); `www.savethedates.co.uk` redirects to it with a 301.
- [ ] DNS access available: `yes / no`
- [x] TLS/HTTPS will be managed by: `Render (automatic certificates for custom domains)`
- [ ] Monthly spending limit or approval: `
- [x] Staging host/domain, if separate: `https://savethedates-staging.onrender.com` (Render free instance, password-protected; created 25 September 2026)
- [ ] Person authorised to approve deployment: `

The host must run the existing Docker production image, support HTTPS, environment secrets, health checks, logs, restarts, and a rollback to the previous image. Proposed host: [F037](backlog.md#f037---choose-the-production-host). Step-by-step setup: [F041](backlog.md#f041---production-setup-guide). Error tracking and analytics: F038 and F039.

## 2. Supabase production project

- [ ] Managed Supabase project reference: `Staging only: onrblnlwrnbdvyeasqdt (savethedates-staging, Frankfurt, Free). Production not created — Pro is paid and deferred by the owner (26 September 2026)`
- [x] Supabase organisation/project owner: `Ross (owner)`
- [ ] Production project is separate from local and staging: `n/a — no production project yet`
- [x] Database region: `Central EU (Frankfurt), to sit next to the app; production on Supabase Pro, staging on Free`
- [ ] Supabase plan supports the expected usage: `yes / no / review needed`
- [ ] Database backup/PITR plan selected: `
- [ ] Storage backup destination selected: `
- [ ] Recovery test environment available: `yes / no`

Needed securely at deployment time: project URL, publishable key, and service-role key. Do not paste them here.

## 3. Authentication and email

- [ ] Production `APP_ORIGIN` (exact HTTPS origin): `Staging only for now: https://savethedates-staging.onrender.com`
- [x] Auth email sender name: `SaveTheDates`
- [x] Auth email sender address: `hello@savethedates.co.uk`
- [x] Sending domain configured and verified: `yes (Resend, verified 26 September 2026; SPF/DKIM/DMARC added in GoDaddy)`
- [x] SMTP provider: `Resend`
- [x] SMTP credentials available securely: `yes — staging API key set as the staging Supabase project's SMTP password. No production key yet`
- [x] Signup confirmation tested in a real inbox: `yes — owner, on staging, 26 September 2026 (in the inbox, not spam)`
- [x] Password recovery tested in a real inbox: `yes — owner, on staging, 26 September 2026`
- [ ] Support contact shown to customers: `hello@savethedates.co.uk (in the footer and legal pages). Not receiving mail yet: an owner test email on 26 September 2026 went nowhere. F066 sets up forwarding to the owner's Gmail`
Google sign-in (F055) was reopened for staging by the owner on 26 September 2026 (code was already built; see F055). The owner wants it at launch (25 September 2026).

- [x] Address Google shows at sign-in (F063): `savethedates.co.uk, through a Supabase custom domain auth.savethedates.co.uk on production (owner, 26 September 2026; about $10/month add-on). Staging keeps the Supabase address`

- [x] Google Cloud project and OAuth client owner (F055): `Ross (owner); Cloud project "SaveTheDates" (project ID savethedates)`
- [ ] Google OAuth clients created for staging and production: `staging only (client "SaveTheDates staging"); no production client`
- [ ] Google consent screen name: `Testing mode, not published. Only rmeikle55@gmail.com is added as a test user. Staging URLs to enter (temporary): Homepage https://savethedates-staging.onrender.com/, Privacy https://savethedates-staging.onrender.com/privacy, Terms https://savethedates-staging.onrender.com/terms. For production, replace them with https://savethedates.co.uk/, /privacy and /terms (see F041, "To update later")`
- [ ] Google sign-in tested on staging with disposable Google accounts: `partly — the owner confirmed Google sign-in works on staging (25 September 2026); the individual checklist results below were not recorded`. Record each result in the F055 handoff:
  - a new Google user creates an account and reaches Basics; signing in again returns to the same wedding;
  - a confirmed email/password user signs in with Google (same email) and reaches their existing wedding, and their password still works;
  - pre-account takeover: sign up with email/password but leave it unconfirmed, then sign in with Google using that address. The old password and old confirmation link must then be rejected;
  - a Google account with a different email gets a separate, empty account with the Basics notice;
  - cancelling on Google's consent screen returns to sign-in with the cancelled (or generic failed) message.

Supabase Auth must allow the exact `${APP_ORIGIN}/auth/confirm` and `${APP_ORIGIN}/auth/callback` callbacks. Google client secrets go only into Supabase's Google provider settings, never Git or this file. The privacy notice must say that couples can sign in with Google, and that Google then shares their name, email address and profile-picture link. Supabase Auth stores these with the account; the app itself uses only the email address. The application uses the repository templates in `supabase/templates/`.

## 4. Stripe billing

- [x] Stripe account/business owner: `Ross (owner). Reused the existing "Equimarket sandbox" account, renamed to SaveTheDates (Account Name field — Stripe had no separate Branding display name), rather than a new account`
- [ ] Production price confirmed: `GBP 29 one-off / other: `
- [x] Site lifetime confirmed (F022): `6 months after wedding date, fixed when checkout begins, for checkout attempts created after the F024 change is deployed. Purchases and checkout attempts already created retain their frozen 12-month expiry.`
- [x] Refund policy approved: `/refunds (14-day full refund, then if the site doesn't work); approved by the owner, 25 September 2026`
- [ ] Production Stripe account is separate from test account: `n/a — still one account, live mode not activated`
- [x] Webhook endpoint domain: `Staging (test mode) only: https://savethedates-staging.onrender.com/api/stripe/webhook. No live-mode endpoint yet`
- [ ] Live Checkout activation authorised: `no — deferred until there's a reviewable production site`
- [ ] Live secret key available securely: `n/a — not created`
- [ ] Live webhook signing secret available securely: `n/a — not created`
- [x] Test-mode staging checkout verified: `yes — owner completed a real Stripe test Checkout on staging, 25 September 2026 (after the F061 fixes)`
- [ ] Refund/dispute handling verified: `not yet — the 26 September 2026 staging test refunded a different, older test payment, so nothing was revoked (correctly; see F067). Repeat on the site's own £29 payment from 25 September 2026, 21:55 UTC`

The webhook endpoint is `${APP_ORIGIN}/api/stripe/webhook`. Required events are documented in [operations.md](operations.md).

## 5. Customer and legal policies

- [x] Terms of service approved: `/terms, approved by the owner, 25 September 2026; the line listing the Invitation re-approved on 26 September 2026`
- [x] Privacy notice approved: `/privacy, includes the Google sign-in wording; approved by the owner, 25 September 2026`
- [x] Data controller/business identity: `Ross Meikle in the United Kingdom (approved with the legal text, 25 September 2026)`
- [ ] Support process and response target: `
- [ ] Site expiry wording approved: `
- [ ] Data retention period after expiry: `
- [ ] Account deletion policy: `
- [ ] Wedding/site deletion policy: `
- [ ] RSVP response deletion policy: `
- [ ] Uploaded photo deletion policy: `
- [ ] Payment/event record retention policy: `
- [ ] Backup retention policy: `
- [ ] Customer export scope and delivery process: `
- [ ] Privacy/legal review complete: `yes / no`

These choices are required before implementing and testing export/deletion. The app currently preserves private drafts and responses after site expiry; expiry removes public access but does not delete data.

[F048](backlog.md#f048---deliver-the-approved-customer-data-lifecycle) owns delivery of this approved process. Specify whether export/deletion is self-service or support-assisted, how ownership is verified, and which data is included or retained by exception. RSVP CSV alone is not a full customer export. F041 owns policy/contact pages; no placeholder legal text should be published. The walkthrough's legal/provider statements are recommendations to verify, not a compliance assessment.

## 6. Operations and release approval

- [ ] Incident contact name: `
- [ ] Incident contact email/phone: `
- [x] Monitoring/alert destination: `rmeikle55@gmail.com (Sentry and Render alerts)`
- [x] Log retention period: `30 days`
- [ ] Sentry project created and values set: `org meikle, project savethedates, EU (Germany); set on staging and in GitHub on 25 September 2026. Production Render service still to be created and configured. Retention still to be checked after the trial ends (about 9 October 2026)`
- [ ] Recovery point objective (maximum acceptable data loss): `
- [ ] Recovery time objective (maximum acceptable outage): `
- [ ] Backup restore drill owner: `
- [x] Staging journey tester: `Ross (owner); checklist run on staging on 26 September 2026, results in F041`
- [ ] Independent release reviewer: `
- [ ] Planned release window: `following the launch plan (docs/launch-plan.md): production is set up locked, reviewed by Stripe and Google, rehearsed by the owner, then opened. Date to be set`
- [ ] Production dress rehearsal completed (launch plan stage 4): `
- [ ] Rollback approver: `
- [ ] Final production launch approval: `pending`

The [21 September review follow-up](backlog.md#21-september-review-follow-up) is also a release gate: F013-F020 must be completed or explicitly deferred by the owner, and F021-F022 need recorded decision dispositions. Release inputs alone do not close those tickets.

The [24 September assessment](backlog.md#24-september-walkthrough-assessment) adds F042-F049 to the paid-launch gate. F049 needs actual iPhone Safari access, desktop Firefox and screen-reader/keyboard evidence; record the tester and device availability before scheduling it. F041 completes setup/staging preparation, while F009 owns independent release review, production promotion and smoke verification. Optional analytics, QR codes, calendar downloads, household RSVP and personalised social previews do not block this agreed small release scope.

## When these are ready

Provide this completed file along with secure access to the required services. We will then configure staging, implement the approved data-handling workflow, run the hosted checks and recovery drill, complete release review, and only then perform the authorised production deployment.
