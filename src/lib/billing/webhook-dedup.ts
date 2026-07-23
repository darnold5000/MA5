import { createHash } from "crypto";

import type Stripe from "stripe";

import { MA5_TABLES } from "@/lib/supabase/tables";
import { withTenantId } from "@/lib/tenant/deployment";
import {
  createMa5TenantServiceClient,
  type Ma5TenantServiceClient,
} from "@/lib/tenant/service";

export type WebhookProcessingStatus = "processing" | "completed" | "failed";

export type WebhookLedgerRow = {
  id: string;
  processing_status: WebhookProcessingStatus;
  claimed_at: string | null;
};

/** Claims older than this may be reclaimed after a handler crash. */
export const STALE_WEBHOOK_CLAIM_MS = 5 * 60 * 1000;

export type WebhookClaimResult =
  | { status: "process"; client: Ma5TenantServiceClient; ledgerId: string }
  | { status: "duplicate" }
  | { status: "in_progress" };

export function resolveWebhookClaimAction(
  row: WebhookLedgerRow,
  nowMs = Date.now(),
): "complete_duplicate" | "retry" | "in_progress" {
  if (row.processing_status === "completed") {
    return "complete_duplicate";
  }
  if (row.processing_status === "failed") {
    return "retry";
  }
  if (row.processing_status === "processing") {
    const claimedAt = row.claimed_at
      ? new Date(row.claimed_at).getTime()
      : 0;
    if (claimedAt > 0 && nowMs - claimedAt < STALE_WEBHOOK_CLAIM_MS) {
      return "in_progress";
    }
    return "retry";
  }
  return "retry";
}

async function fetchLedgerRow(
  client: Ma5TenantServiceClient,
  stripeEventId: string,
): Promise<WebhookLedgerRow | null> {
  const { supabase, ctx } = client;
  if (!ctx.stripeAccountId) return null;

  const { data, error } = await supabase
    .from(MA5_TABLES.stripeWebhookEvents)
    .select("id, processing_status, claimed_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_account_id", ctx.stripeAccountId)
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) throw error;
  return (data as WebhookLedgerRow | null) ?? null;
}

async function reclaimLedgerRow(
  client: Ma5TenantServiceClient,
  ledgerId: string,
  payloadHash: string,
  eventType: string,
): Promise<void> {
  const { supabase, ctx } = client;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(MA5_TABLES.stripeWebhookEvents)
    .update({
      processing_status: "processing",
      claimed_at: now,
      processed_at: null,
      failed_at: null,
      last_error: null,
      event_type: eventType,
      payload_hash: payloadHash,
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", ledgerId);

  if (error) throw error;
}

/**
 * Claim a Stripe event for processing. Completed events are idempotent duplicates.
 * Failed or stale processing claims are retryable.
 */
export async function claimStripeWebhookEvent(
  event: Stripe.Event,
  rawBody: string,
): Promise<WebhookClaimResult> {
  const client = createMa5TenantServiceClient();
  const { supabase, ctx } = client;

  if (!ctx.stripeAccountId) {
    throw new Error(
      "STRIPE_ACCOUNT_ID is required for webhook dedup on Signal Works",
    );
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const now = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from(MA5_TABLES.stripeWebhookEvents)
    .insert(
      withTenantId(ctx, {
        stripe_account_id: ctx.stripeAccountId,
        stripe_event_id: event.id,
        event_type: event.type,
        payload_hash: payloadHash,
        processing_status: "processing",
        claimed_at: now,
        processed_at: null,
      }),
    )
    .select("id")
    .single();

  if (!error && inserted?.id) {
    return { status: "process", client, ledgerId: inserted.id as string };
  }

  if (error?.code !== "23505") {
    throw error ?? new Error("Could not claim webhook event");
  }

  const existing = await fetchLedgerRow(client, event.id);
  if (!existing) {
    throw new Error("Webhook dedup conflict but ledger row not found");
  }

  const action = resolveWebhookClaimAction(existing);
  if (action === "complete_duplicate") {
    return { status: "duplicate" };
  }
  if (action === "in_progress") {
    return { status: "in_progress" };
  }

  await reclaimLedgerRow(client, existing.id, payloadHash, event.type);
  return { status: "process", client, ledgerId: existing.id };
}

export async function completeStripeWebhookEvent(
  client: Ma5TenantServiceClient,
  stripeEventId: string,
): Promise<void> {
  const { supabase, ctx } = client;
  if (!ctx.stripeAccountId) {
    throw new Error("STRIPE_ACCOUNT_ID is required");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(MA5_TABLES.stripeWebhookEvents)
    .update({
      processing_status: "completed",
      processed_at: now,
      failed_at: null,
      last_error: null,
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_account_id", ctx.stripeAccountId)
    .eq("stripe_event_id", stripeEventId)
    .eq("processing_status", "processing");

  if (error) throw error;
}

export async function failStripeWebhookEvent(
  client: Ma5TenantServiceClient,
  stripeEventId: string,
  err: unknown,
): Promise<void> {
  const { supabase, ctx } = client;
  if (!ctx.stripeAccountId) {
    throw new Error("STRIPE_ACCOUNT_ID is required");
  }

  const message =
    err instanceof Error ? err.message : "Webhook handler failed";
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(MA5_TABLES.stripeWebhookEvents)
    .update({
      processing_status: "failed",
      failed_at: now,
      processed_at: null,
      last_error: message.slice(0, 2000),
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_account_id", ctx.stripeAccountId)
    .eq("stripe_event_id", stripeEventId)
    .in("processing_status", ["processing", "failed"]);

  if (error) throw error;
}
