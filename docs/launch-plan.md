# Launch plan: private review, then open

Agreed with the owner on 25 September 2026. This is how SaveTheDates goes from staging to a public, paid launch. It sets the order of work. [Release and operations](operations.md) holds the detailed procedures, [release inputs](release-inputs.md) the recorded values, and [the backlog](backlog.md) the state of each ticket.

## The approach

Production is set up in full, then kept **private behind a password** while the payment and sign-in providers review it and the owner rehearses the whole customer journey on it. Only then does it open to the public. This is a standard soft launch, sometimes called a dress rehearsal:

- **Production itself is tested before any customer uses it.** Hosted services can behave differently from local tests. On 25 September 2026, photo reads failed on hosted Supabase Storage although every local test passed (fixed in migration `20260925000500`). A rehearsal on production, including a real payment, catches that kind of problem first.
- **Stripe and Google can review the real site.** Stripe activates live payments, and Google verifies the brand, only after seeing the homepage and the terms, privacy and refund pages on the real domain. Those pages stay public during the lock.
- **Visitors never meet a half-finished site.** There's no public period where buying fails or sign-in is unapproved.
- **Opening is one reversible switch.** Removing three settings opens the site; putting them back closes it again.

## How the lock works

Production runs with the staging access gate switched on (`APP_ENV=staging`, `STAGING_USERNAME`, `STAGING_PASSWORD`; see [Staging access](operations.md#staging-access)). While it's on:

- sign-up, sign-in, the dashboard and every wedding page ask for the shared login;
- every response is `noindex`, and `robots.txt` disallows everything;
- `/`, `/privacy`, `/terms`, `/refunds`, `/api/health`, the Stripe webhook and the theme images stay open.

The lock password is generated in Render and kept only in the owner's password manager. Visitors who reach the homepage and click sign-up see a password prompt. Search engines are blocked and the site hasn't been shared, so almost nobody will.

## Stages

### 1. Ready on staging (done 25 September 2026)

- The owner approved the legal text (`release-inputs.md` section 5).
- The owner completed a real Stripe test checkout, Google sign-in and a photo upload on staging. The photo upload found the hosted-Storage read bug, which is now fixed.
- Sentry reports from staging.

### 2. Set up production

The owner runs the browser-agent prompt in [production-setup-prompt.md](production-setup-prompt.md) with Claude computer use. It sets up the production Supabase project, Resend SMTP, the Render service (locked), GoDaddy DNS, the Google production client and Stripe live mode, and checks Sentry. It pauses wherever the owner needs to pay or verify their identity. It keeps secrets out of chat and docs, and records non-secret values to copy into `release-inputs.md`.

The engineer (Claude Code) applies every migration in `supabase/migrations/` to the new production project, the same way as staging.

### 3. Private review (usually a few days)

- **Stripe live activation:** the owner completes the business, bank and identity details, and Stripe reviews the site. Once approved, the live secret key and webhook signing secret go on the Render production service.
- **Google:** the consent screen is published and brand verification submitted. Until Google approves, its screen may show the Supabase address instead of "SaveTheDates" (see F063).

### 4. Dress rehearsal on production

The owner does this personally, logged in through the lock, using their own real accounts. Record each result, with the date and the image tag, in the F009 handoff.

1. `https://savethedates.co.uk/api/health` returns `ok`, the certificate is valid, and `www` redirects to the root domain.
2. **Email sign-up:** sign up with a real email address; the confirmation email arrives from `hello@savethedates.co.uk`, and its link signs you in.
3. **Password reset:** request a reset; the email arrives, and the new password works.
4. **Google sign-in:** sign in with a Google account and reach the dashboard.
5. **Wedding setup:** save Basics, upload a large phone photo (it displays, and appears in every theme), fill in Details and switch RSVPs on.
6. **Live payment:** buy the site with your own card for £29. Stripe Checkout opens and returns to Publish, and the entitlement appears.
7. **Publish and share:** publish, open the guest link in a private window, read the Details, and send an RSVP as a guest. The reply appears in Guests.
8. **Refund:** refund the payment in the Stripe dashboard (live mode). The site unpublishes itself, and the guest link stops working. This proves the refund webhook works.
9. **Monitoring:** Sentry shows the `production` environment, and nothing unexpected appears in Render's logs.
10. **Clean up:** remove the test RSVP from Guests. The owner's own account can stay.

If anything fails, fix it on staging first, deploy the fixed image to production, and repeat the affected steps.

### 5. Before opening

The owner decides which remaining launch-gate items must be finished before opening, and records any deliberate deferral in the backlog. As of 25 September 2026, the owner deferred:

- F048, customer data export and deletion;
- F054, the security review;
- F049, real-device and accessibility checks;
- the support mailbox (forwarding `hello@savethedates.co.uk`).

Also still open:

- F061's review;
- F062's real-device check;
- recording F038's staging checks.

F009's release review decides what launch requires. [The backlog](backlog.md#f009---launch-and-operate-the-service) is authoritative.

### 6. Open to the public (launch)

1. Render production: remove `APP_ENV`, `STAGING_USERNAME` and `STAGING_PASSWORD`, then **Save and deploy**.
2. Check that `/robots.txt` now allows the homepage, that `/dashboard` redirects to sign-in rather than asking for the lock login, and that `npm run smoke -- https://savethedates.co.uk` passes.
3. Google Search Console: submit `https://savethedates.co.uk/sitemap.xml`.
4. Watch Sentry and Render's logs closely for the first day.
5. Record the launch time, image tag and digest in F009.

### Closing again, or rolling back

- **To close the site again:** put the three lock settings back, then Save and deploy.
- **To roll back an app change:** redeploy the previous working deploy from Render's history ([Rollback and incidents](operations.md#rollback-and-incidents)).
