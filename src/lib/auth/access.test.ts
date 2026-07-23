import { describe, expect, it } from "vitest";

import { accessStateForClientStatus } from "@/lib/auth/client-lifecycle";
import { resolveAccessState } from "@/lib/auth/access";

describe("portal access gating", () => {
  it("only active clients have portal access", () => {
    expect(accessStateForClientStatus("active")).toBe("active");
    expect(accessStateForClientStatus("invited")).toBe("pending_invite");
    expect(accessStateForClientStatus("invite_revoked")).toBe("disabled");
    expect(accessStateForClientStatus("paused")).toBe("disabled");
    expect(accessStateForClientStatus("deleted")).toBe("disabled");
  });

  it("uses client_status when present", () => {
    expect(
      resolveAccessState({
        client_status: "paused",
        active: true,
        invitation_status: "accepted",
        access_revoked_at: null,
      }),
    ).toBe("disabled");
  });

  it("legacy revoked pending invite is disabled", () => {
    expect(
      resolveAccessState({
        invitation_status: "revoked",
        active: false,
        access_revoked_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("disabled");
  });
});
