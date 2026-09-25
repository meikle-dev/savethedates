import { describe, expect, it } from "vitest";
import { sentryOptions } from "./sentry-options";

describe("Sentry options", () => {
  it("send no personal data, no traces and no trace headers", () => {
    const options = sentryOptions({ dsn: "https://key@o1.ingest.de.sentry.io/2", environment: "staging", release: "abc123" });
    expect(options).toMatchObject({ sendDefaultPii: false, tracesSampleRate: 0, tracePropagationTargets: [], environment: "staging", release: "abc123" });
    expect(options.beforeBreadcrumb({ category: "ui.click", message: "Sam Taylor" })).toBeNull();
  });
});
