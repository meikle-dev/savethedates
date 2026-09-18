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

Modern Minimal retains the paper/sage centred announcement with a lower photo. Warm & Romantic uses cream, rose/brown, a script-accented couple heading and a photo-led announcement with a dark warm overlay for readable light text. Modern & Bold uses deep teal, left-aligned editorial type and a full-height image with a light overlay under dark text. Each has a botanical no-photo/image-failure fallback. Layouts grow for long content, and no animation is used. `.wedding-shell` defines `--theme-accent`, `--theme-surface`, `--theme-text`, `--theme-radius` and `--theme-heading`; future Details/RSVP share these tokens and common behaviour. Script fonts are system fallbacks; no external font download is required.

## Wedding Details layout (F005)

Landing and Details use the same compact Save the date / Details navigation whenever Details is enabled. The Details page opens with the couple names and a short editorial introduction, followed by only the sections the couple filled in. Ceremony and reception use structured cards; travel, accommodation, dress code, and FAQs share the same readable section rhythm. Modern Minimal is restrained and centred, Warm & Romantic uses soft rounded cards and rose accents, and Modern & Bold uses a deep-teal header with left-aligned, accent-edged panels. Mobile uses one vertical column and comfortable link targets; desktop may use two columns while FAQs span the available width. Theme changes never alter content or available actions.

The owner workspace presents one bounded form rather than a page builder. A single “Show Details page” checkbox controls guest visibility without deleting content, and a saved-content preview remains available while the page or wedding is private. Empty sections are explained and omitted, FAQ pairs are explicitly added or removed up to five, validation stays beside the form, and successful saves clearly distinguish live from private changes.

## RSVP layout and interaction (F006)

The owner workspace adds one focused RSVP section after Details. Its primary controls are an enable switch, optional closing date, and a short invitation-creation form. Summary counts come before a compact invitation list showing invite name, response state, attendance choice, responding name, and response time. A newly created private link is displayed once in a copyable field; later rows do not reveal it. Revocation is clearly destructive but preserves any recorded response for the owner's list.

Guests arrive through a private invitation link. The RSVP page uses the applied theme's existing tokens and navigation, explains which invitation is being answered, and asks only for responding name and attending/not attending. A saved response prefills the form and labels the action as an update. Success remains on the page with a clear confirmation. Disabled, expired, revoked, invalid, and closed access never reveals other invitations or responses; invalid and revoked links use the same generic unavailable state. Mobile remains a single vertical column with full-width controls and comfortable targets; desktop uses a restrained centred panel. RSVP navigation appears only while RSVP is enabled, while an already-held valid link can still show the closed state after closure.
