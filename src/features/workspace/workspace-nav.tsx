"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./workspace-icons";

// The site sections, then (F078) a "Guests" group: replies, the private guest list and the table plan.
export const workspaceSections: { href: string; label: string; icon: IconName; group?: string }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/basics", label: "Basics", icon: "basics" },
  { href: "/dashboard/design", label: "Design", icon: "design" },
  { href: "/dashboard/invitation", label: "Invitation", icon: "invitation" },
  { href: "/dashboard/details", label: "Details", icon: "details" },
  { href: "/dashboard/rsvp", label: "RSVP", icon: "rsvp" },
  { href: "/dashboard/publish", label: "Publish", icon: "publish" },
  { href: "/dashboard/guests", label: "Replies", icon: "guests", group: "Guests" },
  { href: "/dashboard/guest-list", label: "Guest list", icon: "guestList" },
  { href: "/dashboard/table-plan", label: "Table plan", icon: "tablePlan" },
];

// Phones and tablets (below 1024px) show the current section and a "Sections" menu; desktops show the sidebar.
export function WorkspaceNav() {
  const pathname = usePathname();
  const current = workspaceSections.find((section) => section.href === pathname);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // Any navigation, including back/forward, closes the menu.
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose() {
    setOpen(false);
    toggle.current?.focus();
  }

  return <nav ref={nav} aria-label="Workspace sections" className="ws-nav">
    <div className="ws-nav-bar">
      <span className="ws-nav-current">
        {current && <><Icon name={current.icon} className="size-[1.1rem] shrink-0" /><span className="sr-only">Current section: </span>{current.label}</>}
      </span>
      <button ref={toggle} type="button" className="button button-secondary ws-nav-toggle" aria-expanded={open} aria-controls="workspace-section-list" onClick={() => { setOpenedAt(pathname); setOpen(!open); }}>
        Sections<Icon name="chevron" className="size-4" />
      </button>
    </div>
    <ul id="workspace-section-list" data-open={open || undefined}>
      {workspaceSections.map((section) => <Fragment key={section.href}>
        {/* A visual heading only: every link's name already says what it is. */}
        {section.group && <li className="ws-nav-group" aria-hidden="true">{section.group}</li>}
        <li><Link href={section.href} aria-current={pathname === section.href ? "page" : undefined} onClick={choose}>
          <Icon name={section.icon} className="size-[1.1rem] shrink-0" />{section.label}
        </Link></li>
      </Fragment>)}
    </ul>
  </nav>;
}
