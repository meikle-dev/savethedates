# UX walkthrough and launch readiness: 24 September 2026

A review of every screen in the app: usability, visual design and how intuitive it is, followed by what still has to happen before SaveTheDates can go to production and start selling. Nothing in the application was changed during this review. Findings are recommendations. The Product Manager should triage them into the [backlog](../backlog.md) before anyone builds them.

## How the review was done

- **App:** the running Docker development app (`http://127.0.0.1:3000`) against local Supabase, at commit `76a23c0`.
- **Widths:** every screen at 390px (phone) and 1440px (desktop), in Chromium via Playwright. None of the pages scrolled sideways at either width.
- **Journey:** I created a new fictional account through the real sign-up form and confirmed it with the email captured in Mailpit. I then saved Basics (including an empty submit to see the errors), uploaded a photo, changed and applied a theme, and filled in Details (including an invalid link and an incomplete FAQ). After that I enabled RSVP with a closing date and granted a local test purchase using the same database call as the test suite. I then published, including an invalid URL, and opened the guest pages without being signed in. Two guest RSVPs were submitted (one accepting, one declining) and checked in Guests and Overview. Finally I checked the homepage while signed in.
- **Cleanup:** the temporary account, its wedding, photo and responses were deleted afterwards. The owner's local demo account was not touched.
- **Not covered:** Safari/iOS and Firefox, a real Stripe Checkout (no test keys are configured locally), real email delivery, screen readers or a full accessibility audit, and performance on real devices or networks. Browser findings below apply to Chromium only.

## Overall verdict

The product looks premium. The guest pages are the strongest part, and the twelve themes are distinctive and consistent across Save the Date, Details and RSVP. The couple workspace is calm and well organised. Validation messages are clear, and the security model (private drafts, a secret RSVP link, noindex) holds up in use.

It is not ready to sell yet, for two reasons:

1. **Sharing and RSVP** are where couples and guests will get confused. That's the moment the product is paid for, and it currently has the most friction (sections 3.5–3.7 and 4).
2. **Launch groundwork is still outstanding:** hosting, monitoring, legal pages and policies, live payments, email, backups, and testing on iPhone Safari (section 6).

## 1. What works well

- **Marketing homepage.** A clear promise, honest pricing (£29 one-off, "draft and preview for free"), real theme previews, a short FAQ, and no invented testimonials or claims. The signed-in state correctly switches to "Return to your workspace".
- **Guest pages.** They are genuinely beautiful at both widths. Photo framing respects each theme's frame, and empty Details sections are hidden.
- **Workspace structure.** The Overview → Basics → Design → Details → RSVP → Guests → Publish order matches how a couple thinks. The Overview's status cards, countdown and setup checklist show at a glance where things stand.
- **Forms.** Errors are specific, sit next to their fields, and a summary says nothing was saved. Success messages are friendly. "You have unsaved changes" on Basics is a nice touch.
- **Theme preview.** Previewing a theme with your own content before applying it works well, and the "Nothing changes until you apply one" reassurance is good.
- **Guests list.** Attending and declined totals, filters, search, pagination and inline corrections make it a clean and useful table.
- **Mobile workspace menu.** The "Sections" drop-down (F029) works well on a phone.

## 2. Bugs found

| # | Where | What happens | Severity |
| --- | --- | --- | --- |
| B1 | Design → Frame your photo | The save button reads **"Save Save the Date framing"** (the label joins "Save" with the page name "Save the Date"). | Medium |
| B2 | RSVP section, before publishing | After enabling RSVP the notice says "Share your one private RSVP link **below**", but there is no link until the site is published. The same card says "Publish your site… to get the shared link", so the two messages contradict each other. | Medium |
| B3 | RSVP section and Publish section | The link fields show a **relative path** (`/s/<secret>/<slug>/rsvp` and `/<slug>`) with no domain. "Copy full link" copies the full URL correctly, but a couple who selects and copies the visible text, or reads it aloud, gets an unusable link. On mobile the field is cut off as well. | High |
| B4 | Guest RSVP, after sending | The card changes to "Thank you", but the heading above still says "Please enter your name and answer below." | Low |
| B5 | Sign-up and Publish | These use the browser's built-in validation pop-ups ("Please lengthen this text…", "Please check this box…"), unlike the styled messages everywhere else. On Publish the pop-up covers the consent text, and URL format errors can't be seen until the box is ticked. | Medium |
| B6 | Page titles | Every wedding page, account page and 404 is titled "Save the Date". All twelve example pages share one title. Browser tabs, bookmarks and history can't be told apart. | Medium |

## 3. Couple (owner) experience, screen by screen

### 3.1 Sign up, sign in, recovery

- **After sign-up the form stays in place**, with the success message and an active "Create account" button. Many people will click it again or not notice the message. Replace the form with a clear "Check your inbox" state that shows the address, says where the email comes from, and offers a **resend** option and a "wrong email?" way back. (Medium)
- There is no **show password** toggle. The minimum is 12 characters, so typing mistakes on phones are likely. (Low)
- Sign-up has no link to Terms or Privacy. These pages don't exist yet; see section 6. (High, launch blocker)
- The confirmation email is plain and clear. Its sender name and branding depend on the production email setup (F041).

### 3.2 First run and Basics

- The first-run page ("Start with your story") is inviting, and the empty-submit errors are good.
- A missing wedding date shows "Choose a valid date between 1900 and 2199." It should say "Add your wedding date". (Low)
- **Wedding dates in the past are accepted** (anything from 1900). A typo such as 2025 instead of 2027 is easy to make. Before selling, check what happens at checkout when the six-month expiry would already be in the past: the customer must not be able to pay for a site that is already expired. Consider warning on past dates. (Medium, needs checking)
- **There is no next step after the first save.** The couple stays on Basics with a success message. Show a clear "Next: choose your style →" link, or send them to the Overview checklist. (Medium)

### 3.3 Overview

- It's strong. Two small points: "Preview" appears three times (header, status card link, Quick actions), and Quick actions holds a single button, which makes the card look empty. Once published, Quick actions should hold the actions couples repeat: **copy the guest link, share, and view responses**. (Low)
- The setup checklist has no "Choose your theme" step, although choosing a theme is part of the product's appeal. (Low)
- On a phone the three status cards stack, so the checklist (the most useful part for a new couple) starts below the first screen. Consider a compact status row on mobile. (Low)

### 3.4 Design (theme and photo)

- **Themes are chosen from tiny colour dots.** Design shows the current theme and a strip of 12 small swatches; the preview toolbar uses the same dots, with the name visible for only one theme at a time. The homepage already has an attractive gallery of phone previews. Reuse that (thumbnail plus name) so couples can see all twelve before stepping through them. (Medium)
- **On a phone, the preview toolbar fills about 45% of the first screen** (theme name, description, 12 swatches wrapping onto two rows, the apply message and the button) before any of the site is visible. Collapse it on phones to a single row: previous, name, next and Apply. (Medium)
- **The photo framing editor is capable** (separate crops for Save the Date and Details, phone and desktop frames, drag or sliders). On a phone the mobile and desktop frames stack, which makes a long scroll. The notices "Saving framing updates your live site immediately" and "A successful photo change updates your live site immediately" are good.
- "Up to 5 MiB and 25 megapixels" is technical. Use "up to 5 MB" and drop megapixels unless an upload is rejected for it. (Low)

### 3.5 Details

- **"Show Details page" is off by default and sits at the top of a long form.** A couple can fill everything in, save, and never realise guests can't see it. Either turn it on automatically when the first field is saved, or put the setting next to the Save button and repeat it in the success message ("Saved. Your Details page is hidden from guests. Show it?"). (Medium)
- The form is long (about 2,300px on desktop, 3,000px on a phone) and **Save is only at the bottom**. Consider a sticky save bar on phones, or saving per group. (Medium)
- Time fields are free text ("2pm", "4:30pm onwards"). That's flexible and fine, but a placeholder would help, and it's worth keeping so times don't become rigid.
- The address guidance is helpful. The repeated paragraph under Ceremony and Reception could be shown once.

### 3.6 RSVP settings

- **Accept RSVPs is off by default.** A couple who publishes and shares the link without ticking it sends guests to a closed page. Either default it on when the site is first published, or flag it clearly on Publish and the Overview ("RSVPs are closed; guests can't reply yet"). (Medium)
- "Responses stay open through 23:59 **UTC**": UK and Irish couples won't think in UTC. Use UK time, or just "until the end of this date". (Low)
- **The closing date is never shown to guests** (see section 4). (High)
- "Replace shared link" is protected by a confirmation checkbox, which is a sensible guard.

### 3.7 Publish and sharing: the biggest opportunity

- **The URL is chosen after payment.** A couple can pay £29 and then find their preferred URL is taken or not allowed. Let them choose and check availability, and reserve the URL, **before** checkout, with a suggestion (for example `priya-and-tomas`) filled in from their names. (High)
- **Publishing has no moment of celebration and no share step.** After "Publish site" the page just shows a relative `/slug` link plus a sentence telling them to fetch a different link from another section. This is the moment the couple has paid for. Show a success panel with the full link, **Copy**, **Share** (the phone's share sheet on mobile, for WhatsApp, Messages and email), and ideally a **QR code** for printed cards. (High)
- **Two links is confusing.** Couples have a "general" wedding URL (Publish) and a private RSVP link (RSVP). Guests who get the general link see an RSVP tab that ends at "Invitation unavailable" (section 4). In practice couples should share one link: the private one, which already carries access across all three pages. Recommendations:
  - Present the private link as **"Your guest link"** in one place (Publish, then the Overview), with the general URL treated as secondary.
  - On the general URL, turn the RSVP dead end into a friendly message (see section 4).

  This is a product decision for the Product Manager, not a small copy change. (High)
- There's no link to terms or refunds near "Buy and continue to Stripe", and Stripe activation requires these (F041). (High, launch blocker)
- The "until six months after your wedding date" wording is clear and matches the marketing page.

### 3.8 Guests

- Good as it is. Missing: **download as CSV or print**, which couples will want for caterers and seating plans. Release inputs also list "customer export" as a policy decision. (Medium)
- "Correct or remove" is a text-only link at the end of each row. It's fine on desktop; check tap target size on phones.

## 4. Guest experience

- **The RSVP deadline isn't shown.** Guests aren't told "Please reply by 1 May 2027", so the couple's closing date is invisible until the form closes. Show it on the RSVP card, and ideally on the Save the Date page. (High)
- **The RSVP tab on the general URL is a dead end.** A guest opening `/{slug}` sees an RSVP tab. Tapping it shows "Invitation unavailable. This RSVP link is unavailable. Ask the couple for a current private link." To a guest that reads like an error. Either hide the RSVP tab when there's no private link, or show a warm message such as "Replies are by personal invitation. Please use the link Priya & Tomás sent you." (High)
- **The RSVP form collects only one name and yes or no.** There's no party size or plus-ones, no dietary needs, and no message to the couple. Headcount and dietary needs are the main reasons couples collect RSVPs. Each person in a household must also submit separately, and nothing tells them to. At minimum, add help text ("Replying for more than one person? Send one reply each") and an optional note field. Party size and dietary needs are currently deferred to F010; consider bringing them forward before selling, because other wedding website services (several of them free) offer them. (High product risk, owner decision)
- **The thank-you state leads nowhere.** Add "View the details" and "Add to calendar", and a "Reply for someone else" link that resets the form. (Medium)
- **There's no "Add to calendar"** on the Save the Date page. That's the core job of a save-the-date, and a simple `.ics` download is small to build. (Medium)
- **There's no RSVP call to action in the Save the Date page body.** Guests on the private link have to spot the small "RSVP" tab in the header. Add a themed "RSVP" button under the date when the visitor has the private link and RSVPs are open. (Medium)
- **Link previews in WhatsApp and Messages:** wedding pages have no Open Graph metadata, and the title is only "Save the Date". A shared link will show a bare preview. A title such as "Priya & Tomás · 12 June 2027", plus a themed preview image, would make the shared link feel special. Decide whether the couple's photo may appear in previews; a themed card without the photo is the privacy-safe default. Keep noindex. (Medium, needs owner decision on privacy)
- The decorative lines "Together is a beautiful place" and "A beautiful beginning" are the same for every couple. They're fine now; making them editable is a possible later change.

## 5. Marketing, examples and site-wide

- **Homepage copy:** "send private RSVP **links** to your guests" contradicts the one-link model (F026). Change it to "one private RSVP link". (Low)
- **Footer:** it has only Themes, Pricing and Sign in. It needs Terms, Privacy, Refunds and Contact before launch. (High, launch blocker)
- **Examples:**
  - There's no RSVP example, so couples can't see one of the three pages they are paying for.
  - There's no previous/next theme control, so browsing means going back to the homepage each time.
  - On phones the example header stacks into three rows (about 170px) above the site. (Medium)
- **404 page:** it's plain and has no link home or to sign in. That's fine for a mistyped wedding URL, but a dead end everywhere else. (Low)
- **No favicon or app icon** was found (`public/` and `src/app/`). Browser tabs and home-screen bookmarks show a generic icon. (Low, but visible)
- **Motion:** page changes are abrupt; F032 already covers this.
- **Contrast:** on Evening Gold, the small gold and blue location text on navy looks low contrast. Measure it during an accessibility pass. (Low)

## 6. Before production and selling

### 6.1 Must be done before taking money (blockers)

| Item | Backlog | Notes |
| --- | --- | --- |
| Legal pages: Terms, Privacy notice, Refund policy, Contact/support email | F041 product update 3; release inputs §5 | Owner-approved text is needed. Link them in the footer, on sign-up and next to checkout. Stripe activation needs them. |
| Data policies: retention, account and site deletion, photo and RSVP deletion, customer export, backup retention | Release inputs §5; F009 | Needed for UK GDPR. The app currently keeps all data after expiry, and couples have **no way to delete their account or export data**. A self-service delete, plus RSVP CSV export (section 3.8), covers most of it. |
| Production hosting: Render (Frankfurt) with staging; CI publishing the image; staging password protection | F041 steps 1, 2, 5 and product updates 1–2 | The host is approved (F037). The accounts, domain and DNS don't exist yet. |
| Managed Supabase: production (Pro) and staging (Free), migrations, Auth settings, redirect URLs | F041 step 2 | Keep production separate from staging. |
| Email: Resend domain verified (SPF, DKIM, DMARC), SMTP in Supabase, sign-up and password reset **tested in a real inbox** | F041 step 3; release inputs §3 | Without this, nobody can confirm an account. |
| Stripe: account activation, live keys, live webhook, a **real test-mode Checkout on staging**, refund and dispute handling checked | F041 step 4; release inputs §4 | The full hosted Checkout has only been tested with signed webhook fixtures so far. |
| Photo upload memory limits for the 512 MB server | F040 (Ready) | Without it, a few simultaneous large uploads could restart the server. |
| Error tracking and logs (Sentry EU) | F038 (Ready) | Needed to know when paying customers hit errors. |
| Backups, including **Storage (photos)**, plus a restore drill | F009; F041 open decisions | Supabase backups exclude Storage. |
| Licence and source record for the supplied WebP botanicals and RSVP backgrounds | F009 blockers | A commercial product needs proof it may use every image. |
| **iPhone Safari testing** of the full guest and couple journeys | Not tracked | All automated and visual checks run in Chromium. Most guests will open links on iPhones from WhatsApp or Messages. Check date inputs, photo upload from the Photos app, and the Web Share sheet. |
| Independent release review, then the production deploy and smoke check | F009 | These are required by AGENTS.md. |
| Business admin | Owner | Business identity for Stripe and the privacy notice. Check whether you need to pay the ICO data protection fee. Set up a support inbox. |

### 6.2 Should be fixed before launch (UX; section references above)

1. One clear guest link, and the RSVP dead end on the general URL fixed (3.7, 4).
2. Full URLs shown, plus a success panel after publishing with Copy, Share and a QR code (B3, 3.7).
3. The URL chosen and checked before payment (3.7).
4. The RSVP deadline shown to guests, and warnings when RSVP is off but the site is published (3.6, 4).
5. An RSVP household/plus-one decision, with at least "reply for each person" help and an optional note (4).
6. Bugs B1, B2, B4, B5 and B6, and a "check your inbox" state after sign-up (2, 3.1).
7. Details turned on or clearly flagged, and the next step shown after Basics (3.2, 3.5).
8. Page titles, share previews and a favicon (B6, 4, 5).

### 6.3 Can follow shortly after launch

- A visual theme gallery in Design, and the compact preview toolbar on phones (3.4).
- Add to calendar, and an RSVP button on the Save the Date page (4).
- Guest CSV export and print (3.8). This moves up if chosen as the export policy.
- An RSVP example page, and next/previous controls on the examples (5).
- Visitor analytics (F039), subtle motion (F032), and the Innovation role (F033).
- An accessibility audit (screen reader, keyboard, contrast) and a Firefox check.

## 7. Suggested order

1. **The owner decides:**
   - policy text and data rules;
   - the one-link sharing model and whether RSVP collects households;
   - the privacy of link previews;
   - the incident and support contacts.

   These unblock the most work.
2. **Engineering, in parallel:** F040 → F038, then the F041 product updates (CI image, staging protection, legal pages once the text exists).
3. **A UX sprint on sections 6.2 (1) to (8).** Most items are small to medium, and the publish/sharing changes should be one designed feature, not piecemeal fixes.
4. **The owner sets up the accounts** (domain, Supabase, Resend, Stripe, Render) following F041. Then run the full journey on staging, including iPhone Safari and a real test-mode Checkout.
5. **Independent release review**, then the production deploy and smoke check (F009), with Search Console after that.
