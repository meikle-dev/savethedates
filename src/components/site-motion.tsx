"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/** Animate live content so navigation never puts a snapshot over controls. */
export function SiteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const content = document.querySelector("main");
    if (preference.matches || !content?.animate) return;
    const animation = content.animate([{ opacity: 0.65 }, { opacity: 1 }], {
      duration: 180,
      easing: "ease-out",
    });
    const stop = () => animation.cancel();
    preference.addEventListener("change", stop);
    return () => {
      stop();
      preference.removeEventListener("change", stop);
    };
  }, [pathname]);

  useEffect(() => {
    // Starting styles must not animate server-rendered notices on initial load.
    const frame = requestAnimationFrame(() => {
      document.documentElement.dataset.motionReady = "true";
    });
    return () => {
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.motionReady;
    };
  }, []);

  return children;
}
