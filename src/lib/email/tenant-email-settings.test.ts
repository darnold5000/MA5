import { describe, expect, it } from "vitest";

import {
  formatFromAddress,
  loadTenantEmailSettings,
} from "@/lib/email/tenant-email-settings";

describe("tenant email settings", () => {
  it("parses AUTH_EMAIL_FROM with display name", () => {
    const prev = process.env.AUTH_EMAIL_FROM;
    process.env.AUTH_EMAIL_FROM = "MA5 Performance <access@ma5performance.com>";

    const settings = loadTenantEmailSettings("d71ada88-8fad-466f-9264-3a479d54d6e2");
    expect(settings.fromName).toBe("MA5 Performance");
    expect(settings.fromEmail).toBe("access@ma5performance.com");
    expect(formatFromAddress(settings)).toBe(
      "MA5 Performance <access@ma5performance.com>",
    );

    process.env.AUTH_EMAIL_FROM = prev;
  });
});
