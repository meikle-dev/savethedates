"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { courses, courseWords, maxMealOptionLength, maxMealOptions, mealChoicesIntro, optionErrorKey, type Course, type MealMenu, type MealOptionDraft } from "@/features/weddings/meal-menu";
import { saveMealChoices, type MealChoicesState } from "./rsvp-actions";
import { Icon } from "./workspace-icons";

type Row = MealOptionDraft & { key: string };
type Rows = Record<Course, Row[]>;

// Saved options are keyed by their id, so server and browser render the same element ids. New rows get a key from a
// counter that only ever runs in the browser (in event handlers and after a save).
let lastKey = 0;
const newKey = () => `new-${++lastKey}`;
function toRows(menu: Record<Course, MealOptionDraft[]>): Rows {
  const used = new Set<string>();
  return Object.fromEntries(courses.map((course) => [course, menu[course].map((option) => {
    const key = option.id && !used.has(option.id) ? option.id : newKey();
    used.add(key);
    return { ...option, key };
  })])) as Rows;
}
const emptyRow = (): Row => ({ id: "", label: "", key: newKey() });

// F068: the couple's menu, following the FAQ editor pattern: client state, one hidden JSON field and one save for the
// whole menu. The server validates and assigns ids to new options; the database enforces the same limits.
export function MealChoicesForm({ enabled, menu }: { enabled: boolean; menu: MealMenu }) {
  const [state, action, pending] = useActionState<MealChoicesState, FormData>(saveMealChoices, {});
  const [on, setOn] = useState(enabled);
  const [rows, setRows] = useState(() => toRows(menu));
  const [dirty, setDirty] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [appliedState, setAppliedState] = useState(state);
  const focusNext = useRef<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const saved = state.success && state.values ? { enabled: state.values.enabled, menu: state.values.menu as MealMenu } : { enabled, menu };
  if (appliedState !== state) {
    setAppliedState(state);
    if (state.values) {
      setOn(state.values.enabled);
      setRows(toRows(state.values.menu));
    }
    setDirty(!!state.values && !state.success);
  }

  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  }, [rows]);
  // A rejected save moves focus to the first invalid field.
  useEffect(() => {
    if (state.success || !state.errors) return;
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid?.matches("fieldset") ? invalid.querySelector<HTMLElement>("input, button:not(:disabled)") : invalid)?.focus();
  }, [state]);

  function update(course: Course, next: Row[], focus: string | null, message = "") {
    focusNext.current = focus;
    setRows((current) => ({ ...current, [course]: next }));
    setAnnouncement(message);
    setDirty(true);
  }
  function move(course: Course, index: number, step: -1 | 1) {
    const list = [...rows[course]];
    const target = index + step;
    [list[index], list[target]] = [list[target], list[index]];
    // Focus stays on the same button in the row's new position, or the other move button once this one is disabled.
    const edge = step === -1 ? target === 0 : target === list.length - 1;
    const direction = (step === -1) !== edge ? "up" : "down";
    update(course, list, `meal-${course}-${list[target].key}-${direction}`, `Moved to position ${target + 1} of ${list.length}.`);
  }
  function remove(course: Course, index: number) {
    const list = rows[course].filter((_, position) => position !== index);
    const next = rows[course][index + 1] ?? rows[course][index - 1];
    update(course, list, next ? `meal-${course}-${next.key}-input` : `meal-${course}-start`, "Option removed.");
  }
  function add(course: Course, count: 1 | 2) {
    const added = Array.from({ length: count }, emptyRow);
    update(course, [...rows[course], ...added], `meal-${course}-${added[0].key}-input`);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  const draft = Object.fromEntries(courses.map((course) => [course, rows[course].map(({ id, label }) => ({ id, label }))]));
  const enabledError = state.errors?.enabled?.[0];
  return <section className="ws-panel" aria-labelledby="meal-choices-title">
    <div className="ws-panel-head">
      <h2 id="meal-choices-title">Meal choices</h2>
      <span className={saved.enabled ? "badge badge-positive" : "badge"}>{saved.enabled ? "On" : "Off"}</span>
    </div>
    <p className="ws-panel-intro">{mealChoicesIntro(saved.enabled, saved.menu)}</p>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <form ref={form} onSubmit={submit} noValidate className="mt-5">
      <input type="hidden" name="meal_menu" value={JSON.stringify(draft)} />
      <label className="details-toggle">
        <input name="meal_choices_enabled" type="checkbox" checked={on} aria-invalid={!!enabledError} aria-describedby={enabledError ? "meal-choices-help meal-choices-error" : "meal-choices-help"} onChange={(event) => { setOn(event.target.checked); setDirty(true); }} />
        <span><strong>Ask guests to choose their meal</strong><span id="meal-choices-help" className="mt-1 block text-sm text-[var(--muted)]">Switching this off hides the menu from guests but keeps it, and any choices already made.</span></span>
      </label>
      {enabledError && <p id="meal-choices-error" className="field-error">{enabledError}</p>}

      {courses.map((course) => {
        const { title, one, many } = courseWords[course];
        const list = rows[course];
        const courseError = state.errors?.[course]?.[0];
        return <fieldset key={course} className="meal-course" aria-invalid={!!courseError} aria-describedby={courseError ? `meal-${course}-error` : undefined}>
          <legend>{title}</legend>
          {list.length === 0
            ? <div className="meal-course-empty">
              <p>No {one} options. Guests won’t be asked about {many}.</p>
              <button type="button" id={`meal-${course}-start`} className="button button-secondary" onClick={() => add(course, 2)}>Add {one} options</button>
            </div>
            : <ol className="meal-options">
              {list.map((row, index) => {
                const error = state.errors?.[optionErrorKey(course, index)]?.[0];
                const inputId = `meal-${course}-${row.key}-input`;
                return <li key={row.key} className="meal-option">
                  <div className="meal-option-head">
                    <label htmlFor={inputId} className="field-label"><span className="sr-only">{title} </span>Option {index + 1}</label>
                    <div className="meal-option-actions">
                      <button type="button" id={`meal-${course}-${row.key}-up`} className="icon-button" disabled={index === 0} aria-label={`Move ${one} option ${index + 1} up`} onClick={() => move(course, index, -1)}><Icon name="arrowUp" /></button>
                      <button type="button" id={`meal-${course}-${row.key}-down`} className="icon-button" disabled={index === list.length - 1} aria-label={`Move ${one} option ${index + 1} down`} onClick={() => move(course, index, 1)}><Icon name="arrowDown" /></button>
                      <button type="button" className="icon-button" aria-label={`Remove ${one} option ${index + 1}`} onClick={() => remove(course, index)}><Icon name="remove" /></button>
                    </div>
                  </div>
                  <input id={inputId} className="field-input" value={row.label} maxLength={maxMealOptionLength} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined}
                    onChange={(event) => { const label = event.target.value; setRows((current) => ({ ...current, [course]: current[course].map((item) => item.key === row.key ? { ...item, label } : item) })); setDirty(true); }} />
                  {error && <p id={`${inputId}-error`} className="field-error">{error}</p>}
                </li>;
              })}
            </ol>}
          {courseError && <p id={`meal-${course}-error`} className="field-error">{courseError}</p>}
          {list.length > 0 && (list.length < maxMealOptions
            ? <button type="button" className="button button-quiet button-flush mt-2" onClick={() => add(course, 1)}>Add another {one} option</button>
            : <p className="field-help">Six options is the most for one course.</p>)}
        </fieldset>;
      })}
      <p className="field-help mt-5">Renaming or removing an option doesn’t change replies already sent. In Guests, those replies are marked ‘no longer on the menu’. Check your menu before you share your link.</p>

      {state.message && !(state.success && dirty) && <p className={`mt-5 ${state.success ? "form-notice" : "form-error"}`} role={state.success ? "status" : "alert"}>{state.message}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save meal choices"}</button>
        {dirty && <p className="text-sm text-[var(--muted)]">Save to apply your changes.</p>}
      </div>
    </form>
  </section>;
}
