"use client";

import { useActionState, useState } from "react";
import type { GuestListResponse, RsvpState } from "@/features/weddings/rsvp";
import { dietaryText, type MealMenu } from "@/features/weddings/meal-menu";
import { replyMealLines, responseDietary, responseHasFood } from "./catering";
import { AttendanceBadge } from "./attendance-badge";
import { manageSharedResponse } from "./rsvp-actions";

export type GuestFoodView = { menu: MealMenu; mealsOn: boolean; showMeals: boolean };

// F068: an attending reply's meal choices and food preferences, under the name so the table gains no columns.
function FoodLines({ response, food }: { response: GuestListResponse; food: GuestFoodView }) {
  const meals = food.showMeals ? replyMealLines(response, food.menu, food.mealsOn) : [];
  return <dl className="guest-food">
    {meals === null
      ? <div><dt className="sr-only">Meal</dt><dd>No meal choice</dd></div>
      : meals.map((line) => <div key={line.title}><dt>{line.title}:</dt> <dd>{line.label ?? "no choice"}{line.stale && <> <em>(no longer on the menu)</em></>}</dd></div>)}
    <div><dt>Dietary:</dt> <dd>{dietaryText(responseDietary(response), response.dietary_other, "none given", true)}</dd></div>
  </dl>;
}

// One table row plus an inline correction panel directly beneath it.
function GuestRow({ response, date, food, onSuccess }: { response: GuestListResponse; date: string; food: GuestFoodView; onSuccess: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  // The row may leave this page (removed, or no longer matching the filter), so report success outside it too.
  const [state, action, pending] = useActionState<RsvpState, FormData>(async (previous, form) => {
    const result = await manageSharedResponse(previous, form);
    if (result.success && result.message) onSuccess(result.message);
    return result;
  }, {});
  const panelId = `correct-${response.id}`;
  const hasFood = response.attending && responseHasFood(response);
  const attendanceHelp = [hasFood && `food-warning-${response.id}`, state.errors?.attending && `attendance-error-${response.id}`].filter(Boolean).join(" ") || undefined;
  return <>
    <tr className="guest-row">
      <th scope="row" className="guest-name"><span className="guest-name-text">{response.responding_name}</span>{response.attending && <FoodLines response={response} food={food} />}</th>
      <td><AttendanceBadge attending={response.attending} /></td>
      <td className="guest-date"><time dateTime={response.responded_at}>{date}</time></td>
      <td className="guest-action">
        <button type="button" className="button button-quiet button-flush" aria-expanded={open} aria-controls={panelId} aria-label={`Correct or remove response from ${response.responding_name}`} onClick={() => setOpen(!open)}>
          Correct or remove
        </button>
      </td>
    </tr>
    <tr id={panelId} className="guest-panel" hidden={!open}>
      <td colSpan={4}>
        <form action={action} noValidate className="grid gap-3">
          <input type="hidden" name="response_id" value={response.id} />
          <div><label htmlFor={`name-${response.id}`} className="field-label">Responding name</label><input id={`name-${response.id}`} name="responding_name" className="field-input" defaultValue={response.responding_name} maxLength={80} aria-invalid={!!state.errors?.responding_name} aria-describedby={state.errors?.responding_name ? `name-error-${response.id}` : undefined} />{state.errors?.responding_name && <p id={`name-error-${response.id}`} className="field-error">{state.errors.responding_name[0]}</p>}</div>
          <fieldset aria-invalid={!!state.errors?.attending} aria-describedby={attendanceHelp}><legend className="field-label">Attendance</legend><div className="segmented"><label className="segment"><input type="radio" name="attending" value="yes" defaultChecked={response.attending} />Attending</label><label className="segment"><input type="radio" name="attending" value="no" defaultChecked={!response.attending} />Not attending</label></div>{hasFood && <p id={`food-warning-${response.id}`} className="field-help">Changing to Not attending also removes their meal choices and food preferences.</p>}{state.errors?.attending && <p id={`attendance-error-${response.id}`} className="field-error">{state.errors.attending[0]}</p>}</fieldset>
          {food.mealsOn && <p className="field-help mt-0">To change a meal choice or food preference, ask the guest to send a new reply, then remove this one.</p>}
          <button name="intent" value="correct" className="button button-primary justify-self-start" disabled={pending}>Save correction</button>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_remove" value="yes" /><span>Remove this response from the list and totals</span></label>
          <button name="intent" value="remove" className="button button-secondary justify-self-start" disabled={pending}>Remove response</button>
          {state.message && <p className={state.success ? "form-notice" : "form-error"} role={state.success ? "status" : "alert"}>{state.message}</p>}
        </form>
      </td>
    </tr>
  </>;
}

export function GuestTable({ rows, caption, food }: { rows: { response: GuestListResponse; date: string }[]; caption: string; food: GuestFoodView }) {
  const [notice, setNotice] = useState("");
  return <>
    <p className="sr-only" role="status">{notice}</p>
    <table className="guest-table">
      <caption className="sr-only">{caption}</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">Response</th><th scope="col">Date</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{rows.map(({ response, date }) => <GuestRow key={response.id} response={response} date={date} food={food} onSuccess={setNotice} />)}</tbody>
    </table>
  </>;
}
