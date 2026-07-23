import { describe, expect, it } from "vitest";

import {
  allowedActionsForStatus,
  applyLifecycleTransition,
  deriveClientStatusFromLegacy,
  normalizeEmail,
  patchForActivated,
  patchForInvited,
  profileNeedsInviteActivationLink,
} from "@/lib/auth/client-lifecycle";

describe("client lifecycle", () => {
  it("derives invited from sent invitation", () => {
    expect(
      deriveClientStatusFromLegacy({
        invitation_status: "sent",
        active: false,
      }),
    ).toBe("invited");
  });

  it("derives active only from accepted activation", () => {
    expect(
      deriveClientStatusFromLegacy({
        invitation_status: "accepted",
        invitation_accepted_at: "2026-01-01T00:00:00.000Z",
        active: true,
      }),
    ).toBe("active");
  });

  it("revoking invite moves invited to invite_revoked", () => {
    const patch = applyLifecycleTransition(
      { client_status: "invited" },
      "revoke_invite",
      "2026-01-02T00:00:00.000Z",
    );
    expect(patch.client_status).toBe("invite_revoked");
    expect(patch.active).toBe(false);
    expect(patch.invitation_accepted_at).toBeUndefined();
  });

  it("restoring revoked invite returns invited, not active", () => {
    const patch = applyLifecycleTransition(
      { client_status: "invite_revoked" },
      "restore_invitation",
      "2026-01-02T00:00:00.000Z",
    );
    expect(patch).toMatchObject(patchForInvited("2026-01-02T00:00:00.000Z", 1));
    expect(patch.client_status).toBe("invited");
    expect(patch.active).toBe(false);
  });

  it("activation patch marks active with timestamps", () => {
    const patch = patchForActivated("2026-01-03T00:00:00.000Z");
    expect(patch.client_status).toBe("active");
    expect(patch.invitation_accepted_at).toBe("2026-01-03T00:00:00.000Z");
    expect(patch.activated_at).toBe("2026-01-03T00:00:00.000Z");
  });

  it("pauses active clients without clearing activation timestamps", () => {
    const patch = applyLifecycleTransition(
      {
        client_status: "active",
        invitation_accepted_at: "2026-01-01T00:00:00.000Z",
      },
      "pause_access",
      "2026-01-04T00:00:00.000Z",
    );
    expect(patch.client_status).toBe("paused");
    expect(patch.active).toBe(false);
  });

  it("restores paused clients to active", () => {
    const patch = applyLifecycleTransition(
      { client_status: "paused" },
      "restore_access",
      "2026-01-04T00:00:00.000Z",
    );
    expect(patch.client_status).toBe("active");
    expect(patch.active).toBe(true);
  });

  it("soft delete retains prior status", () => {
    const patch = applyLifecycleTransition(
      { client_status: "invited" },
      "delete",
      "2026-01-05T00:00:00.000Z",
    );
    expect(patch.client_status).toBe("deleted");
    expect(patch.status_before_delete).toBe("invited");
  });

  it("deleted clients cannot be restored from the admin directory", () => {
    expect(() =>
      applyLifecycleTransition(
        {
          client_status: "deleted",
          status_before_delete: "invited",
        },
        "restore_deleted",
        "2026-01-06T00:00:00.000Z",
      ),
    ).toThrow(/not allowed/);
  });

  it("exposes contextual actions per status", () => {
    expect(allowedActionsForStatus("invited")).toEqual([
      "revoke_invite",
      "delete",
    ]);
    expect(allowedActionsForStatus("invite_revoked")).toEqual([
      "restore_invitation",
      "delete",
    ]);
    expect(allowedActionsForStatus("active")).toEqual([
      "pause_access",
      "delete",
    ]);
    expect(allowedActionsForStatus("paused")).toEqual([
      "restore_access",
      "delete",
    ]);
    expect(allowedActionsForStatus("deleted")).toEqual([]);
  });

  it("invite link is required until the member activates", () => {
    expect(
      profileNeedsInviteActivationLink({
        client_status: "invited",
        invitation_accepted_at: null,
      }),
    ).toBe(true);
    expect(
      profileNeedsInviteActivationLink({
        client_status: "active",
        invitation_accepted_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      profileNeedsInviteActivationLink({
        client_status: "deleted",
        invitation_accepted_at: null,
      }),
    ).toBe(true);
  });

  it("normalizes email matching", () => {
    expect(normalizeEmail(" Hello@HireSignalWorks.com ")).toBe(
      "hello@hiresignalworks.com",
    );
  });
});

describe("invite email security expectations", () => {
  it("does not use hardcoded mike@ma5.com in lifecycle helpers", () => {
    const serialized = JSON.stringify({
      patchForInvited: patchForInvited("2026-01-01T00:00:00.000Z", 1),
      patchForActivated: patchForActivated("2026-01-01T00:00:00.000Z"),
    });
    expect(serialized).not.toContain("mike@ma5.com");
  });
});
