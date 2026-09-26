"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics/browser";
import { trackedPath } from "@/lib/analytics/paths";

/** Counts visits to public marketing pages. Renders nothing. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    const path = trackedPath(pathname);
    if (path) void trackPageView(path);
  }, [pathname]);
  return null;
}
