import type { MealMenu } from "@/features/weddings/meal-menu";
import { courseCounts, dietaryCounts, type CateringSummary } from "./catering";

const otherShown = 10;
const number = (value: number) => value.toLocaleString("en-GB");

function OtherEntries({ entries }: { entries: CateringSummary["other"] }) {
  return <ul>{entries.map((entry, index) => <li key={index}>“{entry.text}” — {entry.name}</li>)}</ul>;
}

// F068: catering numbers for the couple's caterer, counted over every attending reply (never the current filter or
// page). A choice counts under an option only while the option and its text still match the menu.
export function CateringPanel({ summary, menu, enabled }: { summary: CateringSummary; menu: MealMenu; enabled: boolean }) {
  const blocks = courseCounts(summary, menu, enabled);
  return <section className="ws-panel" aria-labelledby="catering-title">
    <h2 id="catering-title">Catering numbers</h2>
    <p className="ws-panel-intro">From {number(summary.attending)} attending {summary.attending === 1 ? "guest" : "guests"}. Replies from guests who aren’t attending aren’t counted.</p>
    <div className="catering-grid">
      {blocks.map((block) => <section key={block.course} className="catering-block" aria-labelledby={`catering-${block.course}`}>
        <h3 id={`catering-${block.course}`}>{block.title}</h3>
        <dl className="catering-list">
          {block.options.map((option) => <div key={option.id}><dt>{option.label}</dt><dd>{number(option.count)}</dd></div>)}
          {block.noLongerOnMenu > 0 && <div><dt className="catering-muted">No longer on the menu</dt><dd>{number(block.noLongerOnMenu)}</dd></div>}
          {block.noChoice > 0 && <div><dt className="catering-muted">No choice</dt><dd>{number(block.noChoice)}</dd></div>}
        </dl>
      </section>)}
      <section className="catering-block" aria-labelledby="catering-dietary">
        <h3 id="catering-dietary">Food preferences</h3>
        <dl className="catering-list">
          {dietaryCounts(summary).map(({ value, label, count }) => <div key={value}><dt>{label}</dt><dd>{number(count)}</dd></div>)}
        </dl>
        <p className="catering-help">A guest can have more than one, so these may not add up to the attending total.</p>
        {summary.other.length > 0 && <div className="catering-other">
          <h4>Other preferences</h4>
          <OtherEntries entries={summary.other.slice(0, otherShown)} />
          {summary.other.length > otherShown && <details>
            <summary className="button button-quiet button-flush">Show all {number(summary.other.length)} other preferences</summary>
            <OtherEntries entries={summary.other.slice(otherShown)} />
          </details>}
        </div>}
      </section>
    </div>
  </section>;
}
