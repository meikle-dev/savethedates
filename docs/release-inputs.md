# Production release inputs

Fill in the non-secret decisions and identifiers below when they are available. Do **not** put passwords, API keys, private keys, webhook signing secrets, or service-role keys in this file or Git. Share those through the chosen host's secret manager or another secure channel when deployment begins.

## 1. Production ownership and hosting

- [x] Production host/provider: `Render (Hobby workspace; production on a Starter web service, deployed from the GHCR image) — approved 24 September 2026, see F037`
- [x] Hosting account/project identifier: `Production: savethedates-production (srv-darodugjo6nc738q0n9g, Frankfurt, Starter, health check /api/health, https://savethedates-production.onrender.com), created 26 September 2026, running image ghcr.io/meikle-dev/savethedates:d0490538e871950ef9bf80aa9a8fcb46fc70e467 with no registry credential. Staging: savethedates-staging (srv-darbpap7lnhs73cp2t50) on adb44b2; the two tags differ only in docs, so both run the same code`
- [x] Deployment region: `Frankfurt (EU Central)`
- [x] Production domain: `savethedates.co.uk` (owner, 25 September 2026). Canonical origin `https://savethedates.co.uk` (`APP_ORIGIN`); `www.savethedates.co.uk` redirects to it with a 301.
- [x] DNS access available: `yes — GoDaddy. Root and www point at Render (HTTPS works, www returns 301 to the root, checked 26 September 2026). MX records point to ImprovMX (mx1/mx2.improvmx.com) with SPF v=spf1 include:spf.improvmx.com ~all; Google Search Console verification TXT present; Resend's send/DKIM/DMARC records unchanged`
- [x] TLS/HTTPS will be managed by: `Render (automatic certificates for custom domains)`
- [ ] Monthly spending limit or approval: `
- [x] Staging host/domain, if separate: `https://savethedates-staging.onrender.com` (Render free instance, password-protected; created 25 September 2026)
- [ ] Person authorised to approve deployment: `

The host must run the existing Docker production image, support HTTPS, environment secrets, health checks, logs, restarts, and a rollback to the previous image. Proposed host: [F037](backlog.md#f037---choose-the-production-host). Step-by-step setup: [F041](backlog.md#f041---production-setup-guide). Error tracking and analytics: F038 and F039.

## 2. Supabase production project

- [x] Managed Supabase project reference: `Production: msrpxvlxojnnefezestn (Frankfurt). Staging: onrblnlwrnbdvyeasqdt (savethedates-staging, Frankfurt, Free). All 33 migrations in supabase/migrations/ applied to production in order on 26 September 2026 (about 09:00 UTC); checked against the repo with the Supabase connector's list_migrations the same day. `20260926000100_rsvp_meal_choices` (F068) applied to staging at 16:27 UTC and to production at 19:02 UTC on 26 September 2026`
- [x] Supabase organisation/project owner: `Ross (owner)`
- [x] Production project is separate from local and staging: `yes — msrpxvlxojnnefezestn, separate from staging's onrblnlwrnbdvyeasqdt`
- [x] Database region: `Central EU (Frankfurt), to sit next to the app; production on Supabase Pro (organisation "SaveTheDates Production", checked 26 September 2026), staging on Free`
- [ ] Supabase plan supports the expected usage: `yes / no / review needed`
- [ ] Database backup/PITR plan selected: `
- [ ] Storage backup destination selected: `
- [ ] Recovery test environment available: `yes / no`

Needed securely at deployment time: project URL, publishable key, and service-role key. Do not paste them here.

## 3. Authentication and email

- [x] Production `APP_ORIGIN` (exact HTTPS origin): `https://savethedates.co.uk` (staging: https://savethedates-staging.onrender.com)
- [x] Auth email sender name: `SaveTheDates`
- [x] Auth email sender address: `hello@savethedates.co.uk`
- [x] Sending domain configured and verified: `yes (Resend, verified 26 September 2026; SPF/DKIM/DMARC added in GoDaddy)`
- [x] SMTP provider: `Resend`
- [x] SMTP credentials available securely: `yes — Resend keys "staging" and "production" (created 26 September 2026), each set as its own Supabase project's SMTP password during setup. Production's SMTP settings weren't independently checked; the dress rehearsal's sign-up email confirms them`
- [x] Signup confirmation tested in a real inbox: `yes — owner, on staging, 26 September 2026 (in the inbox, not spam)`
- [x] Password recovery tested in a real inbox: `yes — owner, on staging, 26 September 2026`
- [ ] Support contact shown to customers: `hello@savethedates.co.uk (in the footer and legal pages). Forwarded by ImprovMX to the owner's Gmail; ImprovMX shows the domain Active and the MX records resolve (26 September 2026). Still to do: a test from an address other than the owner's Gmail, because Gmail hides forwarded copies of your own messages (F066)`
Google sign-in (F055) was reopened for staging by the owner on 26 September 2026 (code was already built; see F055). The owner wants it at launch (25 September 2026).

- [x] Address Google shows at sign-in (F063): `Supabase custom domain declined by the owner on 26 September 2026 when asked to confirm the $10/month price ("i dont want to pay that"); production stays on the default msrpxvlxojnnefezestn.supabase.co address, same as staging. Brand verification (F063 option 1) was submitted instead so the consent screen can show "SaveTheDates" regardless of domain, but it failed because Google's crawler can't reach https://savethedates.co.uk/ or /privacy through the APP_ENV=staging password lock ("unresponsive", "behind a login page"). That failure was on the older production image, where / and /privacy hung. Since the redeploy to d049053 they answer 200 without the lock, including to Googlebot's user agent (checked 26 September 2026). Resubmitted after the redeploy and approved on 26 September 2026; the owner published the verified branding`

- [x] Google Cloud project and OAuth client owner (F055): `Ross (owner); Cloud project "SaveTheDates" (project ID savethedates)`
- [x] Google OAuth clients created for staging and production: `both. Production's Supabase project has the Google provider enabled (public auth settings, checked 26 September 2026). Record the production client ID here`
- [x] Google consent screen name: `SaveTheDates. Published ("In production"), and brand verification approved and published (owner, 26 September 2026)`
- [ ] Google sign-in tested on staging with disposable Google accounts: `partly — the owner confirmed Google sign-in works on staging (25 September 2026); the individual checklist results below were not recorded`. Record each result in the F055 handoff:
  - a new Google user creates an account and reaches Basics; signing in again returns to the same wedding;
  - a confirmed email/password user signs in with Google (same email) and reaches their existing wedding, and their password still works;
  - pre-account takeover: sign up with email/password but leave it unconfirmed, then sign in with Google using that address. The old password and old confirmation link must then be rejected;
  - a Google account with a different email gets a separate, empty account with the Basics notice;
  - cancelling on Google's consent screen returns to sign-in with the cancelled (or generic failed) message.

Supabase Auth must allow the exact `${APP_ORIGIN}/auth/confirm` and `${APP_ORIGIN}/auth/callback` callbacks. Google client secrets go only into Supabase's Google provider settings, never Git or this file. The privacy notice must say that couples can sign in with Google, and that Google then shares their name, email address and profile-picture link. Supabase Auth stores these with the account; the app itself uses only the email address. The application uses the repository templates in `supabase/templates/`.

## 4. Stripe billing

- [x] Stripe account/business owner: `Ross (owner). Reused the existing "Equimarket sandbox" account, renamed to SaveTheDates (Account Name field — Stripe had no separate Branding display name), rather than a new account`
- [x] Production price confirmed: `GBP 29 one-off (live purchase made by the owner, 26 September 2026)`
- [x] Site lifetime confirmed (F022): `6 months after wedding date, fixed when checkout begins, for checkout attempts created after the F024 change is deployed. Purchases and checkout attempts already created retain their frozen 12-month expiry.`
- [x] Refund policy approved: `/refunds (14-day full refund, then if the site doesn't work); approved by the owner, 25 September 2026`
- [x] Production Stripe account is separate from test account: `one account; live mode serves production and test mode serves staging, with separate keys and webhooks`
- [x] Webhook endpoint domain: `Live: https://savethedates.co.uk/api/stripe/webhook ("SaveTheDates production", Active, the five required events). Test: https://savethedates-staging.onrender.com/api/stripe/webhook`
- [x] Live Checkout activation authorised: `yes — live mode active; the browser agent saw the live keys in use on 26 September 2026 (about 14:20 UTC)`
- [x] Live secret key available securely: `yes — sk_live_ key in Render production STRIPE_SECRET_KEY only`
- [x] Live webhook signing secret available securely: `yes — in Render production STRIPE_WEBHOOK_SECRET only`
- [x] Test-mode staging checkout verified: `yes — owner completed a real Stripe test Checkout on staging, 25 September 2026 (after the F061 fixes)`
- [x] Refund/dispute handling verified: `refunds, yes — the owner confirmed a live £29 purchase and refund on production, 26 September 2026 (the earlier staging test refunded an unrelated payment; see F067). Disputes not exercised`

The webhook endpoint is `${APP_ORIGIN}/api/stripe/webhook`. Required events are documented in [operations.md](operations.md).

## 5. Customer and legal policies

- [x] Terms of service approved: `/terms, approved by the owner, 25 September 2026; the line listing the Invitation re-approved on 26 September 2026`
- [x] Privacy notice approved: `/privacy, includes the Google sign-in wording; approved by the owner, 25 September 2026; the guest paragraph on meal choices and food preferences (F068) approved on 26 September 2026`
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
- [ ] Sentry project created and values set: `org meikle, project savethedates, EU (Germany); set on staging and in GitHub on 25 September 2026. Production's SENTRY_DSN and SENTRY_ENVIRONMENT=production are part of the production setup; confirm events arrive during the dress rehearsal. Retention still to be checked after the trial ends (about 9 October 2026)`
- [ ] Recovery point objective (maximum acceptable data loss): `
- [ ] Recovery time objective (maximum acceptable outage): `
- [ ] Backup restore drill owner: `
- [x] Staging journey tester: `Ross (owner); checklist run on staging on 26 September 2026, results in F041`
- [ ] Independent release reviewer: `
- [x] Planned release window: `opened 26 September 2026, following the launch plan (docs/launch-plan.md)`
- [ ] Production dress rehearsal completed (launch plan stage 4): `partly — live purchase and refund confirmed by the owner, 26 September 2026; other steps not recorded`
- [ ] Rollback approver: `
- [x] Final production launch approval: `the owner, 26 September 2026 (lock removed; smoke passed at 14:12 UTC on image d049053…, digest sha256:73b8cd9f…5105)`

The [21 September review follow-up](backlog.md#21-september-review-follow-up) is also a release gate: F013-F020 must be completed or explicitly deferred by the owner, and F021-F022 need recorded decision dispositions. Release inputs alone do not close those tickets.

The [24 September assessment](backlog.md#24-september-walkthrough-assessment) adds F042-F049 to the paid-launch gate. F049 needs actual iPhone Safari access, desktop Firefox and screen-reader/keyboard evidence; record the tester and device availability before scheduling it. F041 completes setup/staging preparation, while F009 owns independent release review, production promotion and smoke verification. Optional analytics, QR codes, calendar downloads, household RSVP and personalised social previews do not block this agreed small release scope.

## When these are ready

Provide this completed file along with secure access to the required services. We will then configure staging, implement the approved data-handling workflow, run the hosted checks and recovery drill, complete release review, and only then perform the authorised production deployment.
