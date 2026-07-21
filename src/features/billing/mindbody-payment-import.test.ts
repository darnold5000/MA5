import { describe, expect, it } from "vitest";

import {
  buildMindbodyExternalId,
  mapMindbodyTransactionStatus,
  normalizePaymentMethod,
  parseMindbodyPaymentSheetRows,
} from "./mindbody-payment-import";

describe("mindbody payment import", () => {
  const header = [
    "Transaction Volume",
    "Transaction Fees",
    "Payout Amount",
    "Transaction Date",
    "Initiated Deposit Date",
    "TRANSACTION TYPE",
    "TRANSACTION AMOUNT",
    "TRANSACTION FEES (1)",
    "NET DEPOSIT AMOUNT",
    "CLIENT NAME",
    "CLIENT ID",
    "SALE ORDER ID",
    "TRANSACTION ORIGIN",
    "Payment Method Type",
    "Merchant Currency",
  ];

  it("parses charge rows using per-transaction amount and fees", () => {
    const result = parseMindbodyPaymentSheetRows([
      header,
      [
        328,
        5.53,
        322.47,
        new Date("2026-07-16T04:22:02Z"),
        new Date("2026-07-19T04:00:00Z"),
        "Charge",
        50,
        -1.75,
        48.25,
        "Jake Benzinger",
        "100000353",
        "35243",
        "Autopay",
        "Card Not Present",
        "USD",
      ],
      [
        328,
        5.53,
        322.47,
        new Date("2026-07-14T20:28:30Z"),
        new Date("2026-07-19T04:00:00Z"),
        "Charge",
        128,
        -1.78,
        126.22,
        "Sherry Gardiner",
        "100000057",
        "35236",
        "Autopay",
        "ACH",
        "USD",
      ],
    ]);

    expect(result.skipped).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.amountCents).toBe(5000);
    expect(result.rows[0]?.processingFeeCents).toBe(175);
    expect(result.rows[0]?.netAmountCents).toBe(4825);
    expect(result.rows[1]?.paymentMethodType).toBe("ACH");
    expect(
      result.rows.reduce((sum, row) => sum + row.amountCents, 0),
    ).toBe(17800);
  });

  it("builds stable external ids", () => {
    expect(buildMindbodyExternalId("35243", "Charge")).toBe(
      "mindbody:35243:charge",
    );
  });

  it("maps transaction types", () => {
    expect(mapMindbodyTransactionStatus("Charge")).toBe("succeeded");
    expect(mapMindbodyTransactionStatus("Refund")).toBe("refunded");
  });

  it("normalizes payment methods", () => {
    expect(normalizePaymentMethod("ACH")).toBe("ACH");
    expect(normalizePaymentMethod("Card Not Present")).toBe("Card");
  });
});
