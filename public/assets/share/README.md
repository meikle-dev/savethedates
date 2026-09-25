# F047 link-preview cards

The twelve `*.jpg` files correspond one-to-one with the IDs in `src/features/weddings/themes.ts`. Each is a static 1200 × 630 JPEG for a published wedding's Open Graph and Twitter image. The cards use only the theme palette, abstract vector decoration, the public theme name, “Save the Date”, and the SaveTheDates brand. They contain no customer names, wedding date, location, photo, link secret, or customer-derived data. The filenames likewise contain only public theme IDs.

The cards were drawn as original SVG shapes and text for this project on 25 September 2026, then rasterised with the project's Sharp dependency at JPEG quality 86. No stock or customer images were used. Serve a card by its fixed `/assets/share/{theme-id}.jpg` path; do not generate an image from wedding data.

`/favicon.ico`, `/icon-192.png`, and `/icon-512.png` are original brand monogram assets made the same day. The favicon is a 32 × 32 PNG-bearing ICO; the app icons are square PNGs at their named dimensions. All use the marketing navy, warm white, and muted gold palette. No customer data is present.
