# SaveTheDates — Initial Wedding Website Themes

## Overview

SaveTheDates allows couples to create a simple, beautiful wedding website for their guests.

At launch, couples will be able to choose from **three professionally designed themes**.

All themes provide the same core functionality:

* Save the Date landing page
* Wedding Details page
* RSVP page
* Mobile-first experience
* Couple names, date and location
* Photography and personalised content
* Clear navigation between pages

The theme changes the **visual presentation**, not the underlying functionality.

This gives customers meaningful choice while allowing the initial product to remain focused and maintainable.

---

## Theme 1 — Modern Minimal

**Style:** Clean, elegant and timeless.

A restrained editorial design using generous whitespace, refined serif typography and subtle natural colours.

### Visual direction

* Warm off-white backgrounds
* Dark charcoal typography
* Muted sage/green accents
* Strong use of whitespace
* Large editorial headings
* Photography used selectively
* Minimal decoration
* Simple outlined or solid buttons

### Intended feeling

Calm, sophisticated and understated.

This theme should work particularly well for couples wanting a traditional or elegant wedding aesthetic without feeling old-fashioned.

---

## Theme 2 — Warm & Romantic

**Style:** Soft, personal and emotional.

A photography-led design with warmer colours, softer typography and a more intimate visual style.

### Visual direction

* Warm cream backgrounds
* Blush and muted rose accents
* Warm brown tones
* Large couple photography
* Elegant serif typography
* Selective handwritten/script accents
* Softer shapes and buttons
* Slightly more decorative than Modern Minimal

### Intended feeling

Personal, welcoming and romantic.

Photography should play a larger role in this theme and make the page feel strongly connected to the couple.

---

## Theme 3 — Modern & Bold

**Style:** Fresh, contemporary and premium.

A more distinctive design combining strong photography, deep colours and confident editorial typography.

### Visual direction

* Deep teal/navy accents
* Soft neutral backgrounds
* Large imagery
* High-contrast typography
* Bold editorial layouts
* Strong calls to action
* Contemporary spacing and composition

### Intended feeling

Stylish, modern and confident.

This theme is intended for couples who want their wedding website to feel more like a contemporary design or lifestyle publication.

---

# Shared Theme Principles

Although visually different, all themes must follow the same core UX principles.

## Mobile First

Most wedding guests are expected to open the site from a phone.

Every theme should therefore be designed for mobile first and scale gracefully to larger screens.

## Simple Navigation

Guests should immediately understand how to:

1. See the wedding date
2. Find wedding details
3. RSVP

The visual design must never make these actions difficult to find.

## Content First

Themes should enhance the couple's information and photography rather than compete with them.

## Consistent Features

Themes must not behave like separate products.

The underlying:

* Landing Page
* Details
* RSVP

features remain consistent across themes.

This means a couple should eventually be able to change theme without rebuilding their wedding website.

---

# Initial Product Scope

Launch with these three themes only:

1. **Modern Minimal**
2. **Warm & Romantic**
3. **Modern & Bold**

Additional themes can be introduced after launch based on customer demand.

The initial objective is not to provide dozens of templates.

The objective is to provide **three genuinely excellent and clearly differentiated choices**.

See the [three-theme reference board](save-the-date-options-design.png) for the initial designs. It guides composition and palette; sample names, dates, photographs, and copy are placeholders. Implement real responsive UI rather than embedding the board as a page. Details and RSVP layouts need focused design guidance when those features are prepared.

## Theme selection and implementation (F004)

The workspace uses a labelled native radio group with descriptions and a Preview theme button. The authenticated preview uses saved wedding content and a candidate theme; it clearly labels the candidate as current or not applied. Apply theme persists the candidate, with pending/error/success feedback and an explicit notice that published sites update immediately. Returning to the workspace discards the candidate. Content, photography and URLs do not change. Invalid preview candidates fall back to the saved theme.

The presentation was redesigned in F011 using the owner's [editorial reference](savedatemoderndesign.png). Modern Minimal uses a full photographic cover, oversized Cormorant Garamond heading, warm paper and olive accents. A central ivory veil keeps text readable over arbitrary customer photography while leaving the edges visible. Warm & Romantic pairs a cream invitation with an arched photograph against burgundy; on mobile the photo sits above the invitation. Modern & Bold uses a deep-teal editorial panel, citrus type and a separate photograph; mobile stacks the announcement above the photo. All use the couple's existing image, with original botanical artwork for missing/failed photos. There are no additional customer content fields.

Layouts grow for long content without clipping. No animation is used. Shared tokens on `.wedding-shell` control guest surfaces only. A compact header, underline for the current navigation item, illustrated paper-style footer and initials seal connect the pages. The locally bundled Cormorant Garamond regular/italic Latin WOFF2 files total about 47 KB; unsupported characters fall back to Georgia. Guests and builds make no font-service requests. Sources and licence: `fixtures/README.md`, `public/fonts/OFL.txt`.

## Wedding Details layout (F005)

Landing and Details use the same compact Save the date / Details navigation whenever Details is enabled. F012 takes inspiration from the [mobile Details reference](designs/mobile-friendly-details-design.png): the existing wedding photo opens the page as a wide banner, followed by a compact editorial introduction and a small botanical divider. Only populated sections appear, with line icons beside the content, fine separating rules, prominent timings, and readable 15–16px body text. Decorative captions and boxed cards are removed to reduce scrolling. Information stays visible without accordion interactions; arrows appear only on real links, which retain 44px touch targets and visible keyboard focus. Modern Minimal uses paper/sage, Romantic cream/rose and an arched photo against burgundy, and Bold a continuous deep-teal reading surface with citrus accents. Mobile uses one vertical column; from 760px, sections use two columns with FAQs spanning both. Long text wraps and empty sections remain omitted. Theme changes never alter content or available actions. Photos retain their botanical missing/failed-image fallback and the same authorised, uncached endpoints as the landing page. The reference's venue thumbnails and additional copy are not new customer fields.

The owner workspace presents one bounded form rather than a page builder. A single “Show Details page” checkbox controls guest visibility without deleting content, and a saved-content preview remains available while the page or wedding is private. Empty sections are explained and omitted, FAQ pairs are explicitly added or removed up to five, validation stays beside the form, and successful saves clearly distinguish live from private changes.

## RSVP layout and interaction (F006)

The owner workspace adds one focused RSVP section after Details. Its primary controls are an enable switch, optional closing date, and a short invitation-creation form. Summary counts come before a compact invitation list showing invite name, response state, attendance choice, responding name, and response time. A newly created private link is displayed once in a copyable field; later rows do not reveal it. Revocation is clearly destructive but preserves any recorded response for the owner's list.

Guests arrive through a private invitation link. The RSVP page uses the applied theme's existing tokens and navigation, explains which invitation is being answered, and asks only for responding name and attending/not attending. A saved response prefills the form and labels the action as an update. Success remains on the page with a clear confirmation. Disabled, expired, revoked, invalid, and closed access never reveals other invitations or responses; invalid and revoked links use the same generic unavailable state. Mobile remains a single vertical column with full-width controls and comfortable targets; desktop uses a restrained centred panel. RSVP navigation appears only while RSVP is enabled, while an already-held valid link can still show the closed state after closure.
