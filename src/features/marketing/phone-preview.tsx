import Image from "next/image";
import type { WeddingTheme } from "@/features/weddings/themes";
// Decorative miniature; accessible examples use the real guest renderer.
export function PhonePreview({ theme = "minimal", eager = false }: { theme?: WeddingTheme; eager?: boolean }) {
  return <div className={`phone-preview phone-${theme}`} aria-hidden="true"><div className="phone-speaker" /><div className="phone-photo"><Image src="/media/lake-como-editorial.webp" alt="" fill sizes="(max-width: 600px) 240px, 300px" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} /></div><div className="phone-shade" /><div className="phone-copy"><span>OLIVIA &amp; JAMES</span><p>Save<br /><em>the</em> Date</p><span>14 JUNE 2027</span><small>LAKE COMO, ITALY</small></div><div className="phone-bottom">With love, always</div></div>;
}
