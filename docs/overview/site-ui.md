# SaveTheDates — Platform UX Direction

## Overview

The main SaveTheDates application should have a **modern, premium, simple and highly intuitive** visual identity.

The chosen visual direction is the **Modern Luxe** concept.

See the [platform reference board](../ux/site-ui-design.png). Its prices and testimonial are placeholders, not approved commercial claims. Text palette values below take precedence over minor differences in the board. The dashboard requires feature-specific interaction design; the board is a marketing visual reference.

The product should feel closer to a premium modern lifestyle brand than a traditional wedding-planning application.

The interface should remain deliberately simple.

---

# Design Personality

The SaveTheDates brand should feel:

* Modern
* Premium
* Elegant
* Calm
* Trustworthy
* Personal
* Simple

It should **not** feel:

* Corporate
* Overly feminine
* Cluttered
* Like a complex SaaS dashboard
* Like a traditional wedding directory
* Overly decorative

The objective is to create a product that feels beautifully designed while remaining extremely easy to use.

---

# Visual Direction

## Primary Colour

Use a deep teal/navy as the main brand colour.

Example direction:

```text
Deep Teal     #0F4C5C
Dark Navy     #0B2A3D
Sage Green    #2F6B4F
Warm Neutral  #F8F6F0
Soft Blue     #EAF2F6
```

These colours should be treated as the starting palette rather than requiring every colour to appear on every screen.

The dominant combination should generally be:

**Deep dark colour + warm off-white + restrained accent colours.**

---

# Typography

Typography is an important part of the brand.

Use a combination of:

### Editorial serif

For:

* major headings
* hero messaging
* important statements
* premium brand moments

### Clean sans-serif

For:

* navigation
* buttons
* forms
* labels
* supporting text
* application interfaces

The contrast between editorial headings and clean functional typography creates the premium visual identity.

Avoid excessive font variation.

---

# Homepage Structure

The marketing homepage should communicate the product extremely quickly.

A suggested structure is:

```text
Navigation

Hero
├── Strong value proposition
├── Short explanation
├── Create your save the date
└── View Templates

Theme Showcase
├── Modern Minimal
├── Warm & Romantic
└── Modern & Bold

How It Works
├── Choose a style
├── Add your details
└── Share with guests

Pricing / Main CTA

Trust / Social Proof

Footer
```

A visitor should understand what SaveTheDates does within a few seconds.

---

# Calls to Action

The primary action for signed-out visitors is:

**Create your save the date**

Use this wording in the homepage hero and pricing actions and on the fictional example banner. Keep the nearby free draft and preview explanation, with the approved £29 publication price. A verified signed-in owner instead sees **Return to your workspace** on the homepage; both homepage primary actions link to the corresponding real route.

On the dark Modern Luxe homepage, primary actions use a warm off-white surface, dark text, generous spacing and a clearly visible arrow in a deep-teal 32px square. Keep the label and icon aligned when the label wraps. The hero actions may stack on narrow screens; buttons have at least 44px touch height. Hover changes the surface and icon colour, and keyboard focus has a visible outline. Keep the hero and pricing treatments identical.

Secondary actions may include:

**View templates**

**See an example**

**How it works**

Avoid filling pages with many competing calls to action.

There should normally be one obvious next step.

## Platform controls (23 September 2026)

Workspace, account, preview-bar and example-banner controls follow the [Buttons & selectors guide](../ux/designs/claude-designs/SaveTheDates%20—%20Buttons%20%26%20Selectors.pdf), implemented once in `src/components/controls.css`:

* `.button` plus one variant: `button-primary` (dark ink, one per area for the main next step), `button-secondary` (outlined; previews, copy/open links, reversible or destructive actions) or `button-quiet` (text only; back links, Sign out, Reset/Cancel, inline removals). `button-flush` aligns a quiet button's text with the content edge.
* Every variant is 44px tall with a 2px sage focus ring offset by 2px; disabled states use the muted fills, not opacity.
* `.badge` (neutral, `badge-positive`, `badge-negative`, optional `badge-dot`), `.tag` for small labels such as "Current theme", and `.status` for quiet confirmations such as "Saved content".
* `.segmented` / `.segment` for single-choice radio groups (preview theme picker, photo framing page, attendance corrections). The native radios remain keyboard-operable; the dot marks the applied theme.

Inline links within prose stay `.text-link`. Guest wedding themes and the marketing hero keep their own button styles.

---

# Mobile First

The platform must be designed mobile-first.

This applies both to guests and couples creating their websites.

Important principles:

* comfortable touch targets
* short forms
* minimal navigation
* clear vertical hierarchy
* no reliance on hover interactions
* important actions visible without hunting
* readable text without zooming
* photography optimised for portrait displays
* minimal unnecessary UI chrome

Desktop layouts should expand the mobile experience rather than fundamentally change it.

---

# Cards and Content

Use cards selectively.

The UI should favour:

* large imagery
* generous spacing
* strong typography
* simple borders
* subtle rounding
* restrained shadows
* clear grouping

Avoid creating a dashboard composed of dozens of small cards.

Whitespace should provide much of the visual hierarchy.

---

# Imagery

Photography should be a major part of the brand.

Use aspirational but natural wedding imagery showing:

* couples
* locations
* wedding environments
* example SaveTheDate designs

Images should feel editorial and authentic rather than generic stock photography.

When demonstrating the product, showing the wedding website **inside a mobile device** is particularly effective because it immediately communicates what customers are purchasing.

---

# Motion

Animation should be subtle.

Appropriate examples include:

* gentle fade-ins
* small hover transitions
* smooth page transitions
* restrained image movement
* subtle button feedback

Avoid elaborate animations that delay interaction or distract from content.

---

# Couple Dashboard

The authenticated customer experience should follow the same visual system but become slightly more functional.

The dashboard should prioritise simplicity.

Customers should always understand:

* what they need to complete
* what their website currently looks like
* whether it is published
* where their guest responses are
* what action they should take next

Avoid exposing technical concepts.

Creating a wedding website should feel like completing a short guided process rather than configuring software.

## Sectioned workspace (F027, 23 September 2026)

Composition reference: [dashboard redesign](../ux/designs/dashboard-redesign.png). Its names, figures, photography, "Edit all" and decorative copy are examples only.

The workspace is split into sections, each with its own URL so it can be bookmarked and the back button works: **Overview** (`/dashboard`), **Basics** (names, date, location, note), **Design** (theme and photo framing), **Details**, **RSVP** (shared link, rotation, open/close settings), **Guests** (totals, paginated responses, corrections) and **Publish** (preview, purchase, guest link and its names part, publish/unpublish). Desktop (1024px and wider) shows a sticky left sidebar. Tablets (768-1023px) show all seven sections in one sticky row with no sideways scrolling. Phones (below 768px) show a compact sticky bar (64px or less) with the current section's icon and name and a **Sections** button (`aria-expanded`/`aria-controls`). The button opens a full-width list of all seven sections with the current one marked. The list closes when a section is chosen, on Escape, on a tap outside, on the button, and after back/forward. Escape and choosing a section return focus to the button. A tap outside leaves focus where the owner tapped (F029). The header always offers Preview and Sign out and shows names, date and status from 768px.

Overview shows only figures derived from saved data. Site status shows Published or Private draft, with a "Share your guest link" jump link and "online until" date when live. The countdown uses UTC calendar days. RSVPs show open/closed/off, total responses, and the attending/not-attending split. Latest responses shows up to five with a **View all guests** link. While the site is live, the guest link panel (below) follows the figures. Quick actions hold Preview. While a required step remains, a setup checklist leads the page and links to the right section: basics, optional photo, visible ceremony/reception details, RSVPs open, purchase, publish. It disappears once all required steps are done. There is no guest-count target, since the product does not store an invited list.

Guests (F030) keeps the totals at the top and uses the full content width for responses. A filter (All / Attending / Not attending, each with its count for the current search) and a name search are kept in the URL (`?filter=`, `?q=`, `?page=`), so reload, back and bookmarks work. Changing either resets to page 1. The table shows 25 responses per page, newest first, with Name, Response, Date and a **Correct or remove** button that opens the correction form in a row beneath. Previous/Next and "Showing 26–50 of 312" sit below it. Below 640px each row stacks as a list item in the same order. Empty states distinguish "No responses yet", "No matches" and "Page out of range" (with a link to the last page). Invalid `filter`/`page` values fall back to All/page 1. Search is limited to 80 characters and matches names literally (`%`, `_` and `\` are escaped; `*` is ignored). The server counts with aggregate queries and loads only the requested page, and Overview loads only the five latest responses.

A new account lands on Basics ("Start with your story.") with no section navigation. The first save creates the wedding, keeps the confirmation on screen, and reveals the other sections. Stripe Checkout returns to Publish.

## Guest link and sharing (F042, 25 September 2026)

The F043 URL is always called **Your guest link** and is the only link the workspace presents. It is shown as the full absolute URL on the configured `APP_ORIGIN` (never the request host), in a box that wraps rather than scrolls and selects the whole link on one tap.

- **Live panel.** While the site is live (published with an active purchase), one panel leads Publish and follows the Overview figures: heading, **Live** and RSVP status badges, the link, **Open your site**, an RSVP status sentence, and the warning that anyone with the link can view the site and reply, with a pointer to replacement in RSVP. Publishing success appears inside this panel and moves focus to its heading; later visits show the same panel without the notice.
- **Message.** An editable textarea holds "Save the date! A & B are getting married on <date> at <location>. Details and RSVP here: <link>" ("Find out more" when RSVPs are not open). It is built from saved data and never stored; **Restore suggested message** appears after an edit. Every shared or copied message contains the full link: it is appended if the couple removed or altered it. A renamed or replaced link resets the suggestion.
- **Actions**, in order: **Share** (native share sheet, only where supported, primary), **Share on WhatsApp** (WhatsApp's own `wa.me/?text=` link in a new tab; primary when native share is unavailable), **Copy message**, **Copy link**. All are started by the couple; nothing is sent to a shortener, QR or analytics service. Copy results use one status line ("Link copied." / "Message copied.") or an alert asking the couple to select and copy manually. Closing the share sheet shows nothing; other share errors suggest Copy message. Phones stack the actions full width; 640px and wider wrap them in a row.
- **RSVP status.** Open ("Guests can reply", with the closing date if set), closed ("RSVPs closed on <date>. Guests can still view your site but can't reply.") or off (with an **Open RSVPs** link). A closed or off RSVP never hides the link, and publishing never opens RSVPs.
- **Not live.** Drafts, unpublished, expired and revoked sites get no panel and no share or copy actions. Publish shows the future link in a dashed, muted box marked **Works once published**; the RSVP section shows the same box.
- **RSVP section.** Keeps RSVP settings and **Replace guest link**, shows the same absolute link with **Copy link** and **Open RSVP page** while live, and points to Publish for the ready-made message. Replacement refreshes every workspace display.
- QR codes are deferred.

## Motion (F032, 24 September 2026)

Navigation reveals the live main content from 65% to full opacity over 180ms. This applies to workspace sections, marketing/account pages and all twelve wedding themes, including previews. Headers and navigation outside the main stay steady. Initial page loads, same-route form submissions and query-only updates do not trigger page motion. Persistent layouts are not remounted.

New notices, guest correction panels and FAQ answers fade in over 140ms. The phone section menu also moves down 4px as it opens; it uses a keyframe animation so widening past 767px stops it immediately. Panels close immediately so hidden controls leave the keyboard order without delay. Controls use opacity/transform transitions of 120ms, with a 1px press offset on action buttons; there is no hover lift, because moving a button out from under the pointer can make hover flicker. `src/components/motion.css` is the single home for these rules and for the global reduced-motion rule. There are no height, colour, shadow or layout animations, scroll effects, page-load heroes or animation dependencies.

Reduced motion disables CSS transitions/animations and page reveals; changing that preference cancels an active page reveal. Unsupported animation APIs simply leave navigation instant. Native View Transition snapshots were evaluated but are not used: their named participants suppress pointer hit testing while fading. Animating live content keeps controls immediately available, without an overlay or delayed navigation.

## Venue entry decision (F021, 23 September 2026)

Keep ceremony and reception as independent, optional manual venue/address/directions fields. F023 adds focused guidance and a way to check a pasted directions link. Defer address autocomplete and an embedded map picker until evidence shows that manual entry causes problems.

On mobile, keep the existing stacked fields; desktop retains the existing grid. Explain that the address should include the town and postcode where available, and that guests need the correct entrance. Directions may use a map service or the venue's own instructions. For an unlisted venue, private home or rural entrance, accept the owner's written address, an optional shared pin link, and arrival instructions in Travel and transport. A recognised postal address is never required.

After pasting a valid directions URL, the owner can activate a clearly labelled "Check ceremony directions (opens in a new tab)" or reception equivalent. Use a normal keyboard-accessible link with visible focus and a 44px touch target. Keep the current form and unsaved values in place; opening a link does not save or confirm the venue automatically. Explain that the owner should check the destination and entrance before saving, then use Preview saved Details to check guest-facing text. No extra confirmation checkbox is needed.

If the URL is blank or invalid, omit the check link; keep manual entry and the existing save validation. If the external page fails or gives an incorrect location, the owner can replace/remove the URL and keep the address. No provider request, prefetch, embed or geolocation occurs while entering details; checking a link contacts its destination only when activated. Help text must remain associated with its input alongside any error. Preserve the existing warning that saving published Details updates the live site.

---

# Accessibility

Visual quality must not compromise usability.

The product should maintain:

* strong colour contrast
* readable typography
* keyboard accessibility
* visible focus states
* semantic page structure
* appropriately labelled controls
* sufficient touch-target sizes

---

# Core UX Principle

Whenever there is a choice between adding functionality and making the existing experience simpler, favour simplicity unless the functionality provides clear customer value.

SaveTheDates should feel like:

> **A beautifully designed service that makes creating and sharing a wedding website effortless.**

The interface should make complicated technology effectively invisible to the customer.
