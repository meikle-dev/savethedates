"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/features/workspace/workspace-icons";
import {
  buildImport,
  detectColumns,
  guestListTemplate,
  maxGroupLength,
  maxGuestNameLength,
  maxGuests,
  maxImportBytes,
  parseSheet,
  type ColumnRole,
  type ImportRowStatus,
} from "./guest-import";
import { importGuests } from "./planning-actions";
import { Dialog, downloadFile, plural, StatusBadge } from "./planning-ui";
import type { PlanGuest } from "./seating";

const roleLabels: Record<ColumnRole, string> = { name: "Full name", first: "First name", last: "Last name", group: "Group", status: "RSVP", ignore: "Don’t import" };
const skipReasons: Record<Exclude<ImportRowStatus, "ok">, string> = {
  empty: "No name",
  name_too_long: `Name over ${maxGuestNameLength} characters`,
  group_too_long: `Group over ${maxGroupLength} characters`,
  duplicate_existing: "Already on your list",
  duplicate_file: "Repeated above",
  over_limit: `Over the ${maxGuests.toLocaleString("en-GB")}-guest limit`,
};

export function downloadTemplate() {
  downloadFile("guest-list-template.csv", guestListTemplate());
}

/** UTF-8, or Windows-1252 for Excel's default "CSV (Comma delimited)", which would otherwise garble names like Siobhán. */
function decode(bytes: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

type Sheet = { rows: string[][]; header: boolean; roles: ColumnRole[]; source: string };

/** F078: import from a CSV file or pasted spreadsheet cells. Parsed in the browser and previewed; the server checks again. */
export function ImportDialog({ open, onClose, existingNames, onImported }: { open: boolean; onClose: () => void; existingNames: string[]; onImported: (guests: PlanGuest[]) => void }) {
  return <Dialog open={open} onClose={onClose} title="Import guests" wide intro="From Excel, Google Sheets, Numbers or a plain list. You’ll see everything before it’s added.">
    <ImportSteps onClose={onClose} existingNames={existingNames} onImported={onImported} />
  </Dialog>;
}

function ImportSteps({ onClose, existingNames, onImported }: { onClose: () => void; existingNames: string[]; onImported: (guests: PlanGuest[]) => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function read(text: string, source: string) {
    const rows = parseSheet(text);
    if (!rows.length) {
      setError("We couldn’t find any names. Check the file or pasted text and try again.");
      return;
    }
    setError("");
    setSheet({ rows, source, ...detectColumns(rows) });
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    if (/\.(xlsx|xls|numbers|ods)$/i.test(file.name)) {
      setError("That’s a spreadsheet workbook. Save it as CSV first (in Excel: File › Save a copy › CSV UTF-8), or copy the cells and paste them below.");
      return;
    }
    if (file.size > maxImportBytes) {
      setError("That file is over 1 MB. A guest list is usually much smaller: check it’s the right file.");
      return;
    }
    read(decode(await file.arrayBuffer()), file.name);
  }

  if (sheet) return <Review sheet={sheet} setSheet={setSheet} existingNames={existingNames} pending={pending} error={error}
    onBack={() => { setSheet(null); setError(""); }}
    onConfirm={(guests) => startTransition(async () => {
      const result = await importGuests(guests);
      if (!result.ok) { setError(result.message); return; }
      onImported(result.guests);
      onClose();
    })} />;

  return <div className="plan-import">
    <div className="plan-drop">
      <Icon name="upload" className="size-7" />
      <label className="button button-primary">
        Choose a CSV file
        <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,.xlsx,.xls,.numbers,.ods" className="sr-only" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
      <p>Save your spreadsheet as CSV, or start from our template.</p>
      <button type="button" className="button button-quiet" onClick={downloadTemplate}><Icon name="download" />Download template</button>
    </div>
    <div className="plan-or" aria-hidden="true"><span>or</span></div>
    <div>
      <label htmlFor="import-paste" className="field-label">Paste from your spreadsheet</label>
      <textarea id="import-paste" className="field-input plan-paste" rows={6} value={pasted} onChange={(event) => setPasted(event.target.value)}
        placeholder={"Select the cells in your spreadsheet, copy, and paste here.\nOr type one name per line."} aria-describedby="import-paste-help" />
      <p id="import-paste-help" className="field-help">Include the heading row if you have one, such as Name, Group and RSVP.</p>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
      <button type="button" className="button button-primary" disabled={!pasted.trim()} onClick={() => {
        if (new Blob([pasted]).size > maxImportBytes) setError("That’s over 1 MB of text. A guest list is usually much smaller: check you copied the right cells.");
        else read(pasted, "pasted text");
      }}>Preview guests<Icon name="arrowRight" /></button>
    </div>
  </div>;
}

function Review({ sheet, setSheet, existingNames, pending, error, onBack, onConfirm }: {
  sheet: Sheet;
  setSheet: (sheet: Sheet) => void;
  existingNames: string[];
  pending: boolean;
  error: string;
  onBack: () => void;
  onConfirm: (guests: ReturnType<typeof buildImport>["guests"]) => void;
}) {
  const built = useMemo(() => buildImport(sheet.rows, sheet.header, sheet.roles, existingNames), [sheet, existingNames]);
  const hasNames = sheet.roles.some((role) => role === "name" || role === "first" || role === "last");
  const skipped = built.rows.length - built.guests.length;
  const setRole = (index: number, role: ColumnRole) => setSheet({ ...sheet, roles: sheet.roles.map((current, at) => at === index ? role : current === role && role !== "ignore" ? "ignore" : current) });
  const sample = sheet.rows[sheet.header ? 1 : 0] ?? [];

  return <div className="plan-import">
    <fieldset className="plan-columns">
      <legend className="field-label">Match your columns <span className="plan-source">from {sheet.source}</span></legend>
      <ul>
        {sheet.roles.map((role, index) => <li key={index}>
          <label htmlFor={`import-column-${index}`}>
            <strong>{sheet.header ? sheet.rows[0][index] || `Column ${index + 1}` : `Column ${index + 1}`}</strong>
            {sample[index] && <span>e.g. {sample[index]}</span>}
          </label>
          <select id={`import-column-${index}`} className="field-input" value={role} onChange={(event) => setRole(index, event.target.value as ColumnRole)}>
            {(Object.keys(roleLabels) as ColumnRole[]).map((option) => <option key={option} value={option}>{roleLabels[option]}</option>)}
          </select>
        </li>)}
      </ul>
      <label className="plan-check"><input type="checkbox" checked={sheet.header} onChange={(event) => setSheet({ ...sheet, header: event.target.checked })} />The first row is a heading, not a guest</label>
    </fieldset>

    {!hasNames
      ? <p className="form-error" role="alert">Choose which column holds your guests’ names.</p>
      : <>
        <p className="plan-import-summary" role="status">
          <strong>{plural(built.guests.length, "guest")}</strong> to add{skipped > 0 && <>, {plural(skipped, "row")} skipped</>}
        </p>
        <div className="plan-preview" tabIndex={0} aria-label="Import preview">
          <table>
            <thead><tr><th scope="col">Row</th><th scope="col">Name</th><th scope="col">Group</th><th scope="col">RSVP</th><th scope="col"><span className="sr-only">Result</span></th></tr></thead>
            <tbody>
              {built.rows.map((row) => <tr key={row.line} data-skipped={row.result !== "ok" || undefined}>
                <td>{row.line}</td>
                <td>{row.name || <em>No name</em>}</td>
                <td>{row.group}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>{row.result === "ok" ? <span className="plan-ok"><Icon name="check" className="size-4" />Add</span> : <span className="plan-skip">{skipReasons[row.result]}</span>}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onBack}><Icon name="arrowLeft" />Back</button>
      <button type="button" className="button button-primary" disabled={!hasNames || built.guests.length === 0 || pending} onClick={() => onConfirm(built.guests)}>
        {pending ? "Adding…" : `Add ${plural(built.guests.length, "guest")}`}
      </button>
    </div>
  </div>;
}
