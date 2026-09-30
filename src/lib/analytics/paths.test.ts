import { describe, expect, it } from "vitest";
import { trackedPath } from "./paths";

describe("analytics paths", () => {
  it("counts public marketing pages", () => {
    for (const path of ["/", "/what-we-offer", "/digital-save-the-date", "/guides/save-the-date-wording", "/examples/minimal", "/examples/evening-gold/invitation", "/examples/minimal/details", "/examples/velvet/rsvp", "/privacy", "/account/sign-up"]) {
      expect(trackedPath(path)).toBe(path);
    }
  });

  it("never counts wedding, dashboard, account or API pages", () => {
    for (const path of [null, "/sam-and-alex/s3cr3t", "/sam-and-alex/s3cr3t/rsvp", "/dashboard", "/dashboard/guests", "/account/password", "/account/recovery", "/auth/confirm", "/api/runtime-config", "/examples/minimal/extra", "/examples/minimal/invitation/extra", "/guides", "/guides/other", "/what-we-offer/phone/minimal"]) {
      expect(trackedPath(path)).toBeNull();
    }
  });
});
