import { describe, expect, it } from "vitest";
import { trackedPath } from "./paths";

describe("analytics paths", () => {
  it("counts public marketing pages", () => {
    for (const path of ["/", "/what-we-offer", "/digital-save-the-date", "/examples/minimal", "/privacy", "/account/sign-up"]) {
      expect(trackedPath(path)).toBe(path);
    }
  });

  it("never counts wedding, dashboard, account or API pages", () => {
    for (const path of [null, "/sam-and-alex/s3cr3t", "/sam-and-alex/s3cr3t/rsvp", "/dashboard", "/dashboard/guests", "/account/password", "/account/recovery", "/auth/confirm", "/api/runtime-config", "/examples/minimal/extra", "/what-we-offer/phone/minimal"]) {
      expect(trackedPath(path)).toBeNull();
    }
  });
});
