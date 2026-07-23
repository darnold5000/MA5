import { describe, expect, it } from "vitest";

import { buildFunnelReport } from "@/features/marketing/funnel";

describe("buildFunnelReport lifecycle metrics", () => {
  it("counts only active clients as activated members", () => {
    const report = buildFunnelReport(
      [],
      [
        {
          id: "active",
          invited_at: "2026-01-01T00:00:00.000Z",
          invitation_accepted_at: "2026-01-02T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          client_status: "active",
          lead_id: "lead-1",
        },
        {
          id: "paused",
          invited_at: "2026-01-01T00:00:00.000Z",
          invitation_accepted_at: "2026-01-02T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          client_status: "paused",
          lead_id: "lead-2",
        },
      ],
    );

    expect(report.membersActivated).toBe(1);
  });

  it("does not count invited profiles as activated members", () => {
    const report = buildFunnelReport(
      [],
      [
        {
          id: "invited",
          invited_at: "2026-01-03T00:00:00.000Z",
          invitation_accepted_at: null,
          created_at: "2026-01-03T00:00:00.000Z",
          client_status: "invited",
          lead_id: "l1",
        },
      ],
    );

    expect(report.membersActivated).toBe(0);
  });
});
