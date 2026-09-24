# Wedding botanical artwork

Layout: botanicals are transparent WebPs in `high-fid-graphics/` and the desktop RSVP backdrop photographs are in `backgrounds/`. File names below are relative to those folders.

## Botanical inventory

The owner supplied every botanical as a 768×1152 (2:3) transparent WebP: the F035 set, and on 24 September 2026 replacements for the earlier artwork. Each file is shipped unchanged. The replacements superseded the original F018/F034 vector SVGs in `flowers/`, which have been deleted; the 2:3 shape is the same, so every placement and size is unchanged. Provenance and licence for the supplied WebPs were not recorded when they were supplied; record them here before public launch (tracked on F009).

| File | Theme | Bytes |
| --- | --- | ---: |
| `minimal-olive.webp` | Modern Minimal | 147,982 |
| `romantic-rose.webp` | Warm & Romantic | 179,458 |
| `bold-laurel.webp` | Modern & Bold | 134,624 |
| `mediterranean-citrus.webp` | Terracotta | 164,724 |
| `meadow-wildflower.webp` | Heather | 153,896 |
| `autumn-dahlia.webp` | Countryside | 143,668 |
| `winter-hellebore.webp` | Evening Gold | 229,520 |
| `coastal-sea-holly.webp` | Coastal | 145,668 |
| `riviera-lemon-blossom.webp`, `riviera-citrus-sprig.webp` | Riviera (primary, secondary) | 106,594; 104,750 |
| `velvet-claret-rose.webp` | Velvet | 119,190 |
| `black-tie-ivory-orchid.webp` | Black Tie | 47,786 |
| `coastal-grasses.webp` | Unassigned spare | 114,786 |

Alcantara has no botanical by design.

## Reuse and replacement inventory

`BotanicalArt` in `src/features/weddings/wedding-art.tsx` replaces the former repeated inline `OliveBranch`. The enclosing `.wedding-shell` chooses the file with a CSS custom property; each instance is an empty, noninteractive, `aria-hidden` span with a contained background image. The browser reuses the same file across instances. Do not use these decorations to convey required information.

| Surface | Composition |
| --- | --- |
| Shared footer on Save the Date, Details and every RSVP state | One theme illustration in its own flex slot, 100×150px desktop and 58×87px mobile. |
| Save the Date and Details missing/failed photo | Two opposing illustrations at the photo edges, on the existing theme tint; reduced and repositioned on phones. Existing text contrast backing is retained. |
| Romantic Save the Date announcement | One 60×90px floral accent after the message, in normal flow. |
| Details divider | One 36×54px theme illustration between rules. |
| RSVP | Minimal places an olive sprig above the heading; Romantic centres a rose between rules in the panel; Bold uses a laurel beside a rule in the panel. All link states share the same treatment. |
| Owner previews and public `/examples/{theme}` pages | Use the same guest components and therefore the same artwork. |

The informational Details icons remain the existing original line icons. The marketing phone illustrations contain photography/type rather than standalone botanical graphics. The scenic example photograph and private customer uploads are separate assets; neither is replaced by a botanical graphic.

## Size and maintenance

The WebPs are 48–230 KB each, far above the former 6 KB-per-SVG budget. A guest page requests only its own theme's file (Riviera two), once, and the browser then caches it. The largest rendering is the failed-photo fallback, at most 360px wide, so 768px wide covers 2× displays. If page weight becomes a concern, ship resized (for example 400×600) derivatives in their place. Keep the 2:3 shape and transparent margins so rotation and mobile placement stay predictable. Do not add names, initials, dates or other UI text to the files. Inspect at footer and divider sizes as well as the enlarged fallback after any change.

Public shared decoration belongs here; customer uploads remain in private storage.

## Additional themes (F034)

F034 uses five supplied backdrops (added 23 September 2026). Their provenance was not recorded when they were supplied; record it here before public launch. Botanicals are listed in the inventory above. Assignments:

| Theme | Botanical (`high-fid-graphics/`) | Desktop RSVP backdrop (`backgrounds/`, 1440×960 WebP) |
| --- | --- | --- |
| Terracotta | `mediterranean-citrus.webp` | `terracotta-rsvp-limewash.webp` (108,840 bytes): clay arch on the left edge, limewash centre |
| Heather | `meadow-wildflower.webp` | `heather-rsvp-moorland.webp` (28,408 bytes): lilac mist with moorland hills along the bottom |
| Alcantara | None by design; stitched outlines and cognac diamonds fill the slots | `alcantara-rsvp-suede.webp` (110,822 bytes): suede folds on the left edge |
| Countryside | `autumn-dahlia.webp` | `countryside-rsvp-tweed.webp` (94,760 bytes): tweed and leather folds on the left edge |
| Evening Gold | `winter-hellebore.webp` | `evening-gold-rsvp-silk.webp` (32,418 bytes): navy silk and gold ribbon on the right edge |

`coastal-grasses.webp` is currently unused. As before, backdrops load only at widths of at least 901px, and forms stay opaque and clear of each decorated edge.

## RSVP background photograph (F019)

`romantic-rsvp-floral.webp` is an original AI-generated, text-free decorative still life created for this project on 22 September 2026. It depicts blush roses, small white flowers, sage foliage and burgundy fabric along the left edge of blank ivory paper. The supplied RSVP reference informed the composition; its pixels and UI were not copied. The source PNG was generated with the built-in image generation tool, then resized with Sharp to 1440×960 WebP at quality 76 (56,706 bytes). No external stock licence or attribution is required for project use; no exclusivity claim is made. The source generation is retained in the local Codex generated-image directory, while the optimised WebP is the shipped asset.

CSS requests this image only for Romantic RSVP at widths of at least 901px. The form panel is opaque; mobile uses its botanical artwork and CSS colour. F025 adds separate backdrops for the other themes. No customer names, invitation labels, initials, controls or text are embedded in the raster asset.

## Additional RSVP backdrops (F025)

Created on 23 September 2026 with the built-in imagegen tool. These are original AI-generated, text-free decorative photographs, with no external stock asset or attribution requirement; no exclusivity claim is made. Source PNGs remain in the local Codex generated-image directory. The project ships Sharp-resized 1440×960 WebP derivatives at quality 76:

- `minimal-rsvp-olive.webp` (78,398 bytes): olive branches, linen and warm ivory paper for Modern Minimal.
- `bold-rsvp-foliage.webp` (41,076 bytes): sculptural foliage and silk on deep teal for Modern & Bold.

All three RSVP backdrops are requested only at widths of at least 901px. Smaller screens retain CSS colour and the theme botanical. Forms have opaque backgrounds and decorations carry no data. Bold uses a two-column desktop composition with its introduction on the left; Minimal retains a centred double-rule paper invitation. Failed raster loads retain readable colours and controls.

### Final generation prompts

**Minimal:** Use case: photorealistic-natural. Asset type: text-free background photograph for a refined Modern Minimal wedding RSVP web page. Landscape 3:2 composition. Overhead editorial still life on warm ivory handmade paper with subtle linen folds at the outer left edge; a graceful sparse olive branch with silvery sage leaves and a few dark olives curves down the far left edge and across the bottom-left corner. Soft natural afternoon window light, delicate botanical shadows, muted olive and warm cream palette, sophisticated fine-art wedding stationery photography, airy and restrained. Keep the central 65 percent and right area almost entirely empty pale ivory paper, especially top centre, to accommodate real HTML heading and form. Decoration concentrated in outer left 20 percent and bottom corners. No paper cards, no envelopes, no text, no letters, no calligraphy, no monograms, no logo, no watermark, no UI. Deliver a single finished photograph.

**Bold:** Use case: photorealistic-natural. Asset type: text-free background photograph for Modern and Bold wedding RSVP web design. Landscape 3:2 premium editorial botanical still life, overhead view. Deep rich dark teal matte paper background approximately #133f3e, subtle tactile grain. Sculptural broad glossy laurel and magnolia leaves in dark teal and sage green, a few delicate chartreuse green buds, arranged dramatically along the far RIGHT edge and bottom-right corner. A soft fold of deep teal silk at bottom edge, directional studio lighting and rich but elegant shadows. Botanical arrangement occupies outer right 25 percent and bottom right only. Left and centre remain quiet solid deep teal with no bright highlights because real citrus-coloured HTML heading will appear on left and a real form over centre-right. Sophisticated contemporary wedding magazine aesthetic, refined, artistic and confident. No roses, no pink, no gold glitter, no cards, no envelopes, no words, letters, typography, logos, watermark or UI. Deliver one finished photograph.

## High-fidelity botanicals and backdrops (F035)

The owner supplied these on 24 September 2026. Their provenance and licence were not recorded when they were supplied; record them here before public launch (tracked on F009). They are shipped unchanged.

| Theme | Botanical (`high-fid-graphics/`, 768×1152 transparent WebP) | Desktop RSVP backdrop (`backgrounds/`) |
| --- | --- | --- |
| Coastal | `coastal-sea-holly.webp` (145,668 bytes) | `coastal-rsvp-seaglass.webp` (118,324 bytes): driftwood, rope, pebbles and sea glass on the left edge |
| Riviera | `riviera-lemon-blossom.webp` (106,594 bytes, primary); `riviera-citrus-sprig.webp` (104,750 bytes, secondary) | `riviera-rsvp-linen.webp` (139,270 bytes): blue-striped linen, tile and a lemon on the left edge |
| Velvet | `velvet-claret-rose.webp` (119,190 bytes) | `velvet-rsvp-claret.webp` (47,816 bytes): claret velvet and gold ribbon on the left edge |
| Black Tie | `black-tie-ivory-orchid.webp` (47,786 bytes) | `black-tie-rsvp-letterpress.webp` (65,226 bytes): black grosgrain and a letterpress card edge on the left |

The botanicals are selected through `--botanical-art` like every other theme's, so they stay decorative and `aria-hidden` (see Size and maintenance above). Backdrops load only at widths of at least 901px.
