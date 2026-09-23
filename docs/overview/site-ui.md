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

The workspace is split into sections, each with its own URL so it can be bookmarked and the back button works: **Overview** (`/dashboard`), **Basics** (names, date, location, note), **Design** (theme and photo framing), **Details**, **RSVP** (shared link, rotation, open/close settings), **Guests** (totals, responses, corrections, earlier individual invitations) and **Publish** (preview, purchase, URL, publish/unpublish). Desktop (1024px and wider) shows a sticky left sidebar. Smaller screens show a sticky, sideways-scrolling bar of section pills that keeps the current section in view. The header always offers Preview and Sign out and shows names, date and status from 768px.

Overview shows only figures derived from saved data. Site status shows Published or Private draft, with the URL and "online until" date when live. The countdown uses UTC calendar days. RSVPs show open/closed/off, total responses, and the attending/not-attending split. Latest responses shows up to five with a link to Guests. Quick actions are Preview, Open live site and Copy RSVP link; the last two appear only while the site is live. While a required step remains, a setup checklist leads the page and links to the right section: basics, optional photo, visible ceremony/reception details, RSVPs open, purchase, publish. It disappears once all required steps are done. There is no guest-count target, since the product does not store an invited list.

A new account lands on Basics ("Start with your story.") with no section navigation. The first save creates the wedding, keeps the confirmation on screen, and reveals the other sections. Stripe Checkout returns to Publish.

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
