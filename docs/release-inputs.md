# Production release inputs

Fill in the non-secret decisions and identifiers below when they are available. Do **not** put passwords, API keys, private keys, webhook signing secrets, or service-role keys in this file or Git. Share those through the chosen host's secret manager or another secure channel when deployment begins.

## 1. Production ownership and hosting

- [ ] Production host/provider: `
- [ ] Hosting account/project identifier: `
- [ ] Deployment region: `
- [ ] Production domain: `
- [ ] DNS access available: `yes / no`
- [ ] TLS/HTTPS will be managed by: `
- [ ] Monthly spending limit or approval: `
- [ ] Staging host/domain, if separate: `
- [ ] Person authorised to approve deployment: `

The host must run the existing Docker production image, support HTTPS, environment secrets, health checks, logs, restarts, and a rollback to the previous image.

## 2. Supabase production project

- [ ] Managed Supabase project reference: `
- [ ] Supabase organisation/project owner: `
- [ ] Production project is separate from local and staging: `yes / no`
- [ ] Database region: `
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

Supabase Auth must allow the exact `${APP_ORIGIN}/auth/confirm` callback. The application uses the repository templates in `supabase/templates/`.

## 4. Stripe billing

- [ ] Stripe account/business owner: `
- [ ] Production price confirmed: `GBP 29 one-off / other: `
- [ ] Site lifetime confirmed (F022): `12 months currently approved/implemented; confirm retain 12 or explicitly approve 6 for future purchases: `
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

## 6. Operations and release approval

- [ ] Incident contact name: `
- [ ] Incident contact email/phone: `
- [ ] Monitoring/alert destination: `
- [ ] Log retention period: `
- [ ] Recovery point objective (maximum acceptable data loss): `
- [ ] Recovery time objective (maximum acceptable outage): `
- [ ] Backup restore drill owner: `
- [ ] Staging journey tester: `
- [ ] Independent release reviewer: `
- [ ] Planned release window: `
- [ ] Rollback approver: `
- [ ] Final production launch approval: `pending`

The [21 September review follow-up](backlog.md#21-september-review-follow-up) is also a release gate: F013-F020 must be completed or explicitly deferred by the owner, and F021-F022 need recorded decision dispositions. Release inputs alone do not close those tickets.

## When these are ready

Provide this completed file along with secure access to the required services. We will then configure staging, implement the approved data-handling workflow, run the hosted checks and recovery drill, complete release review, and only then perform the authorised production deployment.
