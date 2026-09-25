# Production release inputs

Fill in the non-secret decisions and identifiers below when they are available. Do **not** put passwords, API keys, private keys, webhook signing secrets, or service-role keys in this file or Git. Share those through the chosen host's secret manager or another secure channel when deployment begins.

## 1. Production ownership and hosting

- [x] Production host/provider: `Render (Hobby workspace; production on a Starter web service, deployed from the GHCR image) — approved 24 September 2026, see F037`
- [ ] Hosting account/project identifier: `
- [x] Deployment region: `Frankfurt (EU Central)`
- [ ] Production domain: `
- [ ] DNS access available: `yes / no`
- [x] TLS/HTTPS will be managed by: `Render (automatic certificates for custom domains)`
- [ ] Monthly spending limit or approval: `
- [x] Staging host/domain, if separate: `Separate Render service on the free instance, using its onrender.com address; password-protected (F041)`
- [ ] Person authorised to approve deployment: `

The host must run the existing Docker production image, support HTTPS, environment secrets, health checks, logs, restarts, and a rollback to the previous image. Proposed host: [F037](backlog.md#f037---choose-the-production-host). Step-by-step setup: [F041](backlog.md#f041---production-setup-guide). Error tracking and analytics: F038 and F039.

## 2. Supabase production project

- [ ] Managed Supabase project reference: `
- [ ] Supabase organisation/project owner: `
- [ ] Production project is separate from local and staging: `yes / no`
- [x] Database region: `Central EU (Frankfurt), to sit next to the app; production on Supabase Pro, staging on Free`
- [ ] Supabase plan supports the expected usage: `yes / no / review needed`
- [ ] Database backup/PITR plan selected: `
- [ ] Storage backup destination selected: `
- [ ] Recovery test environment available: `yes / no`

Needed securely at deployment time: project URL, publishable key, and service-role key. Do not paste them here.

## 3. Authentication and email

- [ ] Production `APP_ORIGIN` (exact HTTPS origin): `
- [ ] Auth email sender name: `
- [ ] Auth email sender address: `
- [ ] Sending domain configured and verified: `yes / no`
- [ ] SMTP provider: `
- [ ] SMTP credentials available securely: `yes / no`
- [ ] Signup confirmation tested in a real inbox: `yes / no`
- [ ] Password recovery tested in a real inbox: `yes / no`
- [ ] Support contact shown to customers: `
Google sign-in (F055) was deferred by the owner on 25 September 2026 and is not needed for launch. Fill in the next four items only when resuming it.

- [ ] Google Cloud project and OAuth client owner (F055): `
- [ ] Google OAuth clients created for staging and production: `yes / no`
- [ ] Google consent screen name: `brand verification (free; shows "SaveTheDates") / Supabase custom domain (paid add-on) / accept "<ref>.supabase.co"`
- [ ] Google sign-in tested on staging with disposable Google accounts: `yes / no`. Record each result in the F055 handoff:
  - a new Google user creates an account and reaches Basics; signing in again returns to the same wedding;
  - a confirmed email/password user signs in with Google (same email) and reaches their existing wedding, and their password still works;
  - pre-account takeover: sign up with email/password but leave it unconfirmed, then sign in with Google using that address. The old password and old confirmation link must then be rejected;
  - a Google account with a different email gets a separate, empty account with the Basics notice;
  - cancelling on Google's consent screen returns to sign-in with the cancelled (or generic failed) message.

Supabase Auth must allow the exact `${APP_ORIGIN}/auth/confirm` and `${APP_ORIGIN}/auth/callback` callbacks. Google client secrets go only into Supabase's Google provider settings, never Git or this file. The privacy notice must say that couples can sign in with Google, and that Google then shares their name, email address and profile-picture link. Supabase Auth stores these with the account; the app itself uses only the email address. The application uses the repository templates in `supabase/templates/`.

## 4. Stripe billing

- [ ] Stripe account/business owner: `
- [ ] Production price confirmed: `GBP 29 one-off / other: `
- [x] Site lifetime confirmed (F022): `6 months after wedding date, fixed when checkout begins, for checkout attempts created after the F024 change is deployed. Purchases and checkout attempts already created retain their frozen 12-month expiry.`
- [ ] Refund policy approved: `
- [ ] Production Stripe account is separate from test account: `yes / no`
- [ ] Webhook endpoint domain: `
- [ ] Live Checkout activation authorised: `yes / no`
- [ ] Live secret key available securely: `yes / no`
- [ ] Live webhook signing secret available securely: `yes / no`
- [ ] Test-mode staging checkout verified: `yes / no`
- [ ] Refund/dispute handling verified: `yes / no`

The webhook endpoint is `${APP_ORIGIN}/api/stripe/webhook`. Required events are documented in [operations.md](operations.md).

## 5. Customer and legal policies

- [ ] Terms of service approved: `link or owner decision: `
- [ ] Privacy notice approved: `link or owner decision: `
- [ ] Data controller/business identity: `
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
- [ ] Sentry project created and values set: `deferred by owner on 25 September 2026`. To do during F041 step 6; see `operations.md` → "Set up Sentry (once)"
- [ ] Recovery point objective (maximum acceptable data loss): `
- [ ] Recovery time objective (maximum acceptable outage): `
- [ ] Backup restore drill owner: `
- [ ] Staging journey tester: `
- [ ] Independent release reviewer: `
- [ ] Planned release window: `
- [ ] Rollback approver: `
- [ ] Final production launch approval: `pending`

The [21 September review follow-up](backlog.md#21-september-review-follow-up) is also a release gate: F013-F020 must be completed or explicitly deferred by the owner, and F021-F022 need recorded decision dispositions. Release inputs alone do not close those tickets.

The [24 September assessment](backlog.md#24-september-walkthrough-assessment) adds F042-F049 to the paid-launch gate. F049 needs actual iPhone Safari access, desktop Firefox and screen-reader/keyboard evidence; record the tester and device availability before scheduling it. F041 completes setup/staging preparation, while F009 owns independent release review, production promotion and smoke verification. Optional analytics, QR codes, calendar downloads, household RSVP and personalised social previews do not block this agreed small release scope.

## When these are ready

Provide this completed file along with secure access to the required services. We will then configure staging, implement the approved data-handling workflow, run the hosted checks and recovery drill, complete release review, and only then perform the authorised production deployment.
