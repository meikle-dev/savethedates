# SaveTheDates — Initial Wedding Website Themes

## Overview

SaveTheDates allows couples to create a simple, beautiful wedding website for their guests.

At launch, couples will be able to choose from **three professionally designed themes**. F034 adds five more and F035 four more (twelve in total); see [Additional themes (F034)](#additional-themes-f034) and [F035 themes](#f035-themes-coastal-riviera-velvet-black-tie).

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

The Design section shows the current theme (swatch, name, description) and a Change theme link to the full-page preview; it has no picker of its own. The Save the Date, Details and RSVP previews share one compact toolbar: a back link, a private-preview badge, a theme stepper and the apply action beside it. The stepper names the selected theme with its palette, tagline and position (for example “2 of 8”), flanked by 44px previous/next arrows that wrap around; arrows stay at fixed positions so rapid cycling never moves the targets. Below it, a wrapping row of swatch dots is the theme radio group (accessible names are the theme names; native arrow keys work), letting owners jump directly as the list grows past a dozen themes. Neighbouring previews are prefetched. Choosing a theme immediately previews that theme by changing only the `theme` query parameter; it never saves. The saved theme is tagged Current beside its name and marked with a small dot on its swatch, and its Apply button is replaced by a current-theme note. The authenticated preview uses saved wedding content and a candidate theme; it clearly labels the candidate as current or not applied. Apply theme persists the candidate, with pending/error/success feedback and an explicit notice that published sites update immediately. Returning to the workspace discards the candidate. Content, photography and URLs do not change. Invalid preview candidates fall back to the saved theme.

The presentation was redesigned in F011 using the owner's [editorial reference](savedatemoderndesign.png). Modern Minimal uses a full photographic cover, oversized Cormorant Garamond heading, warm paper and olive accents. A central ivory veil keeps text readable over arbitrary customer photography while leaving the edges visible. Warm & Romantic pairs a cream invitation with an arched photograph against burgundy; on mobile the photo sits above the invitation. Modern & Bold uses a deep-teal editorial panel, citrus type and a separate photograph; mobile stacks the announcement above the photo. All use the couple's existing image, with original botanical artwork for missing/failed photos. There are no additional customer content fields.

F017 adds non-destructive focal-point and zoom controls for that one image. Each applied theme remembers separate Save the Date and Details framing. The workspace shows representative phone and desktop frame shapes, offers drag plus labelled range controls, and explains that responsive crops cannot be identical. Reset restores the established centred Save the Date or centre/60% Details default; Cancel keeps the saved crop. Replacing or removing the source photo clears all prior framing.

Layouts grow for long content without clipping. No animation is used. Shared tokens on `.wedding-shell` control guest surfaces only. A compact header, underline for the current navigation item, illustrated paper-style footer and initials seal connect the pages. The locally bundled Cormorant Garamond regular/italic Latin WOFF2 files total about 47 KB; unsupported characters fall back to Georgia. Guests and builds make no font-service requests. Sources and licence: `fixtures/README.md`, `public/fonts/OFL.txt`.

## Botanical artwork (F018)

Each theme uses one botanical composition: slender olive stems for Minimal, a blush garden rose with buds and foliage for Romantic, and broad teal/sage laurel leaves for Bold. Since 24 September 2026 every botanical is a supplied 768×1152 (2:3) transparent WebP in `public/assets/wedding/high-fid-graphics/`, replacing the original F018 SVGs. RSVP backdrops live in `public/assets/wedding/backgrounds/`; the `public/assets/wedding/` README records provenance, palettes and the reuse inventory. The illustration is selected by the enclosing theme so previews, published pages and full marketing examples stay consistent.

Footer illustrations occupy reserved space beside the signature (100×150px desktop, 58×87px phone). The Romantic announcement uses a small floral accent, and Details uses a 36×54px divider. F019 places one small theme illustration inside the RSVP invitation panel above its content. Missing and failed photographs use two opposing botanical edges on the theme tint, inset/reduced on mobile, with the existing Minimal text backing. Decoration never intercepts input and is hidden from assistive technology. No customer text is drawn into an asset.

## Wedding Details layout (F005)

Landing and Details use the same compact Save the date / Details navigation whenever Details is enabled. F012 takes inspiration from the [mobile Details reference](designs/mobile-friendly-details-design.png): the existing wedding photo opens the page as a wide banner, followed by a compact editorial introduction and a small botanical divider. Only populated sections appear, with line icons beside the content, fine separating rules, prominent timings, and readable 15–16px body text. Decorative captions and boxed cards are removed to reduce scrolling. Information stays visible without accordion interactions; arrows appear only on real links, which retain 44px touch targets and visible keyboard focus. Modern Minimal uses paper/sage, Romantic cream/rose and an arched photo against burgundy, and Bold a continuous deep-teal reading surface with citrus accents. Mobile uses one vertical column; from 760px, sections use two columns with FAQs spanning both. Long text wraps and empty sections remain omitted. Theme changes never alter content or available actions. Photos retain their botanical missing/failed-image fallback and the same authorised, uncached endpoints as the landing page. The reference's venue thumbnails and additional copy are not new customer fields.

The owner workspace presents one bounded form rather than a page builder. A single “Show Details page” checkbox controls guest visibility without deleting content, and a saved-content preview remains available while the page or wedding is private. Empty sections are explained and omitted, FAQ pairs are explicitly added or removed up to five, validation stays beside the form, and successful saves clearly distinguish live from private changes.

## RSVP layout and interaction (F006)

The RSVP section presents one reusable private link after publication, a Copy full link action, an Open RSVP page link to the live route, counts, and separate named response rows. Owners can correct a name or attendance, remove a duplicate after confirmation, and replace the secret with an explicit confirmation; previously shared copies then stop working, while saved answers remain. Guests using the shared link enter their name and attendance, see an in-place thank-you confirmation, and cannot view or edit any answer on return. The form tells them to contact the couple for corrections. Repeated names remain separate for the owner to resolve. All themed layouts and mobile behavior below continue to apply.

The owner workspace adds one focused RSVP section after Details. Its primary controls are an enable switch, optional closing date, the shared link, and link rotation. Guests shows response totals and a paginated list of names, attendance, and response times. Owners can correct or remove individual records.

Guests arrive through the private shared RSVP link. The RSVP page uses the applied theme's existing tokens and navigation, and asks only for a name and attending/not attending. Success remains on the page with a clear confirmation. A returning guest cannot view or edit a saved response and is directed to the couple for corrections. Disabled, expired, rotated, invalid, and closed access never reveals responses; invalid and rotated links use the same generic unavailable state. Mobile remains a single vertical column with full-width controls and comfortable targets; desktop uses a restrained centred panel. RSVP navigation appears only while RSVP is enabled, while an already-held valid link can still show the closed state after closure.

F019 makes the guest RSVP an editorial invitation. A small rule and heart lead into the large heading and shared-link introduction. A bordered paper panel holds a small theme botanical, the name field, two prominent radio choices, the full-width action and private-link reminder. Validation, success and pending feedback remain in the panel. Closed and unavailable links use the same panel and page hierarchy without displaying response data. The shared footer supplies the couple's dynamic closing signature. On phones, choices stack and all controls stay full width; at 901px and wider they share a row. Romantic desktop alone adds a text-free floral paper photograph behind the opaque panel; narrower screens use its existing vector rose and no raster request. Minimal stays pale olive paper, while Bold uses a deep teal surround with a pale card and citrus heading accents. Decoration carries no meaning or user data, and the form remains readable if imagery fails.


F025 extends this to three distinct RSVP designs chosen by the existing whole-site theme. Modern Minimal uses an olive-and-linen paper photograph, a spaced editorial heading and a fine double-rule ivory card, with its vector olive sprig above the introduction. Warm & Romantic retains its rose photograph and centred invitation. Modern & Bold uses dark sculptural foliage, a citrus heading and a split desktop layout with the introduction to the left of an offset pale response panel; its action is citrus with dark teal text. At 900px and below, both new designs return to a single column with solid colours and lightweight vector artwork; none of the three desktop raster backdrops is requested. Opaque cards protect the form if artwork fails. All invitation states use these same compositions. The private RSVP preview uses the shared preview toolbar to switch designs, distinguishes current from unapplied themes, and reuses Apply theme to persist the whole-site choice with the existing live-update notice. Preview controls never submit guest responses.

## Additional themes (F034)

Five guest themes join the original three. Palettes, type pairs and graphics direction are canonical in [theme-list.md](designs/themes/theme-list.md); this section fixes composition. Markup is unchanged: everything below is CSS (tokens, pseudo-elements, gradients, one inline-SVG data URI). Customer text never sits on an unprotected photo. Every text pair below meets WCAG AA; ratios are computed with the WCAG 2.x formula. Detail colours stay decorative. Each theme sets `--theme-heading`/`--theme-body` from its type pair.

**Picker order:** minimal, romantic, bold, terracotta, heather, alcantara, countryside, evening-gold (light to dark; neighbours differ in hue).

### Tokens, swatches and descriptions

| id | accent | surface | text | muted | line | tint | radius | `--botanical-art` |
|---|---|---|---|---|---|---|---|---|
| alcantara | `#8B5E3C` | `#F7F2EC` | `#2E2420` | `#6E5A4C` | `#DCCFC0` | `#EFE8DF` | 2px | `none` (see below) |
| countryside | `#3B4431` | `#F6F1E6` | `#262A20` | `#5A5B49` | `#D5CBB5` | `#E3D9C4` | 0 | autumn-dahlia.webp |
| evening-gold | `#C9A96A` | `#1C2533` | `#F2EDE3` | `#AEB6C4` | `#3B4558` | `#253043` | 0 | winter-hellebore.webp |
| terracotta | `#A34C30` | `#FBF6F0` | `#3A2A22` | `#6E574B` | `#E6D5C5` | `#F1E1D3` | 6px | mediterranean-citrus.webp |
| heather | `#6B4E71` | `#FAF8FB` | `#2A2630` | `#59606B` | `#DDD5E0` | `#E6DEE8` | 14px | meadow-wildflower.webp |

- Terracotta's text accent is darkened from clay `#B4583A` to `#A34C30`, because clay reaches only 4.44:1 on surface. Clay `#B4583A` remains for colour blocks, arch surrounds and the swatch. Heather slate `#8A95A0` (2.89:1) is for lines, hills and ornaments only; slate-toned muted text is `#59606B`.
- `coastal-grasses.webp` is unassigned and kept as a spare. Alcantara follows its "no illustration" direction.

| id | name | swatch [s0, s1, s2] | description |
|---|---|---|---|
| terracotta | Terracotta | `#F1E1D3`, `#B4583A`, `#7C8452` | Sun-baked clay, olive branches and linen. |
| heather | Heather | `#E6DEE8`, `#6B4E71`, `#8A95A0` | Misty lilac, moorland heather and slate. |
| alcantara | Alcantara | `#E4D9CC`, `#6B4A36`, `#B89A7E` | Soft suede, cognac and deep espresso. |
| countryside | Countryside | `#E3D9C4`, `#3B4431`, `#A5562E` | Oatmeal tweed, loden green and bracken. |
| evening-gold | Evening Gold | `#1C2533`, `#C9A96A`, `#141B26` | Midnight navy, candlelight and champagne. |

Swatch checks:

- Countryside keeps loden in the band but gets a bracken corner, so it no longer reads like Minimal (olive band, pale corner).
- Terracotta and Romantic are opposite in value in both segments: Terracotta has an orange-clay band and olive corner, Romantic a burgundy band and blush corner.
- Update the `themes.ts` comment: new swatches are chosen for distinction, not to mirror tokens.

**Contrast (text on its background):**

| Theme | Pairs |
|---|---|
| Alcantara | text/surface 13.58; muted/surface 5.84; muted/paper `#EFE8DF` 5.35; accent/surface 5.01; accent/paper 4.59; white/accent 5.58 |
| Countryside | text/surface 13.00; muted 6.16; loden/surface 9.06, and oatmeal on loden 9.06; bracken `#A5562E`/surface 4.70 (not on tint: 3.78) |
| Evening Gold | cream/surface 13.22; cream/paper `#141B26` 14.82; muted/surface 7.55; gold/surface 6.88; gold/paper 7.71; navy on gold button 7.71 |
| Evening Gold RSVP card | navy/ivory 13.93; bronze `#7A5C24`/ivory 5.60; bronze/`#EFE6D2` 5.00; card muted `#4F5A6B`/ivory 6.31; global error `#8B3023`/ivory 7.45 |
| Terracotta | text/surface 12.74; muted 6.25; accent/surface 5.38; accent/paper 4.99; accent/tint 4.53; white/accent 5.78 |
| Heather | text/surface 14.02; muted 6.01; accent/surface 6.73; accent/tint 5.41; white/accent 7.11; muted on mist `#EEE8F1` 5.27 |

### Shared textures

All textures are CSS only, low alpha, and never placed behind small text on a card.

- **Suede grain (Alcantara):** `radial-gradient(#8b5e3c0f 1px, transparent 1.2px) 0 0/3px 3px, radial-gradient(#2e24200a 1px, transparent 1.2px) 1px 2px/5px 5px, #EFE8DF`.
- **Herringbone (Countryside):** a 12px data-URI SVG tile, `path d='M0 12 6 6M0 6 6 0M6 0l6 6M6 6l6 6'`, stroke `#3b4431`, stroke-opacity .08, over `#EDE6D6`. Use it on the footer, RSVP field and photo fallback only. Bracken on its line pixels drops to 4.17, so it never sits behind small bracken text.
- **Windowpane check (Countryside):** `repeating-linear-gradient(90deg, #a5562e59 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, #b8913a40 0 1px, transparent 1px 56px), #3B4431`.
- **Check rule (Countryside dividers):** `height: 7px; background: repeating-linear-gradient(90deg, #A5562E 0 1px, transparent 1px 7px) center/100% 7px, linear-gradient(#3B4431 0 0) center/100% 1px no-repeat`.
- **Silk sheen (Evening Gold):** `linear-gradient(115deg, transparent 35%, #ffffff0a 50%, transparent 65%), #141B26`.
- **Limewash (Terracotta):** `radial-gradient(ellipse at 20% 25%, #ffffff8c, transparent 55%), radial-gradient(ellipse at 85% 75%, #eadccd99, transparent 60%), #F5EDE4`.
- **Mist (Heather):** `linear-gradient(#FAF8FB, #EEE8F1)`.
- **Hills (Heather):** an absolutely positioned pseudo-element at the bottom, 90px tall (110px on desktop), `z-index: -1`, `background: radial-gradient(60% 70px at 25% 100%, #cfc3d8 98%, transparent), radial-gradient(55% 55px at 75% 100%, #dcd3e2 98%, transparent), radial-gradient(40% 40px at 50% 100%, #e6dfeb 98%, transparent)`.

### Save the Date hero

**Alcantara: tailored split, photo left.**

- Desktop:
  - Hero: `grid-template-columns: 1.15fr 1fr` on suede-grain paper.
  - Photo: `grid-area: 1/1`, flush full height (min 780px), square.
  - Announcement: `grid-area: 1/2`, stretched and flex-centred, `margin: 40px`, `padding: 64px 36px`, solid surface.
  - **Stitched frame:** `border: 1px solid #B89A7E; outline: 1px dashed #8B5E3C99; outline-offset: -12px`.
  - Text is centred. The kicker, `h1 em` and 64px rule are cognac. h1 is `clamp(76px, 7.6vw, 118px)`.
- Phone: a column with the photo first (`height: 400px; min-height: 0`). The announcement sits below with `margin: 18px; padding: 44px 22px` and keeps the stitched frame.

**Countryside: overlapping estate card.**

- Desktop:
  - Hero: windowpane loden, `grid-template-columns: .9fr .25fr 1.1fr`.
  - Photo: `grid-area: 1/2/2/4`, `margin: 48px 48px 48px 0`, min 720px, square, `box-shadow: 0 0 0 1px #B8913A99` (brass hairline).
  - Announcement card: `grid-area: 1/1/2/3`, `z-index: 2`, vertically centred, `margin-left: 48px`, `padding: 60px 48px`, solid `#F6F1E6`, `box-shadow: 0 0 0 6px #F6F1E6, 0 0 0 7px #A5562E, 0 24px 60px #0f140c59`.
  - Text is left-aligned, with rule and margins as in Bold. The kicker and `h1 em` are bracken. An 80px **check rule** replaces the plain rule.
- Phone: a column on loden. The photo has `height: 380px; margin: 18px 18px 0`. The card has `margin: -72px 18px 28px`, so it overlaps the photo's bottom edge, plus `padding: 40px 24px`, and stays left-aligned.

**Evening Gold: centred medallion.**

- Desktop:
  - Hero: a centred flex column on silk-sheen navy, `padding: 64px 40px 80px`.
  - Photo: first, as a portrait oval: `width: 340px; height: 440px; min-height: 0; border-radius: 50%; outline: 1px solid #C9A96A; outline-offset: 10px`.
  - Announcement: below the oval with `padding: 52px 28px 0`, centred.
  - Colours: the kicker, `h1 em` and rule are gold; the rule is 64px at opacity 1. h1, date and message are cream; location is muted.
  - h1 is `clamp(72px, 8vw, 116px)`. The hellebore sprig is hidden.
- Phone: the oval is `width: min(260px, 70vw); aspect-ratio: 3/4; height: auto` with `outline-offset: 8px`. Hero padding is `36px 20px 56px`.

**Terracotta: arched doorway on a clay wall.**

- Desktop:
  - Hero: `grid-template-columns: 1fr 1.05fr; gap: 64px; padding: 56px 56px 0`, with `linear-gradient(90deg, #B4583A 0 34%, transparent 34%)` over limewash.
  - Photo: `grid-area: 1/1`, `align-self: end`, min 720px, `border-radius: 999px 999px 0 0`.
  - Plaster reveal: `box-shadow: 0 0 0 14px #F5EDE4`. The arch straddles the clay/limewash edge and meets the hero's bottom edge.
  - Announcement: `grid-area: 1/2`, left-aligned, `padding: 64px 0 80px`. The kicker, `h1 em` and 56px rule use the accent.
  - The citrus sprig is shown: 60x90, `rotate(-8deg)`, `margin: 28px 0 0`.
- Phone:
  - The hero is a column with `linear-gradient(#B4583A 0 180px, transparent 180px)` over limewash and `padding: 28px 20px 0`.
  - The arch photo is centred, `width: min(320px, 100%); height: 400px`, with a 10px reveal.
  - The announcement is centred with `padding: 44px 8px 64px`, and the sprig is centred.

**Heather: misty panorama.**

- Desktop:
  - Hero: a flex column on mist, with the hills pseudo on `.wedding-hero::after`.
  - Photo: first and full width, `height: 500px; min-height: 0; margin: 32px 32px 0; border-radius: 14px 14px 0 0; mask-image: linear-gradient(#000 78%, transparent)`. It fades into mist *above* the text.
  - Announcement: centred, `padding: 12px 28px 130px`, which clears the hills. The kicker and `h1 em` are plum. The meadow sprig is shown centred at 48x72.
- Phone: the photo is `height: 340px; margin: 16px 16px 0`. The announcement has `padding: 8px 22px 110px`, and the hills are 90px.

**Common hero rules:**

- **Photo fade:** no new theme puts a gradient over a photo, because text never sits on one. Heather uses only its edge mask.
- **Tablet (621–900):** keep each desktop composition with these ≤900 reductions:
  - Alcantara and Terracotta: photo min height 660px.
  - Countryside: margins and padding 28px; card `padding: 48px 32px`.
  - Evening Gold: oval 300x390.
  - Heather: photo 420px.

**Footer and seal:**

| Theme | Footer | Seal |
|---|---|---|
| Alcantara | Suede-grain paper; footer art hidden | Solid cognac border, dashed inner outline (stitching), cognac text |
| Countryside | Herringbone, loden top border | Loden fill, oatmeal text, bracken outline |
| Evening Gold | Surface, `#C9A96A66` top border; header border `#C9A96A40` | Gold border, outline and text on navy |
| Terracotta | Limewash | `#A34C30` fill, `#FBF6F0` text (5.38), `#E6D5C5` outline |
| Heather | `#F2EFF3` | Plum border, `#E6DEE8` fill |

### Alcantara without illustration

Alcantara sets `--botanical-art: none` and fills the illustration slots as follows:

- **Hidden:** `.wedding-footer > .botanical-art` and both `.photo-fallback > .botanical-art`.
- **Cognac diamond:** `.details-divider > .botanical-art` and `.rsvp-card-art .botanical-art` become `width/height: 7px; background: var(--theme-accent); transform: rotate(45deg)`.
- **Photo fallback:** suede grain on tint plus a stitched panel, `.photo-fallback::before { inset: 24px; border: 1px dashed #8B5E3C80 }`.

### Wedding Details

| id | Photo band | Content | Heading / divider | Icons & accents |
|---|---|---|---|---|
| alcantara | Band background paper; photo `inset: 24px 24px 0`, square | Surface | Centred; 48px cognac hairlines + diamond | Transparent, `box-shadow: inset 0 0 0 1px #B89A7E`, cognac stroke; emphasis cognac |
| countryside | Windowpane loden; photo `inset: 18px 18px 0` + brass hairline | Solid surface, with no herringbone behind body text | **Left-aligned**; divider `justify-content: flex-start`, check rules | Square (`radius: 0`) loden fill, oatmeal stroke; emphasis and links loden |
| evening-gold | Navy; photo `inset: 20px 20px 0`, `outline: 1px solid #C9A96A99; outline-offset: -10px` | Navy surface | Centred; kicker, `h1 em` and divider hairlines gold; h1/h2 cream | Transparent, 1px gold ring, gold stroke; emphasis, links and FAQ `dt` gold (6.88) |
| terracotta | **Flush full-bleed** band (inset 0), `border-bottom: 10px solid #B4583A` | Limewash | Centred; citrus divider | **Arch-shaped** chip `border-radius: 999px 999px 4px 4px`, tint fill, accent stroke |
| heather | Photo inset 0 with `mask-image: linear-gradient(#000 70%, transparent)`; band background surface | Surface | Centred; kicker plum; meadow divider | Rounded square `border-radius: 14px`, tint fill, plum stroke |

### RSVP

Every card stays opaque, so the desktop card never covers a backdrop's decorated edge. Phones get no raster and keep the single-column layout shared by all themes.

**Alcantara**

- Phone: suede-grain paper.
- Desktop background: `#EFE8DF url(alcantara-rsvp-suede.webp) left center / cover`.
- Desktop placement: `padding: 80px 64px 96px 30%`. The intro and card are centred in the right 70%, clear of the folds (at most ~23% wide).
- Card: surface, 2px radius, `border: 1px solid #B89A7E`, stitched `outline: 1px dashed #8B5E3C80; outline-offset: -9px`, soft shadow.
- Controls: the card art is the diamond; submit is cognac with white text.

**Countryside**

- Phone: herringbone oatmeal with `border-top: 10px solid #3B4431`. The intro is left-aligned, with the ornament `::before` hidden.
- Desktop background: `#EDE6D6 url(countryside-rsvp-tweed.webp) left center / cover`.
- Desktop placement: `padding: 72px 56px 88px 47%`, because the tweed reaches ~40–47% of the width at the bottom. The intro stays left-aligned.
- Card: solid `#F6F1E6`, radius 0, 1px loden border, `box-shadow: 6px 6px 0 #3B443126`.
- Controls: the card-art lines are check rules. A checked choice gets the tint with a loden inset. Submit is loden with oatmeal text (9.06).

**Evening Gold**

- Phone: silk-sheen navy. The intro is cream, the ornament and kicker gold, and the ornament lines `#C9A96A66`.
- Desktop background: `#141B26 url(evening-gold-rsvp-silk.webp) right bottom / cover`.
- Desktop placement: `padding: 80px 44% 96px 64px`, which keeps the content in the left 56%, clear of the silk on the right edge.
- Card: an **ivory place card**, `#F7F3EA`, with scoped tokens `--theme-text: #1C2533; --theme-accent: #7A5C24; --theme-muted: #4F5A6B; --theme-line: #D9CDB4; --theme-tint: #EFE6D2`. It has `border: 1px solid #C9A96A; outline: 1px solid #C9A96A; outline-offset: -8px` and shadow `0 24px 70px #0006`.
- Controls: choices are `#FFFDF8`; submit is `background: #C9A96A; color: #141B26; border: 1px solid #7A5C24`.
- Focus: outside the card, page tokens stay dark and focus outlines are gold on navy. Inside, the scoped bronze accent keeps focus rings and checked borders visible (5.60 on ivory; raw gold would be only 2.02).

**Terracotta**

- Phone: limewash. `.rsvp-intro-art` is shown with citrus, as in Minimal, and the ornament is hidden.
- Desktop background: `#F5EDE4 url(terracotta-rsvp-limewash.webp) left center / cover`.
- Desktop placement: `padding: 72px 56px 88px 28%`, clear of the arch (at most ~22% wide).
- Card: **arch-topped**, `border-radius: 50% 50% 8px 8px / 200px 200px 8px 8px; padding-top: 96px` (84px on phones), with a line border and shadow `0 20px 55px #3a2a221f`.
- Controls: choices have a 6px radius; submit is `#A34C30` with white text.

**Heather**

- Phone: mist with the hills `::after`, which is hidden at ≥901px.
- Desktop background: `#F2EFF3 url(heather-rsvp-moorland.webp) center bottom / cover`.
- Desktop placement: a centred column with `padding: 64px 48px 300px`, so the card ends above the hills.
- Card: surface, 16px radius, 1px line, shadow `0 18px 50px #6b4e711a`.
- Controls: choices and submit are **pills** (`border-radius: 999px`); submit is plum with white text.

**Choice fills:** choices keep light fills in the style of `#fffefa`, except inside Evening Gold's scoped ivory card.


## F035 themes: Coastal, Riviera, Velvet, Black Tie

Palettes, swatches and type are in [theme-list.md](designs/themes/theme-list.md). These themes use the markup and CSS approach from F034, and their CSS is at the end of `wedding-themes.css`. Their botanicals are the supplied 768×1152 transparent WebPs, in every botanical slot, as all illustrated themes now do. Riviera uses lemon blossom as its primary graphic (footer, Details divider, RSVP card, first fallback sprig) and citrus sprig as its secondary one (announcement sprig, second fallback sprig, RSVP intro).

**Picker order:** minimal, romantic, bold, terracotta, heather, coastal, riviera, alcantara, countryside, velvet, black-tie, evening-gold.

| Theme | Save the Date hero | Details | RSVP (phone / desktop ≥901px) |
|---|---|---|---|
| Coastal | Sea-glass gradient column; the full-width photo (520px tall, 440px up to 900px wide, 380px on phones) ends in a scalloped wave mask; centred text; sea holly sprig. | Scalloped photo band on sea glass | Sea-glass gradient / `coastal-rsvp-seaglass.webp` left, content from 28%. Card has a 4px accent top border. |
| Riviera | Linen weave with a scalloped cabana awning at the top; text on the left; photo on the right in a 12px diagonal-striped frame. On phones it becomes a centred column. | Photo over a 12px awning stripe; linen content | Linen with awning and citrus intro sprig / `riviera-rsvp-linen.webp` left, content from 36%. Card has a striped top edge. |
| Velvet | Claret velvet cover; photo on the left with a double gold hairline; ivory text on the right with gold kicker, `em` and rule. On phones it becomes a centred column. The rose sprig is hidden on claret. | Velvet band, photo inset 20px with a gold hairline | Blush gradient / `velvet-rsvp-claret.webp` left, content from 38%. Card has a gold border and inner outline. |
| Black Tie | Ivory card inside a black 24px / ivory 8px / black 1px letterpress border (12/5/1px on phones); centred landscape photo, text and orchid below. | Black band, photo inset 18px; square outlined icons | 10px black top border / `black-tie-rsvp-letterpress.webp` left, content from 30%. Card has a black double rule. |

Photo-framing editor shapes (in `globals.css`, measured at 390/1440px): Coastal 39/38 and 50/21; Riviera 33/38 and 12/17; Velvet 83/100 and 37/50; Black Tie 33/34 and 57/25. Details frames use the shared shapes.

**Contrast (computed):** Coastal text/surface 13.02, muted 6.02, accent/paper 6.41. Riviera text 13.37, muted 6.06, accent/tint 7.56. Velvet text 15.78, muted 7.14; ivory on claret `#4A141C` 13.78, gold on claret 7.82, blush location `#E6D3CD` on claret 10.34. Black Tie text 17.65, muted 7.35. White on each accent is at least 8.08.
