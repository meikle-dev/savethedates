# Task: set up SaveTheDates production (Supabase, Resend, Render, GoDaddy, Google sign-in, Stripe, Sentry)

You are operating my Chrome browser to set up the production environment for my web app, SaveTheDates (a wedding "save the date" website builder). I am Ross, the owner of every account involved, and I'm logged in to them in this browser. Staging already exists and works; production does not exist yet. Your job is to create production so it mirrors staging, with production-only projects, keys, OAuth clients and webhooks, and to keep it locked (password-protected) until I approve launch.

**The order below matters; follow it.** Some services check others before they'll work:

- Stripe and Google both **review the live website**, so the production domain must be up first, serving my approved legal pages.
- Google's production client needs the production Supabase project to exist first.
- Render needs Supabase's keys.

Some steps also need me to pay, or to prove my identity. Those are marked **⏸ PAUSE: Ross**. Stop there, tell me exactly what's needed, and wait.

## Ground rules (read these first and follow them throughout)

1. **Secrets never leave the dashboards.** Copy each secret from the service that issues it and paste it straight into the one place it belongs (see "Where each production secret goes"). Never type a secret into your chat replies, notes, summaries, a document, a Git repo, or a search box. Re-hide revealed secrets after copying. When you report back, give secret *names* and where you saved them, never their values.
2. **I do anything involving money, identity or bank details myself.** Card numbers, bank details, ID documents, date of birth, home address and legal declarations are mine to enter. You may navigate to the right screen and suggest the non-sensitive values to use.
3. **Don't touch staging.** Don't change:
   - the staging Render service `savethedates-staging`;
   - the staging Supabase project `savethedates-staging` (ref `onrblnlwrnbdvyeasqdt`);
   - Stripe **test** mode;
   - the Resend `staging` key;
   - the Google OAuth client "SaveTheDates staging".

   You may *open* staging pages to copy non-secret settings, or to check which kind of key it uses.
4. **Don't delete anything** unless a step says so. If something exists that you weren't told about, stop and ask.
5. **Don't guess.** Dashboards change. Find the equivalent setting, and if it's still ambiguous, ask me.
6. **Keep a running log** of non-secret values: project refs, service IDs, URLs, the image tag, OAuth client IDs (client IDs aren't secret; client secrets are), webhook URLs, and the settings you changed. You'll hand it back at the end.

## Costs and what I need ready (tell me this summary before you start)

| Service | What it costs / needs | When |
| --- | --- | --- |
| Supabase | **Pro plan, $25/month**, on a new organisation just for production (Pro includes enough compute credit for one small project). Needs my card | Phase 1 |
| Render | The production web service on the **Starter** instance, **$7/month** (the workspace itself stays on the free Hobby plan). Needs my card on the workspace | Phase 3 |
| GoDaddy | DNS changes are free. Email forwarding for `hello@savethedates.co.uk` may be free; if it needs a purchase, ask me | Phase 4 |
| Google Cloud | Free. Brand verification is free but reviewed by Google, usually taking a few working days | Phase 6 |
| Stripe | No monthly fee, only per-payment fees. **Live-mode activation needs me:** legal name, date of birth, home address, phone, business type (probably individual / sole trader), a UK bank account for payouts, and possibly an ID document or proof of address. Stripe also reviews the website | Phase 7 |
| Resend, Sentry | Free plans; nothing to pay | Phases 2, 8 |

**Already done:** I approved the legal pages, `/terms`, `/privacy` and `/refunds`, as written (25 September 2026). They name the operator as "Ross Meikle in the United Kingdom", give the contact as `hello@savethedates.co.uk`, and include the Google sign-in wording. Every current image contains them. Google and Stripe both read these pages during their reviews.

**Why production starts locked:** this is the agreed launch plan, a "private review, then open" approach. Production is set up completely but kept behind a password while Stripe and Google review the site and I run a full rehearsal on it. The homepage and legal pages stay public, because the reviewers need them. Opening to the public happens later, and isn't part of this task.

## What already exists (don't recreate it)

- **GitHub repo** `meikle-dev/savethedates`. CI builds and tests each push to `main`, then publishes `ghcr.io/meikle-dev/savethedates:<full commit SHA>` and deploys it to staging automatically. The repo already has `SENTRY_AUTH_TOKEN`, `SENTRY_ORG=meikle`, `SENTRY_PROJECT=savethedates` and `RENDER_STAGING_DEPLOY_HOOK`. **Add nothing to GitHub.** Production is deployed by hand, never by a deploy hook.
- **Render**, "Ross's workspace":
  - staging service `savethedates-staging` (Frankfurt, Free, health check `/api/health`);
  - a registry credential named `ghcr-savethedates`, reused for production.
  - The workspace may have no payment card yet.
- **Supabase**: one organisation (Free) containing only the staging project `savethedates-staging` (Frankfurt). Its Auth, email templates, Google provider and Resend SMTP are configured.
- **Resend**:
  - The domain `savethedates.co.uk` is **verified** (eu-west-1), with sending on and receiving off. Its SPF, DKIM and DMARC records are in GoDaddy DNS; **don't change them.**
  - There's one API key, named `staging`.
- **Google Cloud**:
  - Project "SaveTheDates" (project ID `savethedates`).
  - OAuth client **"SaveTheDates staging"** (Web application), whose redirect URI is the staging Supabase callback.
  - The OAuth consent screen (Google Auth Platform) is **External, in Testing mode, not published**; only `rmeikle55@gmail.com` is a test user. Its branding may hold temporary staging URLs, or none.
- **Sentry**:
  - Org `meikle`, project `savethedates`, EU (Germany). One project serves both environments, told apart by environment name.
  - IP storage off, default scrubbers on.
  - Allowed Domains should include the staging host, `savethedates.co.uk` and `www.savethedates.co.uk`.
  - Issue alerts email `rmeikle55@gmail.com`.
- **Stripe**: one account, renamed to SaveTheDates. Test mode serves staging (webhook `https://savethedates-staging.onrender.com/api/stripe/webhook`). **Live mode is not activated.**
- **Staging works end to end:** on 25 September 2026 I confirmed a real Stripe test checkout, Google sign-in and a photo upload on staging. Production should behave the same.
- **Domain**: `savethedates.co.uk`, with DNS at **GoDaddy**. Production origin `https://savethedates.co.uk`; `www` redirects to it.

## Where each production secret goes

| Secret | Where you get it | The only place it goes |
| --- | --- | --- |
| Supabase production database password | You set it when creating the project | My password manager. Ask me to save it |
| Supabase production publishable key | Supabase production → Project Settings → API Keys | Render production `SUPABASE_PUBLISHABLE_KEY` |
| Supabase production service-role / secret key | Same page | Render production `SUPABASE_SERVICE_ROLE_KEY` |
| Resend production API key | Resend → API Keys (new key `production`) | Supabase production → Authentication → SMTP → Password |
| Google production OAuth **client secret** | Google Auth Platform → Clients → "SaveTheDates production" | Supabase production → Authentication → Sign In / Providers → Google → Client Secret |
| Pre-launch lock password | Render's **Generate** button on the env var | Render production `STAGING_PASSWORD`. I'll also copy it into my password manager |
| Sentry DSN (not truly secret, but treat it carefully) | Sentry → project `savethedates` → Settings → Client Keys (the same DSN staging uses) | Render production `SENTRY_DSN` |
| Stripe live secret key (`sk_live_…`) | Stripe (live mode) → Developers → API keys | Render production `STRIPE_SECRET_KEY` |
| Stripe live webhook signing secret (`whsec_…`) | Stripe (live mode) → the new webhook endpoint | Render production `STRIPE_WEBHOOK_SECRET` |

The Google **client ID** isn't secret. It goes in Supabase's Google provider (Client ID field) and in your log. Never put test/staging values on production or production values on staging.

---

## Phase 1 — Supabase production project  ⏸ PAUSE: Ross pays for Pro

1. Plans are per *organisation*, so to keep staging free, create a **new organisation** named `SaveTheDates Production`. **⏸ PAUSE: Ross** selects the **Pro** plan and enters card details. Keep the spend cap **on**. Don't buy PITR or other add-ons.
2. In the new organisation, create project `savethedates-production`:
   - region **Central EU (Frankfurt)** (`eu-central-1`);
   - default compute.

   Generate a strong database password, then **⏸ PAUSE: Ross** saves it in the password manager.
3. Log the **project ref** (the id in the project URL) and the **Project URL** `https://<ref>.supabase.co`.
4. **Which kind of key to use:** open Render → `savethedates-staging` → Environment and look only at the *start* of `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Don't copy them.
   - If they start with `sb_publishable_` and `sb_secret_`, use the same new-style keys for production.
   - If they start with `eyJ`, use the legacy `anon` and `service_role` keys.

   Log which kind.
5. **Authentication → Sign In / Providers → Email:**
   - Email provider enabled.
   - **Confirm email** on.
   - **Secure email change** on.
   - **Minimum password length** 12.
   - **Email OTP expiration** 3600 s.
   - Also turn on **leaked password protection** (a Pro feature, under Attack Protection or Password Security).
   - "Allow new users to sign up" stays **on**.
   - Leave Google for Phase 6, and every other provider off.
6. **Authentication → URL Configuration:**
   - **Site URL:** `https://savethedates.co.uk`
   - **Redirect URLs:** exactly `https://savethedates.co.uk/auth/confirm` and `https://savethedates.co.uk/auth/callback`, and nothing else.
7. **Authentication → Email Templates.** Copy each body exactly from the **staging** project's templates (open them in another tab):
   - **Confirm signup:** subject `Confirm your SaveTheDates account`. The body link must be `href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=signup"`.
   - **Reset password** (Recovery): subject `Reset your SaveTheDates password`. The link must be `href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery"`.

   If staging's bodies don't match, stop and tell me. The source files are `supabase/templates/confirmation.html` and `recovery.html` in the repo.
8. **Don't create tables, buckets or policies, and don't run SQL.**
9. **Hand-off, then carry on:** tell me the project ref and remind me to ask Claude Code:

   > "Apply all migrations in `supabase/migrations/` to the production Supabase project `<ref>` in order, the same way as staging, and verify them."

   The Supabase connector may need re-authorising to see the new organisation. Continue with Phase 2 while that happens. Sign-up and everything after it only work once the migrations are applied.

## Phase 2 — Resend production key and Supabase SMTP (free)

1. Resend → API Keys → create `production`: permission **Sending access**, domain `savethedates.co.uk` only. Copy it; it's shown once.
2. Supabase **production** → Authentication → SMTP Settings, enable custom SMTP:
   - Host `smtp.resend.com`
   - Port `465`
   - Username `resend`
   - Password: the Resend `production` key
   - Sender email `hello@savethedates.co.uk`
   - Sender name `SaveTheDates`

   Save, and keep the default email rate limits.
3. Check that the Resend domain still shows **Verified**.

## Phase 3 — Render production service  ⏸ PAUSE: Ross pays for Starter

1. **⏸ PAUSE: Ross** adds a payment card if the workspace has none (Workspace Settings → Billing), and confirms the Starter instance ($7/month).
2. **Image tag:** open `savethedates-staging` → Events and note the image tag currently **live on staging** (a full 40-character commit SHA). Production starts on that exact tag, because it's what I tested.
3. **New → Web Service → Deploy an existing image**:
   - Image `ghcr.io/meikle-dev/savethedates:<that SHA>`
   - Registry credential `ghcr-savethedates`
   - Name `savethedates-production`
   - Region **Frankfurt**
   - Instance **Starter**
   - Health check path `/api/health`
   - One instance, and no command overrides.
4. **Environment variables.** Add each one individually; don't paste a .env file.

   | Key | Value |
   | --- | --- |
   | `PORT` | `3000` |
   | `APP_ORIGIN` | `https://savethedates.co.uk`, exactly, with no trailing slash |
   | `SUPABASE_URL` | `https://<production ref>.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | production publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | production service-role / secret key |
   | `SENTRY_DSN` | the Sentry DSN (same as staging's) |
   | `SENTRY_ENVIRONMENT` | `production` |
   | `APP_ENV` | `staging` (**pre-launch lock**, see below) |
   | `STAGING_USERNAME` | `savethedates` |
   | `STAGING_PASSWORD` | Render's **Generate** button (32+ random characters). **⏸ PAUSE: Ross** copies it into the password manager |
   | `AUTH_GOOGLE_ENABLED` | leave out for now; added in Phase 6 |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | leave out for now; added in Phase 7 |

   **Don't** set `APP_RELEASE`.

   **Pre-launch lock:** the app treats `APP_ENV=staging` as "private". Every page asks for the username and password, every response is `noindex`, and `robots.txt` blocks search engines. Only `/`, `/privacy`, `/terms`, `/refunds`, `/api/health` and the Stripe webhook stay open, which is exactly what Google's and Stripe's reviewers need. The lock is removed on launch day, not now.
5. Create the service and wait for it to go live. If the health check fails, report the log error (no secrets) rather than redeploying repeatedly.
6. **Settings → Notifications:** deploy failures and service failures must email `rmeikle55@gmail.com`.
7. **Don't** create a production Deploy Hook or put anything in GitHub.
8. **Settings → Custom Domains:** add `savethedates.co.uk`. Render usually adds `www.savethedates.co.uk` and redirects it to the root; if not, add it. Log exactly which DNS records Render asks for.

## Phase 4 — GoDaddy DNS and the support mailbox (free, unless forwarding costs)

1. GoDaddy → `savethedates.co.uk` → DNS: add exactly what Render showed:
   - usually an **A** record for `@` pointing to Render's IP;
   - a **CNAME** `www` pointing to the service's `onrender.com` host.

   Replace a conflicting default "parked" `@` A record, or a `www` record, only if one exists. **Don't touch** the Resend records: SPF TXT, DKIM `resend._domainkey`, DMARC `_dmarc`, and the `send` MX/TXT records. Don't enable GoDaddy domain forwarding.
2. In Render, wait until both domains are **Verified** and the certificate is **issued** (minutes to an hour).
3. **Support mailbox (ask me first):** the site, Stripe and Google show `hello@savethedates.co.uk` to customers, but nothing receives mail sent to it yet (Resend receiving is off). I had planned to do this later, so **ask me whether to set it up now**. I recommend doing it before Stripe's review in Phase 7. If I say yes:
   - Set up **email forwarding** from `hello@savethedates.co.uk` to `rmeikle55@gmail.com` (GoDaddy's forwarding, if it's included free).
   - If it needs a purchase or new root MX records, **⏸ PAUSE: Ross**.
   - Never change the `send` subdomain's records.
   - Afterwards, ask me to send a test email to `hello@savethedates.co.uk` and confirm it arrives.

## Phase 5 — Check the site before any reviews

Confirm all of these before Phases 6 and 7:

- `https://savethedates.co.uk/` loads over HTTPS with a valid certificate.
- `https://www.savethedates.co.uk` redirects to it.
- `/privacy`, `/terms` and `/refunds` load without a password.
- `/dashboard` asks for the lock password; cancel it.
- `/api/health` shows `ok`.
- The migrations have been applied (ask me if you don't know).

## Phase 6 — Google sign-in for production (free; brand review takes days)

1. **Verify the domain with Google.** In **Google Search Console**, add a **Domain** property `savethedates.co.uk` and verify it with the DNS **TXT** record it gives. Add that TXT record in GoDaddy alongside the existing records, without replacing any TXT record. Don't submit a sitemap yet; that's a launch-day step.
2. **Google Cloud Console** → project "SaveTheDates" → **Google Auth Platform → Branding**:
   - App name `SaveTheDates`; user support email `rmeikle55@gmail.com` (or `hello@savethedates.co.uk` if Google allows it).
   - Leave the logo **empty**, since uploading one adds a longer review.
   - Application home page `https://savethedates.co.uk/`
   - Privacy policy `https://savethedates.co.uk/privacy`
   - Terms of service `https://savethedates.co.uk/terms`
   - **Authorised domains:** `savethedates.co.uk` and the production Supabase domain `<production ref>.supabase.co`. Keep any staging entries already there, such as `onrblnlwrnbdvyeasqdt.supabase.co`.
   - Developer contact email `rmeikle55@gmail.com`.
   - Replace any temporary `savethedates-staging.onrender.com` homepage, privacy or terms URLs with the production ones above. The one consent screen serves both environments.
3. **Clients → Create client → Web application**, named `SaveTheDates production`:
   - Authorised JavaScript origin: `https://savethedates.co.uk`
   - Authorised redirect URI: the **Callback URL** shown in Supabase **production** → Authentication → Sign In / Providers → Google (`https://<production ref>.supabase.co/auth/v1/callback`). Copy it from Supabase exactly.

   Log the **client ID**. Copy the **client secret** straight into step 4.
4. Supabase **production** → Authentication → Sign In / Providers → **Google**: enable it, then paste the client ID and client secret. Save. (The `/auth/callback` redirect URL was already added in Phase 1.)
5. Render production → Environment → add `AUTH_GOOGLE_ENABLED` = `true`, then **Save and deploy** ("Save only" doesn't apply it).
6. **Google Auth Platform → Audience:** user type **External**, then **Publish app** (move it from Testing to In production). The app requests only the basic scopes (email, profile, openid), so no sensitive-scope verification is needed. Confirm that no sensitive or restricted scopes are listed under Data Access.
7. **Brand verification:** submit it if Google offers it (Branding or Verification Center). Until it's approved, Google's screen may say "continue to `<ref>.supabase.co`" instead of "SaveTheDates". That's expected; tell me the status. A paid Supabase custom domain would change the address shown; **don't buy it**. It's my decision later.
8. **Quick check, only if I say yes:** on `https://savethedates.co.uk/account/sign-in` (enter the lock login), click **Continue with Google** and confirm Google's account chooser appears. Stop there unless I ask you to finish signing in; finishing creates a real account in production.

## Phase 7 — Stripe live mode  ⏸ PAUSE: Ross completes activation and verification

1. Switch the Stripe dashboard to **live mode** and open **Activate payments** (account activation). **⏸ PAUSE: Ross** enters the personal, business, bank and ID details. Suggest these values for the non-sensitive fields:
   - Business website: `https://savethedates.co.uk`
   - Product description: "Online wedding save-the-date websites with RSVP. One-off £29 payment per wedding site, delivered online immediately."
   - Support email: `hello@savethedates.co.uk`
   - Statement descriptor: `SAVETHEDATES` (5–22 characters); shortened descriptor `STD`, if asked.

   Stripe reviews the website for a description of the product and its price, terms, privacy and refund policies, and contact details. Those pages are public despite the lock. If Stripe asks for a login to see more, tell me; don't share the lock password yourself.
2. Stripe may approve instantly or ask for more documents over the following days. If activation is **pending**, do steps 3–5 only if Stripe already shows live keys; otherwise stop and report.
3. **Settings → Branding** (live): business name `SaveTheDates`, brand colour `#172933`. The logo is optional; skip it if there's none.
4. **Developers → Webhooks → Add endpoint** (live mode):
   - URL `https://savethedates.co.uk/api/stripe/webhook`
   - Events, exactly these five: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `refund.created`, `charge.dispute.created`

   Reveal the endpoint's **signing secret** (`whsec_…`) and paste it into Render production `STRIPE_WEBHOOK_SECRET`.
5. **Developers → API keys** (live): copy the **secret key** (`sk_live_…`) into Render production `STRIPE_SECRET_KEY`. If Stripe only shows it once, copy it immediately. Don't create a restricted key, and don't create products or prices; the app sets £29 itself.
6. Render production → **Save and deploy**.

## Phase 8 — Sentry checks (almost everything is already done)

1. Project `savethedates` → Settings → Security & Privacy:
   - **Prevent Storing of IP Addresses** on;
   - the scrubbers on;
   - **Allowed Domains** includes `savethedates.co.uk` and `www.savethedates.co.uk`, as well as the staging host. Add any that are missing, and don't remove any.
2. Alerts: the issue alert rule(s) cover **production** (or all environments) and email `rmeikle55@gmail.com`.
3. Confirm Render production has `SENTRY_DSN` and `SENTRY_ENVIRONMENT=production`.
4. Note, don't change:
   - the plan and trial status (a 14-day Business trial started around 25 September 2026, ending about 9 October);
   - the error and log retention shown;
   - whether a Data Processing Addendum is available or accepted (Settings → Legal & Compliance).

   Don't accept legal agreements for me.

## Phase 9 — Final verification (browser only; no real sign-ups or payments unless I ask)

1. `https://savethedates.co.uk/api/health` shows `ok`. The homepage and the three legal pages load publicly over HTTPS. `www` redirects to the root.
2. `/dashboard` asks for the lock login, and `/robots.txt` disallows everything.
3. `/account/sign-in` (after the lock login) shows **Continue with Google**.
4. Render production: the deploy is live on your chosen image tag, the logs show no repeating errors, and the env vars are all present (names only). The full list is `PORT`, `APP_ORIGIN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `APP_ENV`, `STAGING_USERNAME`, `STAGING_PASSWORD` and `AUTH_GOOGLE_ENABLED`, plus the two Stripe ones if Phase 7 finished.
5. Supabase production: custom SMTP is on (sender `hello@savethedates.co.uk`), the Google provider is enabled, and the Site URL and redirect URLs are as set.
6. Stripe live: the webhook endpoint exists with the five events.
7. Google: the consent screen is **In production**, and the brand verification status is noted.

## Final report

Reply with:

- **Done:** each phase, with the non-secret values from your log:
  - Supabase: production org name, project ref, region and the kind of key used;
  - Resend key name;
  - Render: service name, ID and `onrender.com` URL, image tag, instance, and domain and certificate status;
  - GoDaddy records added or replaced (type, host, value), including the Search Console TXT;
  - support-mailbox forwarding status and test result;
  - Google: client ID, consent screen status, brand verification status, authorised domains;
  - Stripe: activation status, webhook URL and events;
  - Sentry: settings checked, plan and retention seen, DPA status.
- **Secrets saved:** secret *names* and where each went. **No values.**
- **Waiting on me:** payments, verifications, password-manager saves, the migrations hand-off, Stripe or Google reviews in progress.
- **Anything unexpected.**

## Not part of this task

Don't do these. I'll do them myself later, following the launch plan (`docs/launch-plan.md` in the repo):

- the production dress rehearsal (a real sign-up, Google sign-in, photo upload, a live £29 purchase and refund, publish and RSVP);
- removing the lock (`APP_ENV`, `STAGING_USERNAME` and `STAGING_PASSWORD`);
- submitting the sitemap in Search Console.
