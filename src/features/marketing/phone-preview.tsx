import Image from "next/image";
import { PhotoLabel } from "@/features/weddings/wedding-photo";
import { themes, type WeddingTheme } from "@/features/weddings/themes";

// Vertical centre of each theme's visible photo in the 390px-wide capture (CSS px). Bold's photo sits below the
// visible crop, so its label points down to it. Re-measure if a theme's mobile photo moves.
const photoCentre: Record<WeddingTheme, number> = {
  minimal: 170, romantic: 312, bold: 520, terracotta: 336, heather: 294, coastal: 298,
  riviera: 368, alcantara: 308, countryside: 272, velvet: 345, "black-tie": 318, "evening-gold": 317,
};

// Decorative miniature of the real example page; regenerate with `npm run marketing:previews`.
export function PhonePreview({ theme = "minimal", eager = false, photoLabel }: { theme?: WeddingTheme; eager?: boolean; photoLabel?: string }) {
  const surface = themes.find((item) => item.id === theme)?.swatch[0];
  return <div className="phone-preview" style={{ background: surface }} aria-hidden="true"><div className="phone-speaker" /><div className="phone-screen" style={{ "--photo-y": photoCentre[theme] } as React.CSSProperties}>
    <Image src={`/media/themes/${theme}.webp`} alt="" fill sizes="(max-width: 600px) 190px, 250px" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} />
    {photoLabel && <PhotoLabel label={photoLabel} className={theme === "bold" ? "photo-label-below" : undefined} />}
  </div></div>;
}
