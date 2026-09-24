import type { Metadata } from "next";
import { SiteMotion } from "@/components/site-motion";
import "./globals.css";

export const metadata: Metadata = {
  title: "Save the Date",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteMotion>{children}</SiteMotion></body></html>;
}
