import Image from "next/image";
import { themes, type WeddingTheme } from "@/features/weddings/themes";
// Decorative miniature of the real example page; regenerate with `npm run marketing:previews`.
export function PhonePreview({ theme = "minimal", eager = false }: { theme?: WeddingTheme; eager?: boolean }) {
  const surface = themes.find((item) => item.id === theme)?.swatch[0];
  return <div className="phone-preview" style={{ background: surface }} aria-hidden="true"><div className="phone-speaker" /><div className="phone-screen"><Image src={`/media/themes/${theme}.webp`} alt="" fill sizes="(max-width: 600px) 190px, 250px" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} /></div></div>;
}
