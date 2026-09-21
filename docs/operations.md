# Release and operations

F009 is in preparation. This is an operating procedure, not evidence that a hosted release or restore has succeeded. Current results and blockers live in [the backlog](backlog.md#f009---launch-and-operate-the-service). The information needed from the owner is listed in [production release inputs](release-inputs.md). Local commands are in [running instructions](../run-app-instructions.md).

## Release inputs

Before provisioning, record the owner's selected container host, domain, region, managed Supabase project, spending authority, support address and incident contact. Keep production separate from staging: distinct Supabase projects, Stripe test/live credentials and webhook endpoints, SMTP credentials and application origins. Store secrets in the host's secret manager, never Git or build arguments. Staging must be access-restricted at the host; the application homepage intentionally permits indexing.

Owner-approved terms/privacy, retention periods, deletion handling (including payment records and backups), support process, and recovery objectives are still required. Export and deletion tooling is not implemented. Do not accept real customers until these gaps and the hosted release checks below are resolved.

## Container and runtime configuration

Build the existing Dockerfile's `production` target from the reviewed commit; tag with that commit and retain its image digest and previous working digest. Deploy the identical image to staging and production. It runs the standalone Next.js server as `node`, listening on port 3000. Terminate HTTPS at the host proxy and preserve the public Host/Origin for Server Actions. Start with one application instance. Do not cache authenticated pages, wedding pages, photos, auth callbacks or webhooks at the proxy.

| Runtime variable | Production value |
| --- | --- |
| `APP_ORIGIN` | Exact public HTTPS origin, without path or trailing slash; used for auth, checkout returns and search metadata |
| `SUPABASE_URL` | Chosen managed project's HTTPS API URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key for that same project |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project's server-only service-role key, used by the verified webhook |
| `STRIPE_SECRET_KEY` | Test key on staging; live key only for the approved production release |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's registered webhook endpoint |

The image excludes `.env*`; set all six values at runtime. Never copy the generated local `.env.docker` to a hosted environment. Local fixture keys and Stripe placeholders are unusable for real Checkout. Use `/` for a basic HTTP 200 liveness probe; it deliberately does not test database, email or billing connectivity.

## Database, email and payments

1. Verify the target project identifier and environment before any database write. Capture a recoverable database backup and separate Storage backup before upgrading an existing environment. On a new staging project, apply all committed `supabase/migrations/` in order using the pinned repository CLI. For a deliberately linked project, inspect `npx supabase migration list`, then `npx supabase db push --dry-run`, review the pending SQL, and only then run `npx supabase db push`. Do not run local reset, test fixtures or local environment generation against production.
2. In managed Auth, enable email/password confirmation, set Site URL to `APP_ORIGIN`, and allow the exact `APP_ORIGIN/auth/confirm` redirect. Copy the signup/recovery templates from `supabase/templates/`; the application expects token hashes at `/auth/confirm`. Configure verified Resend SMTP credentials in Supabase Auth, not a second application email flow. Verify signup and recovery in real external inboxes, including expired links and return to the correct host. Supabase's [default SMTP service is for non-production use](https://supabase.com/docs/guides/auth/auth-smtp); see its [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
3. Register `/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `refund.created`, and `charge.dispute.created`. Use the endpoint-specific secret. Verify test Checkout and delivery/retries on staging. A browser success redirect alone does not grant publication. Live purchase/refund verification needs the owner's release authority and records of the actual result.

## Verification and promotion

The repository's automated account/database tests create and delete fictional local users and use local Mailpit and signed webhook fixtures. **Do not point `test:release`, integration or persistence tests at a hosted deployment.** They require a local Supabase stack and test Stripe placeholders. They do not verify hosted Checkout, SMTP, a managed database, or real payment processing.

For a production container connected to local Supabase, set `E2E_BASE_URL` to its origin, `E2E_PRODUCTION=1`, and run `npm run test:release`. This covers signup/recovery, private drafts, purchase gates and webhook failures, photo/publication, all themes, Details, invitation RSVP and owner responses, plus marketing/SEO. CI runs this same group against its production container after integration and persistence checks. Keep `APP_ORIGIN` equal to the browser origin and use a callback origin allowed by local Auth (port 3000 is already configured).

On staging, manually verify the complete journey using a disposable owner and guest: confirm email, save details/photo, switch themes, preview, complete real Stripe test Checkout, publish, read Details, submit/correct RSVP, view responses, unpublish and confirm page/photo denial. Verify a second owner cannot read the first owner's workspace or responses. Exercise failed payment, webhook replay/refund, expired invitation, revoked invitation and account recovery. Record results and clean up only that disposable owner's data.

Before promotion, obtain independent release review. Check HTTPS, intended canonical and Open Graph origins, `/media/share`, `/robots.txt`, homepage-only `/sitemap.xml`, homepage indexation and noindex on examples/account/wedding routes. Check mobile usability and page performance on the actual host. Ensure no staging origin, placeholder legal copy or unapproved claims are public. Deploy the reviewed image digest, run `npm run smoke -- https://<approved-domain>` and repeat the essential hosted journey with authorised verification data. Record timestamp, commit/digest, migration versions and reviewer outcome in F009. Launch remains incomplete until actual deployment and smoke are recorded.

## Rollback and incidents

Keep the prior image digest and configuration version available. On application regression, route traffic to the prior image only if compatible with the current schema, then rerun smoke and the affected workflow. Prefer forward fixes for database migrations; never drop columns or restore an old database merely to roll back application code. If compatibility is uncertain, put the host into maintenance mode while resolving it. Exercise image rollback on staging before release.

Configure the chosen host to alert the incident contact on failed liveness, elevated server errors and restart loops. Monitor Supabase availability/storage capacity, SMTP failures and Stripe failed webhook deliveries. Redact auth tokens, invitation query strings, guest details and secrets from proxy and application logs. Alerting, log retention and contact routing must be exercised on the selected host; no monitoring service is configured yet.

For payment-success/publication failures, inspect the Stripe event ID and delivery status, verify environment and signature configuration, then retry delivery after correction. Do not manually grant entitlement from a screenshot or success URL. For exposure, disable the affected publication or restrict host traffic, preserve a minimal incident record and assess scope with the owner. Support must verify ownership before discussing guest responses or making account changes; never request passwords or invitation tokens.

## Recovery and data handling

Choose and approve recovery-time and recovery-point objectives, backup frequency/retention and a restricted backup destination before launch. Supabase [database backups do not contain Storage file bytes](https://supabase.com/docs/guides/platform/backups). Back up the private `wedding-photos` objects separately, including orphaned objects from failed replacement cleanup, along with a manifest/checksums and the database snapshot association. Encrypt backups and keep restore credentials separate from the application.

Exercise recovery into an isolated non-production project: restore database/Auth state and Storage bytes, reapply required project configuration, validate schema/RLS and object checksums, then verify owner sign-in, private drafts/photos, publication gating and RSVP responses. Disable outbound production email/webhooks during the drill. Record restore duration and recovered snapshot age against the approved objectives. Before reopening a restored service, reconcile Stripe events since the snapshot and reapply deletion requests so revoked entitlements or deleted customer data are not resurrected. The existing persistence test verifies restart survival only; it is not a backup/restore drill.

Current expiry hides guest pages, photos and RSVP after the purchased period (12 months after the wedding date frozen at checkout). It preserves private drafts and responses; it does not delete data. Refund/dispute revocation also removes public access. Approved retention and deletion rules must explicitly cover Auth accounts, wedding/details rows, invitations/responses, all photo paths and orphans, payment/event records, logs and backup expiry. Never delete only the Auth user and assume Storage bytes were removed. The export scope must include the verified owner's content, invitations/responses and photos without exposing other owners, credentials or unrelated payment events. Implement and test the approved process before handling real requests; no legal retention period is assumed here.
