import { describe, expect, it, vi } from "vitest";

import type { ProfileLifecycleRow } from "@/lib/auth/client-lifecycle";
import {
  applyActiveClientFilter,
  applyInvitedClientFilter,
  filterToActiveClientIds,
  isActiveOperationalClient,
  isInvitedClientProfile,
  isSelectableClientProfile,
} from "@/lib/auth/member-filters";
import { MA5_TABLES } from "@/lib/supabase/tables";

function profile(
  overrides: Partial<ProfileLifecycleRow> = {},
): ProfileLifecycleRow {
  return {
    client_status: "active",
    deleted_at: null,
    active: true,
    invitation_status: "accepted",
    ...overrides,
  };
}

describe("isSelectableClientProfile", () => {
  it("includes active clients", () => {
    expect(isSelectableClientProfile(profile())).toBe(true);
  });

  it("excludes paused clients", () => {
    expect(isSelectableClientProfile(profile({ client_status: "paused" }))).toBe(
      false,
    );
  });

  it("excludes invited clients", () => {
    expect(
      isSelectableClientProfile(profile({ client_status: "invited" })),
    ).toBe(false);
  });

  it("excludes revoked invites", () => {
    expect(
      isSelectableClientProfile(profile({ client_status: "invite_revoked" })),
    ).toBe(false);
  });

  it("excludes deleted clients", () => {
    expect(
      isSelectableClientProfile(
        profile({
          client_status: "deleted",
          deleted_at: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("excludes profiles with deleted_at even when status is stale", () => {
    expect(
      isSelectableClientProfile(
        profile({
          client_status: "active",
          deleted_at: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });
});

describe("isInvitedClientProfile", () => {
  it("returns only invited non-deleted profiles", () => {
    expect(isInvitedClientProfile(profile({ client_status: "invited" }))).toBe(
      true,
    );
    expect(isInvitedClientProfile(profile({ client_status: "active" }))).toBe(
      false,
    );
    expect(
      isInvitedClientProfile(
        profile({
          client_status: "invited",
          deleted_at: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });
});

describe("isActiveOperationalClient", () => {
  it("matches selectable active clients", () => {
    expect(isActiveOperationalClient(profile())).toBe(true);
    expect(isActiveOperationalClient(profile({ client_status: "paused" }))).toBe(
      false,
    );
  });
});

describe("applyActiveClientFilter", () => {
  it("chains client_status and deleted_at filters", () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    };

    applyActiveClientFilter(query);

    expect(query.eq).toHaveBeenCalledWith("client_status", "active");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  });
});

describe("applyInvitedClientFilter", () => {
  it("chains invited status and deleted_at filters", () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    };

    applyInvitedClientFilter(query);

    expect(query.eq).toHaveBeenCalledWith("client_status", "invited");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  });
});

describe("filterToActiveClientIds", () => {
  it("returns only active client ids", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({
              data: [{ id: "active-1" }],
            }),
          }),
        }),
      }),
    };

    const ids = await filterToActiveClientIds(supabase, [
      "active-1",
      "paused-2",
    ]);

    expect(supabase.from).toHaveBeenCalledWith(MA5_TABLES.profiles);
    expect(ids).toEqual(["active-1"]);
  });
});
