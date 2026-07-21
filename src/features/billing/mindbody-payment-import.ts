import * as XLSX from "xlsx";

export type MindbodyPaymentRow = {
  externalPaymentId: string;
  transactionDate: Date;
  payoutDate: Date | null;
  transactionType: string;
  status: "succeeded" | "failed" | "refunded" | "pending";
  amountCents: number;
  processingFeeCents: number;
  netAmountCents: number;
  clientName: string;
  mindbodyClientId: string | null;
  saleOrderId: string;
  transactionOrigin: string | null;
  cardBrand: string | null;
  paymentMethodType: string;
  currency: string;
};

export type MindbodyParseResult = {
  rows: MindbodyPaymentRow[];
  skipped: { row: number; reason: string }[];
};

export type MindbodyPaymentInsert = MindbodyPaymentRow & {
  userId: string | null;
};

const HEADER_ALIASES: Record<string, string> = {
  "transaction date": "transactionDate",
  "transaction type": "transactionType",
  "transaction amount": "transactionAmount",
  "transaction fees (1)": "transactionFees",
  "transaction fees": "transactionFees",
  "net deposit amount": "netDepositAmount",
  "client name": "clientName",
  "client id": "clientId",
  "sale order id": "saleOrderId",
  "initiated deposit date": "payoutDate",
  "transaction origin": "transactionOrigin",
  "card brand": "cardBrand",
  "payment method type": "paymentMethodType",
  "merchant currency": "currency",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(
      Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S),
    );
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function dollarsToCents(value: unknown): number {
  if (value == null || value === "") return 0;
  const n =
    typeof value === "number" ? value : Number.parseFloat(String(value).trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.abs(n) * 100);
}

export function normalizePaymentMethod(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Unknown";
  const lower = raw.trim().toLowerCase();
  if (lower.includes("ach")) return "ACH";
  if (lower.includes("card")) return "Card";
  return raw.trim();
}

export function mapMindbodyTransactionStatus(
  transactionType: string,
): MindbodyPaymentRow["status"] {
  const t = transactionType.trim().toLowerCase();
  if (t.includes("refund")) return "refunded";
  if (t.includes("fail") || t.includes("declin") || t.includes("void")) {
    return "failed";
  }
  if (t.includes("pending")) return "pending";
  return "succeeded";
}

export function buildMindbodyExternalId(
  saleOrderId: string,
  transactionType: string,
): string {
  const type = transactionType.trim().toLowerCase().replace(/\s+/g, "_");
  return `mindbody:${saleOrderId}:${type}`;
}

function cellString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function buildHeaderIndex(headerRow: unknown[]): Map<string, number> {
  const index = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    const key = normalizeHeader(cell);
    const field = HEADER_ALIASES[key];
    if (field) index.set(field, i);
  });
  return index;
}

function getCell(row: unknown[], index: Map<string, number>, field: string) {
  const i = index.get(field);
  if (i == null) return undefined;
  return row[i];
}

export function parseMindbodyPaymentSheetRows(
  sheetRows: unknown[][],
): MindbodyParseResult {
  if (sheetRows.length < 2) {
    return { rows: [], skipped: [{ row: 1, reason: "No data rows found" }] };
  }

  const headerIndex = buildHeaderIndex(sheetRows[0] ?? []);
  const required = [
    "transactionDate",
    "transactionType",
    "transactionAmount",
    "saleOrderId",
  ] as const;
  const missing = required.filter((f) => !headerIndex.has(f));
  if (missing.length > 0) {
    return {
      rows: [],
      skipped: [
        {
          row: 1,
          reason: `Missing columns: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const rows: MindbodyPaymentRow[] = [];
  const skipped: MindbodyParseResult["skipped"] = [];

  for (let r = 1; r < sheetRows.length; r++) {
    const row = sheetRows[r] ?? [];
    const saleOrderId = cellString(getCell(row, headerIndex, "saleOrderId"));
    const transactionType = cellString(
      getCell(row, headerIndex, "transactionType"),
    );
    const amountCents = dollarsToCents(
      getCell(row, headerIndex, "transactionAmount"),
    );

    if (!saleOrderId && amountCents === 0) continue;
    if (!saleOrderId) {
      skipped.push({ row: r + 1, reason: "Missing sale order id" });
      continue;
    }
    if (!transactionType) {
      skipped.push({ row: r + 1, reason: "Missing transaction type" });
      continue;
    }
    if (amountCents <= 0 && mapMindbodyTransactionStatus(transactionType) !== "refunded") {
      skipped.push({ row: r + 1, reason: "Missing transaction amount" });
      continue;
    }

    const transactionDate = parseExcelDate(
      getCell(row, headerIndex, "transactionDate"),
    );
    if (!transactionDate) {
      skipped.push({ row: r + 1, reason: "Invalid transaction date" });
      continue;
    }

    const feeCents = dollarsToCents(getCell(row, headerIndex, "transactionFees"));
    const netFromFile = dollarsToCents(
      getCell(row, headerIndex, "netDepositAmount"),
    );
    const netAmountCents =
      netFromFile > 0 ? netFromFile : Math.max(amountCents - feeCents, 0);

    rows.push({
      externalPaymentId: buildMindbodyExternalId(saleOrderId, transactionType),
      transactionDate,
      payoutDate: parseExcelDate(getCell(row, headerIndex, "payoutDate")),
      transactionType,
      status: mapMindbodyTransactionStatus(transactionType),
      amountCents: amountCents || netAmountCents,
      processingFeeCents: feeCents,
      netAmountCents,
      clientName: cellString(getCell(row, headerIndex, "clientName")) || "Member",
      mindbodyClientId:
        cellString(getCell(row, headerIndex, "clientId")) || null,
      saleOrderId,
      transactionOrigin:
        cellString(getCell(row, headerIndex, "transactionOrigin")) || null,
      cardBrand: cellString(getCell(row, headerIndex, "cardBrand")) || null,
      paymentMethodType: normalizePaymentMethod(
        cellString(getCell(row, headerIndex, "paymentMethodType")),
      ),
      currency:
        cellString(getCell(row, headerIndex, "currency")).toLowerCase() ||
        "usd",
    });
  }

  return { rows, skipped };
}

export function parseMindbodyPaymentWorkbook(buffer: ArrayBuffer): MindbodyParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((n) =>
      n.toLowerCase().includes("payment transaction"),
    ) ?? workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], skipped: [{ row: 0, reason: "Workbook has no sheets" }] };
  }
  const sheet = workbook.Sheets[sheetName];
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];
  return parseMindbodyPaymentSheetRows(sheetRows);
}
