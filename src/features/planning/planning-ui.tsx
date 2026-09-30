"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/features/workspace/workspace-icons";
import type { GuestStatus } from "./guest-import";

export const statusLabels: Record<GuestStatus, string> = { awaiting: "Awaiting reply", attending: "Attending", declined: "Not attending" };

export function StatusBadge({ status }: { status: GuestStatus }) {
  const tone = status === "attending" ? "badge-positive" : status === "declined" ? "badge-negative" : "";
  return <span className={`badge ${tone}`}>{statusLabels[status]}</span>;
}

/** Saves text as a file in the browser; nothing is uploaded. */
export function downloadFile(name: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString("en-GB")} ${count === 1 ? one : many}`;

/**
 * A modal built on the native <dialog>: the browser traps focus, Escape closes it, and focus returns to the control that
 * opened it. Children mount only while open, so each opening starts fresh. A bottom sheet on phones.
 */
export function Dialog({ open, onClose, title, intro, children, footer, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} className="plan-dialog" data-wide={wide || undefined} aria-labelledby={`${id}-title`} onClose={onClose}
    onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    {open && <div className="plan-dialog-inner">
      <header className="plan-dialog-head">
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
      </header>
      {children && <div className="plan-dialog-body">{children}</div>}
      {footer && <footer className="plan-dialog-foot">{footer}</footer>}
    </div>}
  </dialog>;
}
