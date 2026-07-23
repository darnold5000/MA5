import { describe, expect, it } from "vitest";

import { matchMindbodyImportProfile } from "@/features/billing/import-mindbody-payments";
import type { ProfileLifecycleRow } from "@/lib/auth/client-lifecycle";

function indexEntry(
  id: string,
  profile: Partial<ProfileLifecycleRow>,
): Map<string, { id: string; profile: ProfileLifecycleRow }> {
  return new Map([
    [
      "alex rivera",
      {
        id,
        profile: {
          client_status: "active",
          deleted_at: null,
          active: true,
          invitation_status: "accepted",
          ...profile,
        },
      },
    ],
  ]);
}

describe("matchMindbodyImportProfile", () => {
  it("matches active clients", () => {
    const result = matchMindbodyImportProfile(
      indexEntry("user-1", { client_status: "active" }),
      "Alex Rivera",
    );
    expect(result).toEqual({ userId: "user-1", manualReviewReason: null });
  });

  it("flags deleted clients for manual review", () => {
    const result = matchMindbodyImportProfile(
      indexEntry("user-1", {
        client_status: "deleted",
        deleted_at: "2026-01-01T00:00:00.000Z",
        active: false,
      }),
      "Alex Rivera",
    );
    expect(result.userId).toBeNull();
    expect(result.manualReviewReason).toMatch(/Manual review required/i);
    expect(result.manualReviewReason).toMatch(/deleted/i);
  });

  it("flags paused clients for manual review", () => {
    const result = matchMindbodyImportProfile(
      indexEntry("user-1", { client_status: "paused", active: false }),
      "Alex Rivera",
    );
    expect(result.userId).toBeNull();
    expect(result.manualReviewReason).toMatch(/paused/i);
  });

  it("returns null match for unknown names", () => {
    const result = matchMindbodyImportProfile(new Map(), "Unknown Person");
    expect(result).toEqual({ userId: null, manualReviewReason: null });
  });
});
