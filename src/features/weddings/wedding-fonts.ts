import localFont from "next/font/local";
import type { WeddingTheme } from "./themes";

// Self-hosted Latin subsets (SIL OFL, licences in public/fonts). Only the original theme's
// serif is preloaded; other families download when their theme's CSS actually uses them.
const cormorant = localFont({ src: [{ path: "../../../public/fonts/cormorant-garamond-latin-regular.woff2", weight: "400", style: "normal" }, { path: "../../../public/fonts/cormorant-garamond-latin-italic.woff2", weight: "400", style: "italic" }], variable: "--wedding-serif", display: "swap", fallback: ["Georgia"] });
const jost = localFont({ src: [{ path: "../../../public/fonts/jost-latin-400-normal.woff2", weight: "400" }, { path: "../../../public/fonts/jost-latin-600-normal.woff2", weight: "600" }], variable: "--font-jost", display: "swap", preload: false, fallback: ["Arial"] });
const caslon = localFont({ src: "../../../public/fonts/libre-caslon-display-latin-400-normal.woff2", weight: "400", variable: "--font-caslon", display: "swap", preload: false, fallback: ["Georgia"] });
const workSans = localFont({ src: [{ path: "../../../public/fonts/work-sans-latin-400-normal.woff2", weight: "400" }, { path: "../../../public/fonts/work-sans-latin-600-normal.woff2", weight: "600" }], variable: "--font-work-sans", display: "swap", preload: false, fallback: ["Arial"] });
const bodoni = localFont({ src: [{ path: "../../../public/fonts/bodoni-moda-latin-400-normal.woff2", weight: "400", style: "normal" }, { path: "../../../public/fonts/bodoni-moda-latin-400-italic.woff2", weight: "400", style: "italic" }], variable: "--font-bodoni", display: "swap", preload: false, fallback: ["Didot", "Georgia"] });
const manrope = localFont({ src: [{ path: "../../../public/fonts/manrope-latin-400-normal.woff2", weight: "400" }, { path: "../../../public/fonts/manrope-latin-600-normal.woff2", weight: "600" }], variable: "--font-manrope", display: "swap", preload: false, fallback: ["Arial"] });
const gloock = localFont({ src: "../../../public/fonts/gloock-latin-400-normal.woff2", weight: "400", variable: "--font-gloock", display: "swap", preload: false, fallback: ["Georgia"] });
const dmSans = localFont({ src: [{ path: "../../../public/fonts/dm-sans-latin-400-normal.woff2", weight: "400" }, { path: "../../../public/fonts/dm-sans-latin-600-normal.woff2", weight: "600" }], variable: "--font-dm-sans", display: "swap", preload: false, fallback: ["Arial"] });
const garamond = localFont({ src: [{ path: "../../../public/fonts/eb-garamond-latin-400-normal.woff2", weight: "400", style: "normal" }, { path: "../../../public/fonts/eb-garamond-latin-400-italic.woff2", weight: "400", style: "italic" }], variable: "--font-garamond", display: "swap", preload: false, fallback: ["Georgia"] });
const figtree = localFont({ src: [{ path: "../../../public/fonts/figtree-latin-400-normal.woff2", weight: "400" }, { path: "../../../public/fonts/figtree-latin-600-normal.woff2", weight: "600" }], variable: "--font-figtree", display: "swap", preload: false, fallback: ["Arial"] });

const themeFonts: Record<WeddingTheme, readonly { variable: string }[]> = {
  minimal: [], romantic: [], bold: [],
  alcantara: [jost], countryside: [caslon, workSans], "evening-gold": [bodoni, manrope],
  terracotta: [gloock, dmSans], heather: [garamond, figtree],
  coastal: [manrope], riviera: [garamond, dmSans], velvet: [workSans], "black-tie": [bodoni, jost],
};

/** Font variable classes for one theme; the shared serif is always available. */
export function weddingFontClasses(theme: WeddingTheme) {
  return [cormorant, ...themeFonts[theme]].map((font) => font.variable).join(" ");
}
