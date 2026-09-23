"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./workspace-icons";

export const workspaceSections: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/basics", label: "Basics", icon: "basics" },
  { href: "/dashboard/design", label: "Design", icon: "design" },
  { href: "/dashboard/details", label: "Details", icon: "details" },
  { href: "/dashboard/rsvp", label: "RSVP", icon: "rsvp" },
  { href: "/dashboard/guests", label: "Guests", icon: "guests" },
  { href: "/dashboard/publish", label: "Publish", icon: "publish" },
];

export function WorkspaceNav() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);

  // On narrow screens the section bar scrolls sideways; keep the current section in view.
  useEffect(() => {
    const current = list.current?.querySelector<HTMLElement>("[aria-current='page']");
    if (!list.current || !current) return;
    list.current.scrollLeft = current.offsetLeft - (list.current.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);

  return <nav aria-label="Workspace sections" className="ws-nav">
    <ul ref={list}>
      {workspaceSections.map((section) => <li key={section.href}>
        <Link href={section.href} aria-current={pathname === section.href ? "page" : undefined}>
          <Icon name={section.icon} className="size-[1.1rem] shrink-0" />{section.label}
        </Link>
      </li>)}
    </ul>
  </nav>;
}
