import { describe, expect, it } from "vitest";

import { nextInviteGeneration } from "@/lib/auth/client-lifecycle";
import { inviteRedirectUrl } from "@/features/auth/members";

describe("invite generation", () => {
  it("bumps generation on each resend", () => {
    expect(nextInviteGeneration(1)).toBe(2);
    expect(nextInviteGeneration(2)).toBe(3);
    expect(nextInviteGeneration(null)).toBe(1);
  });

  it("embeds generation in redirect URL for server validation", () => {
    const url = inviteRedirectUrl("https://ma5.hiresignalworks.com", 3);
    expect(url).toContain(encodeURIComponent("igen=3"));
  });
});
