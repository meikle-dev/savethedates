import type { Metadata } from "next";
import { SiteMotion } from "@/components/site-motion";
import "./site.css";

export const metadata: Metadata = {
  title: "SaveTheDates",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon-192.png", type: "image/png", sizes: "192x192" }], apple: "/icon-192.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body><SiteMotion>{children}</SiteMotion></body></html>;
}
