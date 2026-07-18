import { describe, expect, it } from "vitest";

import { isBotUserAgent } from "@/lib/attribution/bots";
import {
  applyLastTouchUpdate,
  canDeleteLead,
  canDeleteVisitorSession,
  isAnonymousSessionExpired,
  mergeFirstTouch,
} from "@/lib/attribution/first-touch";
import {
  hasCampaignParams,
  parseAttributionFromSearchParams,
} from "@/lib/attribution/parse";
import type { AttributionTouch } from "@/lib/attribution/types";
import { buildFunnelReport } from "@/features/marketing/funnel";

function touch(
  partial: Partial<AttributionTouch> & Pick<AttributionTouch, "capturedAt">,
): AttributionTouch {
  return {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    landingPage: null,
    referrer: null,
    ...partial,
  };
}

describe("direct traffic", () => {
  it("captures landing page without UTMs", () => {
    const parsed = parseAttributionFromSearchParams(
      new URLSearchParams(),
      "/about",
      null,
      "2026-01-01T00:00:00.000Z",
    );
    expect(parsed.utmSource).toBeNull();
    expect(parsed.landingPage).toBe("/about");
    expect(hasCampaignParams(parsed)).toBe(false);
  });
});

describe("returning visitor with new campaign", () => {
  it("keeps first-touch and updates last-touch", () => {
    const first = touch({
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "spring_strength",
      landingPage: "/?utm_source=instagram",
      capturedAt: "2026-01-01T00:00:00.000Z",
    });
    const returning = touch({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "avon_performance",
      landingPage: "/training?utm_source=google",
      capturedAt: "2026-02-01T00:00:00.000Z",
    });

    const mergedFirst = mergeFirstTouch(first, returning);
    expect(mergedFirst.utmSource).toBe("instagram");
    expect(mergedFirst.utmCampaign).toBe("spring_strength");
    expect(mergedFirst.landingPage).toBe("/?utm_source=instagram");

    const last = applyLastTouchUpdate(first, returning, true);
    expect(last?.utmSource).toBe("google");
    expect(last?.utmCampaign).toBe("avon_performance");
  });
});

describe("first-touch immutability", () => {
  it("never overwrites populated fields; may fill previously null fields once", () => {
    const existing = touch({
      utmSource: "referral",
      landingPage: "/contact",
      capturedAt: "2026-01-01T00:00:00.000Z",
    });
    const incoming = touch({
      utmSource: "facebook",
      utmCampaign: "later",
      landingPage: "/book",
      capturedAt: "2026-03-01T00:00:00.000Z",
    });
    const merged = mergeFirstTouch(existing, incoming);
    expect(merged.utmSource).toBe("referral");
    expect(merged.landingPage).toBe("/contact");
    // Matches DB trigger: only non-null OLD values are preserved
    expect(merged.utmCampaign).toBe("later");
  });
});

describe("bots", () => {
  it("flags known crawlers", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(
      true,
    );
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
      ),
    ).toBe(false);
  });
});

describe("unaccepted invitation", () => {
  it("counts invite sent without acceptance in funnel", () => {
    const report = buildFunnelReport(
      [
        {
          created_at: "2026-01-01T00:00:00.000Z",
          invited_at: "2026-01-03T00:00:00.000Z",
          converted_at: null,
          status: "qualified",
          converted_profile_id: "p1",
        },
      ],
      [
        {
          id: "p1",
          invited_at: "2026-01-03T00:00:00.000Z",
          invitation_accepted_at: null,
          created_at: "2026-01-03T00:00:00.000Z",
          active: false,
          lead_id: "l1",
        },
      ],
    );
    expect(report.leadsCreated).toBe(1);
    expect(report.invitationsSent).toBe(1);
    expect(report.invitationsAccepted).toBe(0);
    expect(report.membersActivated).toBe(0);
    expect(report.avgDaysLeadToInvite).toBe(2);
    expect(report.avgDaysLeadToConversion).toBeNull();
  });
});

describe("existing-member conversion timing", () => {
  it("computes lead to conversion from converted_at", () => {
    const report = buildFunnelReport(
      [
        {
          created_at: "2026-01-01T00:00:00.000Z",
          invited_at: "2026-01-02T00:00:00.000Z",
          converted_at: "2026-01-11T00:00:00.000Z",
          status: "converted",
          converted_profile_id: "p1",
        },
      ],
      [
        {
          id: "p1",
          invited_at: "2026-01-02T00:00:00.000Z",
          invitation_accepted_at: "2026-01-11T00:00:00.000Z",
          created_at: "2025-12-01T00:00:00.000Z",
          active: true,
          lead_id: "l1",
        },
      ],
    );
    expect(report.avgDaysLeadToConversion).toBe(10);
    expect(report.membersActivated).toBe(1);
  });
});

describe("privacy / retention", () => {
  it("expires only unlinked anonymous sessions after 90 days", () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    expect(
      isAnonymousSessionExpired({
        lastSeen: "2025-12-01T00:00:00.000Z",
        linkedToLead: false,
        now,
      }),
    ).toBe(true);
    expect(
      isAnonymousSessionExpired({
        lastSeen: "2025-12-01T00:00:00.000Z",
        linkedToLead: true,
        now,
      }),
    ).toBe(false);
    expect(
      isAnonymousSessionExpired({
        lastSeen: "2026-03-20T00:00:00.000Z",
        linkedToLead: false,
        now,
      }),
    ).toBe(false);
  });

  it("blocks deleting visitors linked to leads and converted active members", () => {
    expect(canDeleteVisitorSession(false)).toBe(true);
    expect(canDeleteVisitorSession(true)).toBe(false);
    expect(
      canDeleteLead({
        status: "new",
        convertedProfileId: null,
      }),
    ).toBe(true);
    expect(
      canDeleteLead({
        status: "converted",
        convertedProfileId: "p1",
        memberActive: true,
      }),
    ).toBe(false);
    expect(
      canDeleteLead({
        status: "qualified",
        convertedProfileId: "p1",
        memberActive: true,
      }),
    ).toBe(false);
    expect(
      canDeleteLead({
        status: "qualified",
        convertedProfileId: "p1",
        memberActive: false,
      }),
    ).toBe(true);
  });
});

describe("revoked access", () => {
  it("does not count revoked inactive profiles as activated members", () => {
    const report = buildFunnelReport(
      [
        {
          created_at: "2026-01-01T00:00:00.000Z",
          invited_at: "2026-01-02T00:00:00.000Z",
          converted_at: "2026-01-05T00:00:00.000Z",
          status: "converted",
          converted_profile_id: "p1",
        },
      ],
      [
        {
          id: "p1",
          invited_at: "2026-01-02T00:00:00.000Z",
          invitation_accepted_at: "2026-01-05T00:00:00.000Z",
          created_at: "2026-01-02T00:00:00.000Z",
          active: false,
          lead_id: "l1",
        },
      ],
    );
    expect(report.invitationsAccepted).toBe(1);
    expect(report.membersActivated).toBe(0);
  });
});
