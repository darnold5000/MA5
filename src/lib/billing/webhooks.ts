import type Stripe from "stripe";

import {
  getOfferingById,
  getOfferingBySlug,
  getOfferingByStripePriceId,
} from "@/lib/billing/catalog";
import { getStripe } from "@/lib/billing/stripe-client";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { tenantOnConflict, withTenantId } from "@/lib/tenant/deployment";
import type { Ma5TenantServiceClient } from "@/lib/tenant/service";

function customerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const end = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

function subscriptionPeriodStart(sub: Stripe.Subscription): string | null {
  const start = (sub as Stripe.Subscription & { current_period_start?: number })
    .current_period_start;
  return start ? new Date(start * 1000).toISOString() : null;
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status | string) {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "unpaid" ||
    status === "paused"
  ) {
    return status;
  }
  return "inactive";
}

async function resolveProductId(
  client: Ma5TenantServiceClient,
  params: {
    productId?: string | null;
    productSlug?: string | null;
    stripePriceId?: string | null;
  },
): Promise<string | null> {
  if (params.productId) {
    const byId = await getOfferingById(params.productId, {
      useServiceRole: true,
    });
    if (byId) return byId.id;
  }
  if (params.productSlug) {
    const bySlug = await getOfferingBySlug(params.productSlug, {
      useServiceRole: true,
    });
    if (bySlug) return bySlug.id;
  }
  if (params.stripePriceId) {
    const byPrice = await getOfferingByStripePriceId(params.stripePriceId);
    if (byPrice) return byPrice.id;
  }
  return null;
}

async function upsertMembership(
  client: Ma5TenantServiceClient,
  params: {
    userId: string;
    productId: string;
    status: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: string | null;
  },
) {
  const { supabase, ctx } = client;
  const row = withTenantId(ctx, {
    user_id: params.userId,
    product_id: params.productId,
    status: params.status,
    stripe_subscription_id: params.stripeSubscriptionId,
    stripe_price_id: params.stripePriceId,
    current_period_end: params.currentPeriodEnd,
  });

  if (params.stripeSubscriptionId) {
    await supabase.from(MA5_TABLES.memberships).upsert(row, {
      onConflict: tenantOnConflict(ctx, "stripe_subscription_id"),
    });
  } else {
    await supabase.from(MA5_TABLES.memberships).insert(row);
  }
}

async function handleCheckoutSessionCompleted(
  client: Ma5TenantServiceClient,
  session: Stripe.Checkout.Session,
) {
  const { supabase, ctx } = client;
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const productSlug = session.metadata?.product_slug ?? null;
  const productIdMeta = session.metadata?.product_id ?? null;
  const cust = customerId(session.customer);

  let stripePriceId: string | null = null;
  const stripe = getStripe();
  if (stripe) {
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });
    const price = expanded.line_items?.data?.[0]?.price;
    stripePriceId = typeof price === "string" ? price : price?.id ?? null;
  }

  const productId = await resolveProductId(client, {
    productId: productIdMeta,
    productSlug,
    stripePriceId,
  });

  if (userId && cust) {
    await supabase
      .from(MA5_TABLES.profiles)
      .update({ stripe_customer_id: cust })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", userId);
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await supabase.from(MA5_TABLES.checkoutSessions).upsert(
    withTenantId(ctx, {
      stripe_checkout_session_id: session.id,
      user_id: userId,
      product_id: productId,
      mode: session.mode === "subscription" ? "subscription" : "payment",
      status: "complete",
      amount_total_cents: session.amount_total ?? null,
      currency: session.currency ?? "usd",
      stripe_customer_id: cust,
      stripe_payment_intent_id: paymentIntentId,
      stripe_subscription_id: subscriptionId,
      metadata: {
        product_slug: productSlug,
        payment_status: session.payment_status,
      },
    }),
    { onConflict: tenantOnConflict(ctx, "stripe_checkout_session_id") },
  );

  const { data: checkoutRow } = await supabase
    .from(MA5_TABLES.checkoutSessions)
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (session.mode === "payment" && userId) {
    await supabase.from(MA5_TABLES.payments).upsert(
      withTenantId(ctx, {
        user_id: userId,
        product_id: productId,
        checkout_session_id: checkoutRow?.id ?? null,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        status:
          session.payment_status === "paid" ? "succeeded" : "pending",
        metadata: { product_slug: productSlug },
      }),
      { onConflict: tenantOnConflict(ctx, "stripe_payment_intent_id") },
    );
  }

  if (session.mode === "subscription" && userId && productId && subscriptionId) {
    let periodEnd: string | null = null;
    let periodStart: string | null = null;
    let subStatus = "active";

    if (stripe) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      periodEnd = subscriptionPeriodEnd(sub);
      periodStart = subscriptionPeriodStart(sub);
      subStatus = mapSubscriptionStatus(sub.status);
      if (!stripePriceId) {
        stripePriceId = sub.items.data[0]?.price?.id ?? null;
      }
    }

    await supabase.from(MA5_TABLES.subscriptions).upsert(
      withTenantId(ctx, {
        user_id: userId,
        product_id: productId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: stripePriceId,
        status: subStatus,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        metadata: { product_slug: productSlug },
      }),
      { onConflict: tenantOnConflict(ctx, "stripe_subscription_id") },
    );

    await upsertMembership(client, {
      userId,
      productId,
      status: subStatus === "trialing" ? "trialing" : "active",
      stripeSubscriptionId: subscriptionId,
      stripePriceId,
      currentPeriodEnd: periodEnd,
    });
  }
}

async function handleCheckoutSessionExpired(
  client: Ma5TenantServiceClient,
  session: Stripe.Checkout.Session,
) {
  const { supabase, ctx } = client;
  await supabase.from(MA5_TABLES.checkoutSessions).upsert(
    withTenantId(ctx, {
      stripe_checkout_session_id: session.id,
      user_id: session.metadata?.user_id ?? session.client_reference_id,
      product_id: session.metadata?.product_id ?? null,
      mode: session.mode === "subscription" ? "subscription" : "payment",
      status: "expired",
      amount_total_cents: session.amount_total ?? null,
      currency: session.currency ?? "usd",
      metadata: { product_slug: session.metadata?.product_slug ?? null },
    }),
    { onConflict: tenantOnConflict(ctx, "stripe_checkout_session_id") },
  );
}

async function handleSubscriptionChange(
  client: Ma5TenantServiceClient,
  sub: Stripe.Subscription,
) {
  const { supabase, ctx } = client;
  const userId = sub.metadata?.user_id ?? null;
  const stripePriceId = sub.items.data[0]?.price?.id ?? null;
  const productId = await resolveProductId(client, {
    productId: sub.metadata?.product_id,
    productSlug: sub.metadata?.product_slug,
    stripePriceId,
  });

  const status = mapSubscriptionStatus(sub.status);
  const periodEnd = subscriptionPeriodEnd(sub);
  const periodStart = subscriptionPeriodStart(sub);

  let resolvedUserId: string | null = userId;
  if (!resolvedUserId && sub.customer) {
    const cust = customerId(sub.customer);
    if (cust) {
      const { data: profile } = await supabase
        .from(MA5_TABLES.profiles)
        .select("id")
        .eq("tenant_id", ctx.tenantId)
        .eq("stripe_customer_id", cust)
        .maybeSingle();
      resolvedUserId = typeof profile?.id === "string" ? profile.id : null;
    }
  }

  if (resolvedUserId) {
    await supabase.from(MA5_TABLES.subscriptions).upsert(
      withTenantId(ctx, {
        user_id: resolvedUserId,
        product_id: productId,
        stripe_subscription_id: sub.id,
        stripe_price_id: stripePriceId,
        status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
        canceled_at: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
        metadata: {
          product_slug: sub.metadata?.product_slug ?? null,
        },
      }),
      { onConflict: tenantOnConflict(ctx, "stripe_subscription_id") },
    );
  }

  const membershipStatus =
    status === "canceled" || status === "incomplete_expired"
      ? "canceled"
      : status === "active" || status === "trialing" || status === "past_due"
        ? status
        : "inactive";

  await supabase
    .from(MA5_TABLES.memberships)
    .update({
      status: membershipStatus,
      current_period_end: periodEnd,
      stripe_price_id: stripePriceId,
      ...(productId ? { product_id: productId } : {}),
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_subscription_id", sub.id);

  if (resolvedUserId && productId && !membershipStatus.includes("cancel")) {
    await upsertMembership(client, {
      userId: resolvedUserId,
      productId,
      status: membershipStatus,
      stripeSubscriptionId: sub.id,
      stripePriceId,
      currentPeriodEnd: periodEnd,
    });
  }
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: { subscription?: string | Stripe.Subscription };
    };
  };
  const direct = raw.subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object" && "id" in direct) return direct.id;
  const parentSub = raw.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object" && "id" in parentSub) {
    return parentSub.id;
  }
  return null;
}

async function handleInvoice(
  client: Ma5TenantServiceClient,
  invoice: Stripe.Invoice,
  failed: boolean,
) {
  const { supabase, ctx } = client;
  const stripeSubscriptionId = invoiceSubscriptionId(invoice);

  let userId: string | null = null;
  let subscriptionRowId: string | null = null;

  if (stripeSubscriptionId) {
    const { data: subRow } = await supabase
      .from(MA5_TABLES.subscriptions)
      .select("id, user_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();
    subscriptionRowId = (subRow?.id as string | undefined) ?? null;
    userId = (subRow?.user_id as string | undefined) ?? null;
  }

  if (!userId && invoice.customer) {
    const cust = customerId(invoice.customer);
    if (cust) {
      const { data: profile } = await supabase
        .from(MA5_TABLES.profiles)
        .select("id")
        .eq("tenant_id", ctx.tenantId)
        .eq("stripe_customer_id", cust)
        .maybeSingle();
      userId = (profile?.id as string | undefined) ?? null;
    }
  }

  await supabase.from(MA5_TABLES.invoices).upsert(
    withTenantId(ctx, {
      user_id: userId,
      subscription_id: subscriptionRowId,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: stripeSubscriptionId,
      amount_due_cents: invoice.amount_due ?? 0,
      amount_paid_cents: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? "usd",
      status: failed ? "payment_failed" : invoice.status ?? "open",
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      metadata: {},
    }),
    { onConflict: tenantOnConflict(ctx, "stripe_invoice_id") },
  );

  const paymentIntentRaw = (
    invoice as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null;
    }
  ).payment_intent;
  const paymentIntentId =
    typeof paymentIntentRaw === "string"
      ? paymentIntentRaw
      : paymentIntentRaw?.id ?? null;

  if (paymentIntentId) {
    await supabase.from(MA5_TABLES.payments).upsert(
      withTenantId(ctx, {
        user_id: userId,
        stripe_payment_intent_id: paymentIntentId,
        stripe_invoice_id: invoice.id,
        amount_cents: failed
          ? invoice.amount_due ?? 0
          : invoice.amount_paid ?? 0,
        currency: invoice.currency ?? "usd",
        status: failed ? "failed" : "succeeded",
        metadata: { stripe_invoice_id: invoice.id },
      }),
      { onConflict: tenantOnConflict(ctx, "stripe_payment_intent_id") },
    );
  } else {
    await supabase.from(MA5_TABLES.payments).insert(
      withTenantId(ctx, {
        user_id: userId,
        stripe_invoice_id: invoice.id,
        amount_cents: failed
          ? invoice.amount_due ?? 0
          : invoice.amount_paid ?? 0,
        currency: invoice.currency ?? "usd",
        status: failed ? "failed" : "succeeded",
        metadata: { stripe_invoice_id: invoice.id },
      }),
    );
  }
}

async function handlePaymentIntent(
  client: Ma5TenantServiceClient,
  pi: Stripe.PaymentIntent,
  status: "succeeded" | "failed",
) {
  const { supabase, ctx } = client;
  let userId: string | null = pi.metadata?.user_id ?? null;

  if (!userId && pi.customer) {
    const cust = customerId(pi.customer);
    if (cust) {
      const { data: profile } = await supabase
        .from(MA5_TABLES.profiles)
        .select("id")
        .eq("tenant_id", ctx.tenantId)
        .eq("stripe_customer_id", cust)
        .maybeSingle();
      userId = (profile?.id as string | undefined) ?? null;
    }
  }

  await supabase.from(MA5_TABLES.payments).upsert(
    withTenantId(ctx, {
      user_id: userId,
      product_id: pi.metadata?.product_id ?? null,
      stripe_payment_intent_id: pi.id,
      amount_cents: pi.amount_received || pi.amount || 0,
      currency: pi.currency ?? "usd",
      status,
      metadata: pi.metadata ?? {},
    }),
    { onConflict: tenantOnConflict(ctx, "stripe_payment_intent_id") },
  );
}

async function handleChargeRefunded(
  client: Ma5TenantServiceClient,
  charge: Stripe.Charge,
) {
  const { supabase, ctx } = client;
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  let paymentId: string | null = null;
  if (paymentIntentId) {
    const { data: payment } = await supabase
      .from(MA5_TABLES.payments)
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    paymentId = (payment?.id as string | undefined) ?? null;

    await supabase
      .from(MA5_TABLES.payments)
      .update({
        status: charge.refunded ? "refunded" : "partially_refunded",
        stripe_charge_id: charge.id,
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("stripe_payment_intent_id", paymentIntentId);
  }

  const refunds = charge.refunds?.data ?? [];
  for (const refund of refunds) {
    await supabase.from(MA5_TABLES.refunds).upsert(
      withTenantId(ctx, {
        payment_id: paymentId,
        stripe_refund_id: refund.id,
        stripe_charge_id: charge.id,
        amount_cents: refund.amount ?? 0,
        currency: refund.currency ?? "usd",
        status:
          refund.status === "succeeded"
            ? "succeeded"
            : refund.status === "failed"
              ? "failed"
              : refund.status === "canceled"
                ? "canceled"
                : "pending",
        reason: refund.reason ?? null,
        metadata: {},
      }),
      { onConflict: tenantOnConflict(ctx, "stripe_refund_id") },
    );
  }
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
  client: Ma5TenantServiceClient,
) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        client,
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "checkout.session.expired":
      await handleCheckoutSessionExpired(
        client,
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionChange(
        client,
        event.data.object as Stripe.Subscription,
      );
      break;
    case "invoice.paid":
      await handleInvoice(client, event.data.object as Stripe.Invoice, false);
      break;
    case "invoice.payment_failed":
      await handleInvoice(client, event.data.object as Stripe.Invoice, true);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntent(
        client,
        event.data.object as Stripe.PaymentIntent,
        "succeeded",
      );
      break;
    case "payment_intent.payment_failed":
      await handlePaymentIntent(
        client,
        event.data.object as Stripe.PaymentIntent,
        "failed",
      );
      break;
    case "charge.refunded":
      await handleChargeRefunded(client, event.data.object as Stripe.Charge);
      break;
    default:
      break;
  }
}
