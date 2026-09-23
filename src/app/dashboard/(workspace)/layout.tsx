import Link from "next/link";
import { SignOutButton } from "@/features/account/sign-out-button";
import { formatWeddingDate } from "@/features/weddings/wedding";
import { Icon } from "@/features/workspace/workspace-icons";
import { WorkspaceNav } from "@/features/workspace/workspace-nav";
import { loadWorkspace } from "@/features/workspace/workspace-data";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { wedding, live } = await loadWorkspace();
  return <div className="platform workspace min-h-svh">
    <a href="#workspace-content" className="ws-skip">Skip to content</a>
    <header className="ws-top">
      <div className="flex min-w-0 items-center gap-6">
        <Link href="/" className="brand shrink-0">SaveTheDates<span aria-hidden="true">.</span></Link>
        {wedding && <div className="ws-top-meta">
          <span aria-hidden="true" className="h-5 border-l border-[var(--line)]" />
          <span className="ws-top-names">{wedding.first_name} &amp; {wedding.second_name}</span>
          <span className="whitespace-nowrap">{formatWeddingDate(wedding.wedding_date)}</span>
          {live ? <span className="badge badge-positive badge-dot">Published</span> : <span className="badge"><Icon name="lock" />Private draft</span>}
        </div>}
      </div>
      <div className="ws-top-actions">
        {wedding && <Link href="/dashboard/preview" prefetch={false} className="button button-secondary"><Icon name="eye" />Preview<span className="sr-only"> site</span></Link>}
        <SignOutButton className="button button-quiet" />
      </div>
    </header>
    <div className={wedding ? "ws-body" : "ws-solo"}>
      {wedding && <WorkspaceNav />}
      <main id="workspace-content" tabIndex={-1} className="ws-main">{children}</main>
    </div>
  </div>;
}
