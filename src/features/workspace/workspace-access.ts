import { log } from "@/lib/logger";

/** The owner has no session or no saved wedding; the message is shown to them. Logged once, where it is decided. */
export class WorkspaceAccessError extends Error {}

export function denyWorkspace(reason: "no_session" | "no_wedding", message: string): never {
  log.warn("workspace.ownership.denied", { reason });
  throw new WorkspaceAccessError(message);
}
