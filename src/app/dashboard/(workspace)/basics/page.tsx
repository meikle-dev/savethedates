import type { Metadata } from "next";
import { DraftForm } from "@/features/workspace/draft-form";
import { draftSchema } from "@/features/workspace/validation";
import { loadWorkspace } from "@/features/workspace/workspace-data";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export const metadata: Metadata = { title: "Basics · SaveTheDates" };

const emptyDraft = { first_name: "", second_name: "", wedding_date: "", location: "", message: "" };

// New accounts start here. The form keeps its position when the first save creates the wedding,
// so its confirmation stays on screen while the rest of the workspace appears.
export default async function Basics() {
  const { wedding, live } = await loadWorkspace();
  const privacy = "Only you can access this draft. It isn’t shared with guests.";
  return <WorkspacePage
    id="draft-title"
    eyebrow={wedding ? "Basics" : "Your wedding workspace"}
    title={wedding ? "The two of you" : "Start with your story."}
    intro={!wedding ? "A few details, a date to remember. Save your first chapter here and come back whenever you like." : live ? "Your site is public. Saving details updates it immediately." : privacy}
  >
    <div className="ws-panel">
      {!wedding && <><h2>The two of you</h2><p className="ws-panel-intro">{privacy}</p></>}
      <DraftForm initial={wedding ? draftSchema.parse(wedding) : emptyDraft} published={live} />
    </div>
    {!wedding && <aside className="mt-8 px-1">
      <h2 className="text-sm font-semibold">What comes next?</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">Save your details to choose a theme and photo, add Wedding Details, set up RSVPs, preview your site and choose a URL to share.</p>
    </aside>}
  </WorkspacePage>;
}
