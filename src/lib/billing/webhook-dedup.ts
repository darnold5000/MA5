import { createHash } from "crypto";

import type Stripe from "stripe";

import { MA5_TABLES } from "@/lib/supabase/tables";
import { withTenantId } from "@/lib/tenant/deployment";
import {
  createMa5TenantServiceClient,
  type Ma5TenantServiceClient,
} from "@/lib/tenant/service";

export type WebhookClaimResult =
  | { status: "process"; client: Ma5TenantServiceClient }
  | { status: "duplicate" };

/**
 * Record Stripe event id before handling. Duplicate deliveries are harmless.
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

  const { error } = await supabase.from(MA5_TABLES.stripeWebhookEvents).insert(
    withTenantId(ctx, {
      stripe_account_id: ctx.stripeAccountId,
      stripe_event_id: event.id,
      event_type: event.type,
      payload_hash: payloadHash,
    }),
  );

  if (error) {
    if (error.code === "23505") {
      return { status: "duplicate" };
    }
    throw error;
  }

  return { status: "process", client };
}
