# Wedding botanical artwork

Original project vector artwork authored for F018 on 22 September 2026. These paths were drawn in source for SaveTheDates, without tracing a photograph, stock illustration or supplied design board. No third-party asset or additional stock licence is involved. The supplied boards guided only the existing palette and placement. Project use requires no third-party attribution; no exclusivity or trademark claim is made.

## Source inventory

All three files are transparent, portrait SVGs with `width="240"`, `height="360"` and `viewBox="0 0 240 360"`. They contain only local vector geometry and explicit colours: no fonts, text, embedded images, scripts, links, external references, filters or tracking. The editable SVG is the shipped asset; there is no raster substitute or separate build step.

| File | Composition and palette | Theme | Bytes (UTF-8, LF) |
| --- | --- | --- | ---: |
| `minimal-olive.svg` | Slender asymmetric olive branches, fine pale veins and three olives. Olive `#63704d`, sage `#a8b095`, pale veins `#e6e9d8`. | Modern Minimal | 2,497 |
| `romantic-rose.svg` | Layered garden rose, three rosebuds and loose foliage. Blush `#f5dfd2` / `#e9bfb5`, rose `#b67e7f`, sage `#919e84`. | Warm & Romantic | 3,581 |
| `bold-laurel.svg` | Broad, sculptural laurel-inspired leaves and contrasting veins. Teal `#30675e`, sage `#7f9d7f`, citrus veins `#dce8b3`. | Modern & Bold | 1,799 |

## Reuse and replacement inventory

`BotanicalArt` in `src/features/weddings/wedding-art.tsx` replaces the former repeated inline `OliveBranch`. The enclosing `.wedding-shell` chooses the file with a CSS custom property; each instance is an empty, noninteractive, `aria-hidden` span with a contained background image. The browser can reuse the same small file across instances. Do not use these decorations to convey required information.

| Surface | Composition |
| --- | --- |
| Shared footer on Save the Date, Details and every RSVP state | One theme illustration in its own flex slot, 100×150px desktop and 58×87px mobile. |
| Save the Date and Details missing/failed photo | Two opposing illustrations at the photo edges, on the existing theme tint; reduced and repositioned on phones. Existing text contrast backing is retained. |
| Romantic Save the Date announcement | One 60×90px floral accent after the message, in normal flow. |
| Details divider | One 36×54px theme illustration between rules. |
| RSVP | One subdued theme illustration at the outer margin; reduced to 40×60px in the upper-right corner at widths up to 900px, clear of introductory text. The F019 redesign may reuse these sources. |
| Owner previews and public `/examples/{theme}` pages | Use the same guest components and therefore the same artwork. |

The informational Details icons remain the existing original line icons. The marketing phone illustrations contain photography/type rather than standalone botanical graphics. The scenic example photograph and private customer uploads are separate assets; neither is replaced by a botanical SVG.

## Size and maintenance

Keep each source below 6 KB uncompressed and the combined set below 15 KB. Paths use compact coordinate commands, shared group styles, no editor metadata, no filters and no dependencies; readability is retained for future edits. Inspect at footer/divider sizes as well as enlarged fallback size after changes. Maintain the 2:3 viewBox and safe margins so rotation and mobile placement stay predictable. Do not add names, initials, dates or other UI text to the files.

Verification evidence and actual file sizes are recorded in the F018 backlog handoff. Public shared decoration belongs here; customer uploads remain in private storage.
