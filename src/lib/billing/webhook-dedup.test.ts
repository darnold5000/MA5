import { describe, expect, it } from "vitest";

import {
  STALE_WEBHOOK_CLAIM_MS,
  resolveWebhookClaimAction,
} from "./webhook-dedup";

describe("resolveWebhookClaimAction", () => {
  const now = 1_700_000_000_000;

  it("treats completed events as duplicates", () => {
    expect(
      resolveWebhookClaimAction(
        {
          id: "1",
          processing_status: "completed",
          claimed_at: null,
        },
        now,
      ),
    ).toBe("complete_duplicate");
  });

  it("retries failed events", () => {
    expect(
      resolveWebhookClaimAction(
        {
          id: "1",
          processing_status: "failed",
          claimed_at: null,
        },
        now,
      ),
    ).toBe("retry");
  });

  it("blocks concurrent processing claims that are still fresh", () => {
    expect(
      resolveWebhookClaimAction(
        {
          id: "1",
          processing_status: "processing",
          claimed_at: new Date(now - 30_000).toISOString(),
        },
        now,
      ),
    ).toBe("in_progress");
  });

  it("allows reclaim of stale processing claims", () => {
    expect(
      resolveWebhookClaimAction(
        {
          id: "1",
          processing_status: "processing",
          claimed_at: new Date(now - STALE_WEBHOOK_CLAIM_MS - 1).toISOString(),
        },
        now,
      ),
    ).toBe("retry");
  });
});
