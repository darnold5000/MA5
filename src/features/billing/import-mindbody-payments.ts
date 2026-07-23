import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseMindbodyPaymentWorkbook,
  type MindbodyPaymentRow,
} from "@/features/billing/mindbody-payment-import";
import type { ProfileLifecycleRow } from "@/lib/auth/client-lifecycle";
import {
  isActiveOperationalClient,
} from "@/lib/auth/member-filters";
import { MA5_TABLES } from "@/lib/supabase/tables";

export type MindbodyImportSummary = {
  parsed: number;
  imported: number;
  updated: number;
  skipped: number;
  skipReasons: { row: number; reason: string }[];
  grossCents: number;
  feeCents: number;
  netCents: number;
  matchedClients: number;
  manualReviewRequired: number;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type ProfileIndexEntry = {
  id: string;
  profile: ProfileLifecycleRow;
};

async function loadProfileNameIndex(
  admin: SupabaseClient,
  tenantId?: string,
): Promise<Map<string, ProfileIndexEntry>> {
  let query = admin
    .from(MA5_TABLES.profiles)
    .select(
      "id, full_name, email, client_status, deleted_at, active, invitation_status, access_revoked_at, invitation_accepted_at",
    );
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;

  if (error) throw error;

  const index = new Map<string, ProfileIndexEntry>();
  for (const row of data ?? []) {
    const name = (row.full_name as string | null)?.trim();
    if (!name) continue;
    index.set(normalizeName(name), {
      id: row.id as string,
      profile: row as ProfileLifecycleRow,
    });
  }
  return index;
}

export function matchMindbodyImportProfile(
  profileIndex: Map<string, ProfileIndexEntry>,
  clientName: string,
): { userId: string | null; manualReviewReason: string | null } {
  const match = profileIndex.get(normalizeName(clientName));
  if (!match) {
    return { userId: null, manualReviewReason: null };
  }
  if (isActiveOperationalClient(match.profile)) {
    return { userId: match.id, manualReviewReason: null };
  }
  const status =
    match.profile.client_status ??
    (match.profile.deleted_at ? "deleted" : "non-active");
  return {
    userId: null,
    manualReviewReason: `Manual review required: matched client "${clientName}" has status ${status} — assign payment manually`,
  };
}

function toPaymentRecord(
  row: MindbodyPaymentRow,
  userId: string | null,
  tenantId?: string,
): Record<string, unknown> {
  return {
    ...(tenantId ? { tenant_id: tenantId } : {}),
    external_payment_id: row.externalPaymentId,
    user_id: userId,
    product_id: null,
    checkout_session_id: null,
    stripe_payment_intent_id: null,
    stripe_charge_id: null,
    stripe_invoice_id: null,
    amount_cents: row.amountCents,
    processing_fee_cents: row.processingFeeCents,
    net_amount_cents: row.netAmountCents,
    payment_method_type: row.paymentMethodType,
    import_source: "mindbody",
    currency: row.currency,
    status: row.status,
    created_at: row.transactionDate.toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      source: "mindbody",
      mindbody_sale_order_id: row.saleOrderId,
      mindbody_client_id: row.mindbodyClientId,
      client_name: row.clientName,
      transaction_origin: row.transactionOrigin,
      card_brand: row.cardBrand,
      payout_date: row.payoutDate?.toISOString() ?? null,
      transaction_type: row.transactionType,
    },
  };
}

export async function importMindbodyPaymentWorkbook(
  admin: SupabaseClient,
  buffer: ArrayBuffer,
  options?: { importBefore?: Date | null; tenantId?: string },
): Promise<MindbodyImportSummary> {
  const parsed = parseMindbodyPaymentWorkbook(buffer);
  const tenantId = options?.tenantId;
  const profileIndex = await loadProfileNameIndex(admin, tenantId);

  let imported = 0;
  let updated = 0;
  let grossCents = 0;
  let feeCents = 0;
  let netCents = 0;
  let matchedClients = 0;
  let manualReviewRequired = 0;
  const skipReasons = [...parsed.skipped];

  for (const row of parsed.rows) {
    if (options?.importBefore && row.transactionDate >= options.importBefore) {
      skipReasons.push({
        row: 0,
        reason: `Skipped ${row.saleOrderId}: after import cutoff`,
      });
      continue;
    }

    const match = matchMindbodyImportProfile(profileIndex, row.clientName);
    const userId = match.userId;

    if (match.userId) matchedClients += 1;
    if (match.manualReviewReason) {
      manualReviewRequired += 1;
      skipReasons.push({
        row: 0,
        reason: `${match.manualReviewReason} (${row.saleOrderId})`,
      });
    }

    const record = toPaymentRecord(row, userId, tenantId);
    let existingQuery = admin
      .from(MA5_TABLES.payments)
      .select("id")
      .eq("external_payment_id", row.externalPaymentId);
    if (tenantId) existingQuery = existingQuery.eq("tenant_id", tenantId);
    const { data: existing } = await existingQuery.maybeSingle();

    const write = existing?.id
      ? admin.from(MA5_TABLES.payments).update(record).eq("id", existing.id)
      : admin.from(MA5_TABLES.payments).insert(record);

    const { error } = await write;

    if (error) {
      skipReasons.push({
        row: 0,
        reason: `Failed ${row.saleOrderId}: ${error.message}`,
      });
      continue;
    }

    if (existing?.id) updated += 1;
    else imported += 1;

    if (row.status === "succeeded" || row.status === "refunded") {
      grossCents += row.amountCents;
      feeCents += row.processingFeeCents;
      netCents += row.netAmountCents;
    }
  }

  return {
    parsed: parsed.rows.length,
    imported,
    updated,
    skipped: skipReasons.length,
    skipReasons: skipReasons.slice(0, 20),
    grossCents,
    feeCents,
    netCents,
    matchedClients,
    manualReviewRequired,
  };
}