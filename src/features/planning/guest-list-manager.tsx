"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { Icon } from "@/features/workspace/workspace-icons";
import { toCsv } from "./csv";
import { guestStatuses, maxGroupLength, maxGuestNameLength, maxGuests, normaliseName, type GuestStatus } from "./guest-import";
import { ImportDialog, downloadTemplate } from "./import-dialog";
import { addGuest, applyReplySync, clearGuestList, previewReplySync, removeGuests, updateGuest, type SyncPreview } from "./planning-actions";
import { Dialog, downloadFile, plural, statusLabels } from "./planning-ui";
import type { PlanGuest, PlanTable } from "./seating";

type StatusFilter = "all" | GuestStatus;
type Sort = "added" | "name" | "group";
type Notice = { tone: "ok" | "error"; message: string; undo?: string[] };

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "attending", label: "Attending" }, { value: "awaiting", label: "Awaiting reply" }, { value: "declined", label: "Not attending" },
];
const byName = (a: PlanGuest, b: PlanGuest) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base", numeric: true });

/** F078: the couple's private guest list. The whole list (at most 1,000) lives in the browser, so search is instant. */
export function GuestListManager({ initialGuests, tables, replies }: { initialGuests: PlanGuest[]; tables: PlanTable[]; replies: number }) {
  const [guests, setGuests] = useState(initialGuests);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("added");
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<"import" | "sync" | "clear" | null>(null);
  const [removing, setRemoving] = useState<PlanGuest | null>(null);
  const [pending, startTransition] = useTransition();
  const nameInput = useRef<HTMLInputElement>(null);
  // An element id to focus after the next render, when the control that had focus has gone (a removed row, say).
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const tableNames = useMemo(() => new Map(tables.map((table) => [table.id, table.name])), [tables]);
  const groups = useMemo(() => [...new Set(guests.map((guest) => guest.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en-GB")), [guests]);
  const counts = useMemo(() => ({
    all: guests.length,
    attending: guests.filter((guest) => guest.status === "attending").length,
    awaiting: guests.filter((guest) => guest.status === "awaiting").length,
    declined: guests.filter((guest) => guest.status === "declined").length,
  }), [guests]);
  const shown = useMemo(() => {
    const needle = normaliseName(query);
    const list = guests.filter((guest) => (status === "all" || guest.status === status)
      && (!group || (group === "\u0000" ? !guest.group : guest.group === group))
      && (!needle || normaliseName(`${guest.name} ${guest.group}`).includes(needle)));
    if (sort === "name") return [...list].sort(byName);
    if (sort === "group") return [...list].sort((a, b) => (a.group || "￿").localeCompare(b.group || "￿", "en-GB") || byName(a, b));
    return list;
  }, [guests, query, group, status, sort]);

  const replace = (updated: PlanGuest) => setGuests((list) => list.map((guest) => guest.id === updated.id ? updated : guest));
  const seatLabel = (guest: PlanGuest) => guest.tableId ? `${tableNames.get(guest.tableId) ?? "Table"} · seat ${guest.seat}` : null;

  function changeStatus(guest: PlanGuest, next: GuestStatus) {
    replace({ ...guest, status: next });
    startTransition(async () => {
      const result = await updateGuest({ id: guest.id, name: guest.name, group: guest.group, status: next });
      if (result.ok) {
        replace(result.guest);
        setNotice(guest.tableId && next === "declined" ? { tone: "ok", message: `${guest.name} is marked not attending, so their seat at ${tableNames.get(guest.tableId)} is free again.` } : null);
      } else {
        replace(guest);
        setNotice({ tone: "error", message: result.message });
      }
    });
  }

  function exportList() {
    const rows = [...guests].sort(byName).map((guest) => [guest.name, guest.group, statusLabels[guest.status], guest.tableId ? tableNames.get(guest.tableId) ?? "" : "", guest.seat ? String(guest.seat) : ""]);
    downloadFile("guest-list.csv", toCsv([["Name", "Group", "RSVP", "Table", "Seat"], ...rows]));
  }

  function undoImport(ids: string[]) {
    startTransition(async () => {
      const result = await removeGuests(ids);
      if (!result.ok) { setNotice({ tone: "error", message: result.message }); return; }
      const removed = new Set(result.removed);
      setGuests((list) => list.filter((guest) => !removed.has(guest.id)));
      setNotice({ tone: "ok", message: `Import undone. ${plural(removed.size, "guest")} removed.` });
      focusNext.current = "guest-list-everyone";
    });
  }

  const full = guests.length >= maxGuests;
  return <div className="ws-stack">
    <div className="plan-stats" role="group" aria-label="Guest list summary">
      <div><strong>{counts.all}</strong><span>Guests</span></div>
      <div><strong>{counts.attending}</strong><span>Attending</span></div>
      <div><strong>{counts.awaiting}</strong><span>Awaiting reply</span></div>
      <div><strong>{counts.declined}</strong><span>Not attending</span></div>
    </div>

    {/* One persistent live region, so confirmations are announced; failures use an alert. */}
    <div role="status" aria-live="polite" className="plan-live">
      {notice?.tone === "ok" && <div className="form-notice plan-notice">
        <span>{notice.message}</span>
        {notice.undo && <button type="button" className="button button-secondary" disabled={pending} onClick={() => undoImport(notice.undo!)}><Icon name="undo" />Undo import</button>}
      </div>}
    </div>
    {notice?.tone === "error" && <div className="form-error plan-notice" role="alert"><span>{notice.message}</span></div>}

    {guests.length === 0
      ? <section className="ws-panel plan-start" aria-labelledby="start-title">
        <h2 id="start-title" tabIndex={-1}>Start your guest list</h2>
        <p className="ws-panel-intro">Bring in the list you already have, or add guests one at a time. Groups keep families and friends together when you plan your tables.</p>
        <div className="plan-start-actions">
          <button type="button" className="button button-primary" onClick={() => setDialog("import")}><Icon name="upload" />Import from a spreadsheet</button>
          <button type="button" className="button button-secondary" onClick={() => nameInput.current?.focus()}><Icon name="plus" />Add guests one by one</button>
          {replies > 0 && <button type="button" className="button button-secondary" onClick={() => setDialog("sync")}><Icon name="refresh" />Add people from your RSVP replies</button>}
        </div>
        <figure className="plan-example">
          <figcaption>A spreadsheet like this imports in one go. <button type="button" className="text-link" onClick={downloadTemplate}>Download the template</button></figcaption>
          <table>
            <thead><tr><th>Name</th><th>Group</th><th>RSVP</th></tr></thead>
            <tbody><tr><td>Sarah Jones</td><td>Bride’s family</td><td>Yes</td></tr><tr><td>Tom Jones</td><td>Bride’s family</td><td></td></tr><tr><td>Priya Shah</td><td>University friends</td><td>No</td></tr></tbody>
          </table>
        </figure>
      </section>
      : <div className="plan-toolbar" role="group" aria-label="Guest list actions">
        <button type="button" className="button button-secondary" onClick={() => setDialog("import")} disabled={full}><Icon name="upload" />Import guests</button>
        {replies > 0 && <button type="button" className="button button-secondary" onClick={() => setDialog("sync")}><Icon name="refresh" />Update from RSVP replies</button>}
        <button type="button" className="button button-secondary" onClick={exportList}><Icon name="download" />Download CSV</button>
        <Link href="/dashboard/table-plan" className="button button-quiet"><Icon name="tablePlan" />Plan your tables</Link>
      </div>}

    <AddGuest nameInput={nameInput} groups={groups} disabled={full} onAdded={(guest) => { setGuests((list) => [...list, guest]); setNotice(null); }} />

    {guests.length > 0 && <section className="ws-panel" aria-labelledby="guest-list-everyone">
      <div className="ws-panel-head"><h2 id="guest-list-everyone" tabIndex={-1}>Everyone you’re inviting</h2><span className="plan-count">{shown.length === guests.length ? plural(guests.length, "guest") : `${shown.length} of ${guests.length}`}</span></div>
      <div className="plan-filters">
        <div className="plan-search">
          <label htmlFor="guest-search" className="sr-only">Search guests</label>
          <Icon name="search" className="size-4" />
          <input id="guest-search" type="search" className="field-input" placeholder="Search names or groups" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
        </div>
        <div className="plan-selects">
          <label className="sr-only" htmlFor="guest-group">Group</label>
          <select id="guest-group" className="field-input" value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="">All groups</option>
            {groups.map((name) => <option key={name} value={name}>{name}</option>)}
            <option value={"\u0000"}>No group</option>
          </select>
          <label className="sr-only" htmlFor="guest-sort">Sort by</label>
          <select id="guest-sort" className="field-input" value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="added">Sort: added</option><option value="name">Sort: A–Z</option><option value="group">Sort: group</option>
          </select>
        </div>
        <div className="segmented plan-status-filter" role="radiogroup" aria-label="Show">
          {statusFilters.map((filter) => <label key={filter.value} className="segment">
            <input type="radio" name="guest-status-filter" checked={status === filter.value} onChange={() => setStatus(filter.value)} />{filter.label}<span className="guest-count"><span className="sr-only"> (</span>{counts[filter.value]}<span className="sr-only">)</span></span>
          </label>)}
        </div>
      </div>
      {shown.length === 0
        ? <div className="guest-empty"><p className="guest-empty-title">No matches</p><p>Nobody on your list matches. <button type="button" className="text-link" onClick={() => { setQuery(""); setGroup(""); setStatus("all"); }}>Show everyone</button></p></div>
        : <ul className="gl-list">
          {shown.map((guest) => editing === guest.id
            ? <EditGuest key={guest.id} guest={guest} onDone={(updated) => { if (updated) replace(updated); setEditing(null); focusNext.current = `edit-button-${guest.id}`; }} />
            : <li key={guest.id} className="gl-row">
              <div className="gl-who">
                <strong>{guest.name}</strong>
                <span>{[guest.group, seatLabel(guest)].filter(Boolean).join(" · ") || "No group"}</span>
              </div>
              <label className="sr-only" htmlFor={`status-${guest.id}`}>RSVP for {guest.name}</label>
              <select id={`status-${guest.id}`} className="field-input gl-status" data-status={guest.status} value={guest.status} onChange={(event) => changeStatus(guest, event.target.value as GuestStatus)}>
                {guestStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
              </select>
              <div className="gl-actions">
                <button type="button" id={`edit-button-${guest.id}`} className="icon-button" aria-label={`Edit ${guest.name}`} onClick={() => setEditing(guest.id)}><Icon name="edit" /></button>
                <button type="button" className="icon-button" aria-label={`Remove ${guest.name}`} onClick={() => setRemoving(guest)}><Icon name="remove" /></button>
              </div>
            </li>)}
        </ul>}
      <div className="plan-danger">
        <button type="button" className="button button-quiet button-flush" onClick={() => setDialog("clear")}>Remove all guests…</button>
      </div>
    </section>}

    <ImportDialog open={dialog === "import"} onClose={() => setDialog(null)} existingNames={guests.map((guest) => guest.name)}
      onImported={(added) => { setGuests((list) => [...list, ...added]); focusNext.current = "guest-list-everyone"; setNotice({ tone: "ok", message: `${plural(added.length, "guest")} added to your list.`, undo: added.map((guest) => guest.id) }); }} />
    <ReplySyncDialog open={dialog === "sync"} onClose={() => setDialog(null)} onApplied={(list, message) => { setGuests(list); setNotice({ tone: "ok", message }); }} />
    <Dialog open={dialog === "clear"} onClose={() => setDialog(null)} title="Remove all guests?" intro={`All ${plural(guests.length, "guest")} and their seats in your table plan will be removed. Your RSVP replies aren’t affected. This can’t be undone.`}
      footer={<><button type="button" className="button button-secondary" onClick={() => setDialog(null)}>Keep my list</button>
        <button type="button" className="button button-danger" disabled={pending} onClick={() => startTransition(async () => {
          const result = await clearGuestList();
          setDialog(null);
          if (!result.ok) { setNotice({ tone: "error", message: result.message }); return; }
          setGuests([]);
          setNotice({ tone: "ok", message: "Your guest list is empty." });
          focusNext.current = "start-title";
        })}>Remove all guests</button></>}/>
    <Dialog open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.name ?? "guest"}?`}
      intro={removing?.tableId ? `They’ll also leave ${tableNames.get(removing.tableId)} in your table plan.` : "They’ll be removed from your guest list."}
      footer={<><button type="button" className="button button-secondary" onClick={() => setRemoving(null)}>Cancel</button>
        <button type="button" className="button button-danger" disabled={pending} onClick={() => {
          const guest = removing!;
          setRemoving(null);
          startTransition(async () => {
            const result = await removeGuests([guest.id]);
            if (!result.ok) { setNotice({ tone: "error", message: result.message }); return; }
            setGuests((list) => list.filter((item) => item.id !== guest.id));
            setNotice({ tone: "ok", message: `${guest.name} removed.` });
            focusNext.current = "guest-list-everyone";
          });
        }}>Remove</button></>}/>
  </div>;
}

function AddGuest({ nameInput, groups, disabled, onAdded }: { nameInput: React.RefObject<HTMLInputElement | null>; groups: string[]; disabled: boolean; onAdded: (guest: PlanGuest) => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError("Enter a name."); nameInput.current?.focus(); return; }
    startTransition(async () => {
      const result = await addGuest({ name, group, status: "awaiting" });
      if (!result.ok) { setError(result.message); return; }
      onAdded(result.guest);
      setError("");
      setAnnouncement(`${result.guest.name} added.`);
      // The group stays, so a family or table of friends can be added one after another.
      setName("");
      nameInput.current?.focus();
    });
  }

  return <section className="ws-panel" aria-labelledby="add-guest-title">
    <h2 id="add-guest-title">Add a guest</h2>
    <form className="gl-add" onSubmit={submit} noValidate>
      <div>
        <label htmlFor="add-guest-name" className="field-label">Name</label>
        <input ref={nameInput} id="add-guest-name" className="field-input" value={name} maxLength={maxGuestNameLength} autoComplete="off" disabled={disabled}
          aria-invalid={!!error} aria-describedby={error ? "add-guest-error" : undefined} onChange={(event) => { setName(event.target.value); setError(""); }} />
      </div>
      <div>
        <label htmlFor="add-guest-group" className="field-label">Group <span className="plan-optional">optional</span></label>
        <input id="add-guest-group" className="field-input" value={group} maxLength={maxGroupLength} list="guest-groups" autoComplete="off" placeholder="e.g. Bride’s family" disabled={disabled} onChange={(event) => setGroup(event.target.value)} />
        <datalist id="guest-groups">{groups.map((name) => <option key={name} value={name} />)}</datalist>
      </div>
      <button className="button button-primary" disabled={pending || disabled}><Icon name="plus" />{pending ? "Adding…" : "Add guest"}</button>
    </form>
    {error && <p id="add-guest-error" className="field-error" role="alert">{error}</p>}
    {disabled && <p className="field-help">Your list has {maxGuests.toLocaleString("en-GB")} guests, the most it can hold.</p>}
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
  </section>;
}

function EditGuest({ guest, onDone }: { guest: PlanGuest; onDone: (updated?: PlanGuest) => void }) {
  const [name, setName] = useState(guest.name);
  const [group, setGroup] = useState(guest.group);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const id = `edit-${guest.id}`;
  return <li className="gl-row gl-editing">
    <form className="gl-edit" noValidate onSubmit={(event) => {
      event.preventDefault();
      startTransition(async () => {
        const result = await updateGuest({ id: guest.id, name, group, status: guest.status });
        if (result.ok) onDone(result.guest); else setError(result.message);
      });
    }} onKeyDown={(event) => { if (event.key === "Escape") onDone(); }}>
      <div>
        <label htmlFor={`${id}-name`} className="field-label">Name</label>
        <input id={`${id}-name`} className="field-input" value={name} maxLength={maxGuestNameLength} autoFocus autoComplete="off" aria-invalid={!!error} onChange={(event) => setName(event.target.value)} />
      </div>
      <div>
        <label htmlFor={`${id}-group`} className="field-label">Group</label>
        <input id={`${id}-group`} className="field-input" value={group} maxLength={maxGroupLength} list="guest-groups" autoComplete="off" onChange={(event) => setGroup(event.target.value)} />
      </div>
      <div className="gl-edit-actions">
        <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="button button-secondary" onClick={() => onDone()}>Cancel</button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  </li>;
}

function ReplySyncDialog({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied: (guests: PlanGuest[], message: string) => void }) {
  return <Dialog open={open} onClose={onClose} title="Update from RSVP replies" intro="We match replies to your list by name, ignoring capitals and spaces. Nothing changes until you confirm.">
    <ReplySync onClose={onClose} onApplied={onApplied} />
  </Dialog>;
}

function ReplySync({ onClose, onApplied }: { onClose: () => void; onApplied: (guests: PlanGuest[], message: string) => void }) {
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [error, setError] = useState("");
  const [add, setAdd] = useState(true);
  const [pending, startTransition] = useTransition();
  // The dialog mounts this only while open, so each opening reads the latest replies.
  useEffect(() => {
    startTransition(async () => {
      const result = await previewReplySync();
      if (result.ok) setPreview(result.preview); else setError(result.message);
    });
  }, []);

  if (error) return <><p className="form-error" role="alert">{error}</p><div className="plan-dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Close</button></div></>;
  if (!preview) return <p className="plan-loading" role="status">Checking your replies…</p>;
  const addable = preview.add.length <= preview.room;
  const changes = preview.attending + preview.declined + (add && addable ? preview.add.length : 0);
  return <div className="plan-sync">
    <p>From {plural(preview.replies, "reply", "replies")}:</p>
    <ul className="plan-sync-list">
      <li><strong>{preview.attending}</strong> {preview.attending === 1 ? "guest" : "guests"} will be marked attending</li>
      <li><strong>{preview.declined}</strong> will be marked not attending{preview.declined > 0 && ", and lose any seat they had"}</li>
      <li><strong>{preview.matched - preview.attending - preview.declined}</strong> already up to date</li>
    </ul>
    {preview.add.length > 0 && <div className="plan-sync-add">
      <label className="plan-check"><input type="checkbox" checked={add && addable} disabled={!addable} onChange={(event) => setAdd(event.target.checked)} />
        Add {plural(preview.add.length, "person", "people")} who said yes but {preview.add.length === 1 ? "isn’t" : "aren’t"} on your list</label>
      {!addable && <p className="field-help">There isn’t room: your list can hold {maxGuests.toLocaleString("en-GB")} guests.</p>}
      <p className="plan-names">{preview.add.join(", ")}</p>
    </div>}
    {preview.ambiguous.length > 0 && <div className="plan-sync-add">
      <p><strong>Update these yourself:</strong> more than one guest on your list has the name {preview.ambiguous.join(", ")}.</p>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
      {changes > 0
        ? <button type="button" className="button button-primary" disabled={pending} onClick={() => startTransition(async () => {
          const result = await applyReplySync({ add: add && addable });
          if (!result.ok) { setError(result.message); return; }
          const { attending, declined, added } = result.changed;
          onApplied(result.guests, [attending && `${plural(attending, "guest")} marked attending`, declined && `${declined} marked not attending`, added && `${plural(added, "guest")} added`].filter(Boolean).join(", ") + ".");
          onClose();
        })}>{pending ? "Updating…" : "Update guest list"}</button>
        : <p className="plan-uptodate"><Icon name="check" className="size-4" />Your guest list is up to date.</p>}
    </div>
  </div>;
}
