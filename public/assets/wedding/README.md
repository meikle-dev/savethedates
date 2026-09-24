# Wedding botanical artwork

Layout: vector botanicals are in `flowers/` and the desktop RSVP backdrop photographs are in `backgrounds/`. File names below are relative to those folders.

Original project vector artwork authored for F018 on 22 September 2026. These paths were drawn in source for SaveTheDates, without tracing a photograph, stock illustration or supplied design board. No third-party asset or additional stock licence is involved. The supplied boards guided only the existing palette and placement. Project use requires no third-party attribution; no exclusivity or trademark claim is made.

## Source inventory

All three files are transparent, portrait SVGs with `width="240"`, `height="360"` and `viewBox="0 0 240 360"`. They contain only local vector geometry and explicit colours: no fonts, text, embedded images, scripts, links, external references, filters or tracking. The editable SVG is the shipped asset; there is no raster substitute or separate build step.

| File | Composition and palette | Theme | Bytes (UTF-8, LF) |
| --- | --- | --- | ---: |
| `minimal-olive.svg` | Slender asymmetric olive branches, fine pale veins and three olives. Olive `#63704d`, sage `#a8b095`, pale veins `#e6e9d8`. | Modern Minimal | 2,497 |
| `romantic-rose.svg` | Layered garden rose, three rosebuds and loose foliage. Blush `#f5dfd2` / `#e9bfb5`, rose `#b67e7f`, sage `#919e84`. | Warm & Romantic | 3,581 |
| `bold-laurel.svg` | Sculptural magnolia/laurel foliage with shaded leaf folds, fine veins and branching citrus buds. Deep teal `#133f3e`, sage `#a5b59a`, chartreuse `#bdcc76`. | Modern & Bold | 4,120 |

The Bold illustration was redrawn in SVG source on 23 September 2026 to complement the generated RSVP backdrop's glossy foliage and green buds. Local vector gradients provide the shading; no raster image is embedded. The existing shared asset path also keeps Bold footers, dividers and photo fallbacks consistent. Minimal and Romantic artwork is unchanged.

## Reuse and replacement inventory

`BotanicalArt` in `src/features/weddings/wedding-art.tsx` replaces the former repeated inline `OliveBranch`. The enclosing `.wedding-shell` chooses the file with a CSS custom property; each instance is an empty, noninteractive, `aria-hidden` span with a contained background image. The browser can reuse the same small file across instances. Do not use these decorations to convey required information.

| Surface | Composition |
| --- | --- |
| Shared footer on Save the Date, Details and every RSVP state | One theme illustration in its own flex slot, 100×150px desktop and 58×87px mobile. |
| Save the Date and Details missing/failed photo | Two opposing illustrations at the photo edges, on the existing theme tint; reduced and repositioned on phones. Existing text contrast backing is retained. |
| Romantic Save the Date announcement | One 60×90px floral accent after the message, in normal flow. |
| Details divider | One 36×54px theme illustration between rules. |
| RSVP | Minimal places an olive sprig above the heading; Romantic centres a rose between rules in the panel; Bold uses a laurel beside a rule in the panel. All link states share the same treatment. |
| Owner previews and public `/examples/{theme}` pages | Use the same guest components and therefore the same artwork. |

The informational Details icons remain the existing original line icons. The marketing phone illustrations contain photography/type rather than standalone botanical graphics. The scenic example photograph and private customer uploads are separate assets; neither is replaced by a botanical SVG.

## Size and maintenance

Keep each source below 6 KB uncompressed and the combined set below 15 KB. Paths use compact coordinate commands, shared group styles, no editor metadata, no filters and no dependencies; readability is retained for future edits. Inspect at footer/divider sizes as well as enlarged fallback size after changes. Maintain the 2:3 viewBox and safe margins so rotation and mobile placement stay predictable. Do not add names, initials, dates or other UI text to the files.

Verification evidence and actual file sizes are recorded in the F018 backlog handoff. Public shared decoration belongs here; customer uploads remain in private storage.

## Additional themes (F034)

F034 uses the five supplied botanicals and backdrops (added 23 September 2026). Their provenance was not recorded when they were supplied; record it here before public launch. Assignments:

| Theme | Botanical (`flowers/`) | Desktop RSVP backdrop (`backgrounds/`, 1440×960 WebP) |
| --- | --- | --- |
| Terracotta | `mediterranean-citrus.svg` | `terracotta-rsvp-limewash.webp` (108,840 bytes): clay arch on the left edge, limewash centre |
| Heather | `meadow-wildflower.svg` | `heather-rsvp-moorland.webp` (28,408 bytes): lilac mist with moorland hills along the bottom |
| Alcantara | None by design; stitched outlines and cognac diamonds fill the slots | `alcantara-rsvp-suede.webp` (110,822 bytes): suede folds on the left edge |
| Countryside | `autumn-dahlia.svg` | `countryside-rsvp-tweed.webp` (94,760 bytes): tweed and leather folds on the left edge |
| Evening Gold | `winter-hellebore.svg` | `evening-gold-rsvp-silk.webp` (32,418 bytes): navy silk and gold ribbon on the right edge |

`coastal-grasses.svg` is currently unused. As before, backdrops load only at widths of at least 901px, and forms stay opaque and clear of each decorated edge.

## RSVP background photograph (F019)

`romantic-rsvp-floral.webp` is an original AI-generated, text-free decorative still life created for this project on 22 September 2026. It depicts blush roses, small white flowers, sage foliage and burgundy fabric along the left edge of blank ivory paper. The supplied RSVP reference informed the composition; its pixels and UI were not copied. The source PNG was generated with the built-in image generation tool, then resized with Sharp to 1440×960 WebP at quality 76 (56,706 bytes). No external stock licence or attribution is required for project use; no exclusivity claim is made. The source generation is retained in the local Codex generated-image directory, while the optimised WebP is the shipped asset.

CSS requests this image only for Romantic RSVP at widths of at least 901px. The form panel is opaque; mobile uses its existing vector artwork and CSS colour. F025 adds separate backdrops for the other themes. No customer names, invitation labels, initials, controls or text are embedded in the raster asset.

## Additional RSVP backdrops (F025)

Created on 23 September 2026 with the built-in imagegen tool. These are original AI-generated, text-free decorative photographs, with no external stock asset or attribution requirement; no exclusivity claim is made. Source PNGs remain in the local Codex generated-image directory. The project ships Sharp-resized 1440×960 WebP derivatives at quality 76:

- `minimal-rsvp-olive.webp` (78,398 bytes): olive branches, linen and warm ivory paper for Modern Minimal.
- `bold-rsvp-foliage.webp` (41,076 bytes): sculptural foliage and silk on deep teal for Modern & Bold.

All three RSVP backdrops are requested only at widths of at least 901px. Smaller screens retain CSS colour and vector botanicals. Forms have opaque backgrounds and decorations carry no data. Bold uses a two-column desktop composition with its introduction on the left; Minimal retains a centred double-rule paper invitation. Failed raster loads retain readable colours and controls.

### Final generation prompts

**Minimal:** Use case: photorealistic-natural. Asset type: text-free background photograph for a refined Modern Minimal wedding RSVP web page. Landscape 3:2 composition. Overhead editorial still life on warm ivory handmade paper with subtle linen folds at the outer left edge; a graceful sparse olive branch with silvery sage leaves and a few dark olives curves down the far left edge and across the bottom-left corner. Soft natural afternoon window light, delicate botanical shadows, muted olive and warm cream palette, sophisticated fine-art wedding stationery photography, airy and restrained. Keep the central 65 percent and right area almost entirely empty pale ivory paper, especially top centre, to accommodate real HTML heading and form. Decoration concentrated in outer left 20 percent and bottom corners. No paper cards, no envelopes, no text, no letters, no calligraphy, no monograms, no logo, no watermark, no UI. Deliver a single finished photograph.

**Bold:** Use case: photorealistic-natural. Asset type: text-free background photograph for Modern and Bold wedding RSVP web design. Landscape 3:2 premium editorial botanical still life, overhead view. Deep rich dark teal matte paper background approximately #133f3e, subtle tactile grain. Sculptural broad glossy laurel and magnolia leaves in dark teal and sage green, a few delicate chartreuse green buds, arranged dramatically along the far RIGHT edge and bottom-right corner. A soft fold of deep teal silk at bottom edge, directional studio lighting and rich but elegant shadows. Botanical arrangement occupies outer right 25 percent and bottom right only. Left and centre remain quiet solid deep teal with no bright highlights because real citrus-coloured HTML heading will appear on left and a real form over centre-right. Sophisticated contemporary wedding magazine aesthetic, refined, artistic and confident. No roses, no pink, no gold glitter, no cards, no envelopes, no words, letters, typography, logos, watermark or UI. Deliver one finished photograph.
