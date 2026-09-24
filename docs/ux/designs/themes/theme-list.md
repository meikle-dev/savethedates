# Wedding themes

The twelve available themes, their botanical artwork, and their core palettes (listed in picker order in `src/features/weddings/themes.ts`):

| Theme | Palette direction | Flowers or botanical artwork | Paper / background | Surface | Accent | Ink / text | Detail |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Modern Minimal** | Warm paper, olive and pale sage. | Olive branches | `#F5F1E8` | `#F5F1E8` | `#526044` | `#272B22` | `#E5E6D8` |
| **Warm & Romantic** | Cream, muted rose and burgundy. | Garden rose and rosebuds | `#FFF4EB` | `#FFF4EB` | `#7C3446` | `#582B39` | `#F1D8CF` |
| **Modern & Bold** | Deep teal, pale sage and citrus. | Magnolia and laurel foliage with citrus buds | `#133F3E` | `#F1F3E9` | `#164B49` | `#133C3B` | `#DCE8B3` |
| **Terracotta** | Sun-baked clay, olive branches and linen. | Mediterranean citrus sprig | `#F5EDE4` | `#FBF6F0` | `#B4583A` | `#3A2A22` | `#7C8452` |
| **Heather** | Misty lilac, moorland heather and slate. | Meadow wildflowers | `#F2EFF3` | `#FAF8FB` | `#6B4E71` | `#2A2630` | `#8A95A0` |
| **Alcantara** | Soft suede, cognac and deep espresso. | None; stitched decoration | `#EFE8DF` | `#F7F2EC` | `#8B5E3C` | `#2E2420` | `#B89A7E` |
| **Countryside** | Oatmeal tweed, loden green and bracken. | Autumn dahlia | `#EDE6D6` | `#F6F1E6` | `#3B4431` | `#262A20` | `#A5562E` |
| **Evening Gold** | Midnight navy, candlelight and champagne. | Winter hellebore | `#141B26` | `#1C2533` | `#C9A96A` | `#F2EDE3` | `#7D8BA3` |
| **Coastal** | Sea glass, driftwood and sea holly. | Sea holly (WebP) | `#DFE7E3` | `#F5F7F4` | `#2F5563` | `#1F2E33` | `#B9A27F` |
| **Riviera** | Linen, Riviera blue stripes and lemons. | Lemon blossom and citrus sprig (WebP) | `#F4ECDF` | `#FBF7EF` | `#27468A` | `#1E2A44` | `#E8C547` |
| **Velvet** | Claret velvet, blush paper and gold ribbon. | Claret rose (WebP) | `#4A141C` (hero) / `#EEE5DE` | `#FAF5F1` | `#7A2232` | `#2E1418` | `#D9B77C` |
| **Black Tie** | Black grosgrain, ivory letterpress and orchids. | Ivory orchid (WebP) | `#F1EFEB` | `#FBFAF7` | `#141414` | `#141414` | `#908F8C` |

Swatch pairs (light / dark) for the selector chips:

- Alcantara: `#E4D9CC` / `#6B4A36`
- Countryside: `#E3D9C4` / `#3B4431`
- Evening Gold: `#C9A96A` / `#141B26`
- Terracotta: `#F1E1D3` / `#B4583A`
- Heather: `#E6DEE8` / `#6B4E71`
- Coastal: `#DCE6E3` / `#2F5563` (sand corner `#B9A27F`)
- Riviera: `#F6EFE3` / `#27468A` (lemon corner `#E8C547`)
- Velvet: `#5A1822` / `#B8924E` (blush corner `#EEE5DE`; dark-dominant so it never reads like Warm & Romantic)
- Black Tie: `#FAF9F6` / `#141414` (silver corner `#908F8C`)

Direction for the graphics agent:

- **Alcantara:** Tone-on-tone luxury. Use a very subtle suede grain on the paper, thin cognac rules and no illustration. Type: Cormorant Garamond with Jost.
- **Countryside:** Heritage British estate. Use a subtle herringbone weave on the paper and windowpane-check dividers. Motifs are drystone walls, hedgerows, oak leaves and ivy, with touches of brass and waxed leather. Mustard `#B8913A` is a sparing secondary fleck. Keep it heritage, not rustic-cute. Type: Libre Caslon Display with Work Sans.
- **Evening Gold:** The only dark theme. Primary buttons flip to a gold fill with navy text, and the gold is kept to hairlines and monograms. Type: Bodoni Moda with Manrope.
- **Terracotta:** Mediterranean feel, with olive sprigs, arched frames and a limewash texture. Type: Gloock with DM Sans.
- **Heather:** Irish and Scottish moorland, with misty landscape washes and sprigs of heather. Slate is for secondary UI. Type: EB Garamond with Figtree.
- **Coastal:** Sea glass, driftwood, rope and pebbles. The photo ends in a scalloped wave edge. Sand is decorative only. Type: Cormorant Garamond with Manrope.
- **Riviera:** Italian summer linen, a scalloped blue-and-cream cabana awning and a striped photo frame. Lemon is for tints and decoration only. Type: EB Garamond with DM Sans.
- **Velvet:** A claret velvet cover with ivory type and gold hairlines. Gold (`#D9B77C`) is used only on claret. Type: Cormorant Garamond with Work Sans.
- **Black Tie:** A formal letterpress invitation: a black grosgrain double-rule border, ivory paper and centred type. Type: Bodoni Moda with Jost.

Every illustrated theme uses a supplied high-fidelity transparent WebP botanical from `public/assets/wedding/high-fid-graphics/`; the earlier SVGs were retired on 24 September 2026. All four reuse fonts that are already self-hosted.

Every accent passes 4.5:1 with white button text (Coastal 8.08, Riviera 9.02, Velvet 9.99, Black Tie 18.42). Evening Gold is the exception on purpose: its gold passes against navy text instead. The Detail colours are decorative only and shouldn't be used for body text. If Countryside's swatch looks too close to Modern Minimal's in the selector, swap its dark half to the bracken `#A5562E`.
