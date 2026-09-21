# Development assets

`lake-como.jpg`: photograph by NHN (@nuarharuha), Menaggio, Lake Como.

- Source: https://unsplash.com/photos/docks-reflect-in-the-water-mountains-in-the-background-jNf7Y3gn69M
- Download: https://images.unsplash.com/photo-1746769633057-ae3c447c6c9f?auto=format&fit=crop&fm=jpg&q=85&w=1600
- Licence: [Unsplash License](https://unsplash.com/license), free commercial/non-commercial use. Downloaded 18 September 2026; resized JPEG. No endorsement implied.

The original JPEG is served only by the development-only `/preview-photo` route. F008 also ships an optimised 1400px-wide WebP derivative at `public/media/lake-como.webp`, retained under the same licence. The supplied design boards are reference material, not shipped pages. The botanical artwork, guest information icons and code-rendered social card are original project artwork.

## F011 example imagery and typography

`public/media/lake-como-editorial.webp` is an AI-generated scenic illustration created with the built-in image-generation tool on 20 September 2026, exported to 1400px WebP (approximately 315 KB). It is used only for explicitly fictional public examples and their marketing phone illustrations, never as a customer's uploaded photo or a claim about a real venue.

Generation prompt: "Photorealistic travel editorial landscape, 3:2. View from a lush Italian lakeside villa terrace over Lake Como, hazy blue mountains, luminous pale late-afternoon sky in the upper centre, blue-green water, an ochre villa and cypress trees on the right shoreline, a small wooden boat. Olive branches and white climbing flowers frame the left and upper-left edges, worn sunlit limestone balustrade at the bottom. Natural golden light, rich olive greens and cream, open central composition for web typography. No text, letters, logos, watermark, UI, borders, split panels or collage."

`public/fonts/cormorant-garamond-latin-{regular,italic}.woff2`: Cormorant Garamond by Christian Thalmann, Latin 400 normal/italic builds downloaded from [Fontsource's Cormorant Garamond distribution](https://fontsource.org/fonts/cormorant-garamond) on 20 September 2026. SIL Open Font License 1.1 is included at `public/fonts/OFL.txt` (upstream: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond)). Both files are bundled locally through `next/font/local`; the guest font falls back to Georgia for other scripts. No runtime or build-time font-service dependency. The platform retains Georgia/Arial.
