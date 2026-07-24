import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

export type MembershipSummary = {
  planName: string;
  status: string;
  billingFrequency: string | null;
  nextBillingDate: string | null;
  membershipStartDate: string | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: string | null;
  upcomingInvoiceAmount: string | null;
};

type ProductFields = {
  name?: string;
  billing_interval?: string | null;
  payment_type?: string | null;
};

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatBillingInterval(
  interval: string | null | undefined,
  paymentType?: string | null,
) {
  if (interval === "month") return "Monthly";
  if (interval === "one_time") return null;
  if (paymentType === "subscription") return "Monthly";
  if (!interval) return null;
  return interval;
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function unwrapProduct(
  product: ProductFields | ProductFields[] | null | undefined,
): ProductFields | null {
  if (!product) return null;
  return Array.isArray(product) ? (product[0] ?? null) : product;
}

const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

export async function getMembershipSummary(
  userId: string,
): Promise<MembershipSummary> {
  const empty: MembershipSummary = {
    planName: "No active membership",
    status: "Inactive",
    billingFrequency: null,
    nextBillingDate: null,
    membershipStartDate: null,
    lastPaymentDate: null,
    lastPaymentAmount: null,
    upcomingInvoiceAmount: null,
  };

  const active = await getActiveMembershipForUser(userId);
  if (!active && !isSupabaseConfigured()) return empty;

  if (!isSupabaseConfigured()) {
    if (!active) return empty;
    return {
      planName: active.productName,
      status: formatStatus(active.status),
      billingFrequency: "Monthly",
      nextBillingDate: formatDate(active.currentPeriodEnd),
      membershipStartDate: null,
      lastPaymentDate: null,
      lastPaymentAmount: null,
      upcomingInvoiceAmount: null,
    };
  }

  try {
    const tenantClient = isMa5DeploymentConfigured()
      ? createMa5TenantServiceClient()
      : null;
    const supabase = tenantClient?.supabase ?? createServiceClient();
    const tenantId = tenantClient?.ctx.tenantId ?? null;

    let membershipQuery = supabase
      .from(MA5_TABLES.memberships)
      .select(
        "status, current_period_end, created_at, product_id, ma5_products(name, billing_interval, payment_type)",
      )
      .eq("user_id", userId)
      .in("status", [...ACTIVE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1);

    let subscriptionQuery = supabase
      .from(MA5_TABLES.subscriptions)
      .select(
        "status, current_period_end, current_period_start, created_at, product_id, ma5_products(name, billing_interval, payment_type)",
      )
      .eq("user_id", userId)
      .in("status", [...ACTIVE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1);

    let paymentQuery = supabase
      .from(MA5_TABLES.payments)
      .select("amount_cents, currency, created_at")
      .eq("user_id", userId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1);

    if (tenantId) {
      membershipQuery = membershipQuery.eq("tenant_id", tenantId);
      subscriptionQuery = subscriptionQuery.eq("tenant_id", tenantId);
      paymentQuery = paymentQuery.eq("tenant_id", tenantId);
    }

    const [{ data: membership }, { data: subscription }, { data: lastPayment }] =
      await Promise.all([
        membershipQuery.maybeSingle(),
        subscriptionQuery.maybeSingle(),
        paymentQuery.maybeSingle(),
      ]);

    const membershipProduct = unwrapProduct(
      membership?.ma5_products as ProductFields | ProductFields[] | null,
    );
    const subscriptionProduct = unwrapProduct(
      subscription?.ma5_products as ProductFields | ProductFields[] | null,
    );
    const product = membershipProduct ?? subscriptionProduct;

    const hasActiveRecord = Boolean(
      membership || subscription || active,
    );

    const planName =
      membershipProduct?.name ??
      subscriptionProduct?.name ??
      active?.productName ??
      (hasActiveRecord ? "Membership" : empty.planName);

    const rawStatus =
      (subscription?.status as string) ??
      (membership?.status as string) ??
      active?.status ??
      (hasActiveRecord ? "active" : "inactive");

    const status = formatStatus(rawStatus);

    const nextBillingDate = formatDate(
      (subscription?.current_period_end as string | null) ??
        (membership?.current_period_end as string | null) ??
        active?.currentPeriodEnd ??
        null,
    );

    const membershipStartDate = formatDate(
      (subscription?.current_period_start as string | null) ??
        (subscription?.created_at as string | null) ??
        (membership?.created_at as string | null) ??
        null,
    );

    const lastPaymentDate = lastPayment?.created_at
      ? formatDate(lastPayment.created_at as string)
      : null;
    const lastPaymentAmount =
      lastPayment?.amount_cents != null
        ? formatMoney(
            lastPayment.amount_cents as number,
            (lastPayment.currency as string) ?? "usd",
          )
        : null;

    if (!hasActiveRecord && !lastPayment) {
      return empty;
    }

    return {
      planName,
      status: hasActiveRecord ? status : empty.status,
      billingFrequency: formatBillingInterval(
        product?.billing_interval,
        product?.payment_type,
      ),
      nextBillingDate,
      membershipStartDate,
      lastPaymentDate,
      lastPaymentAmount,
      upcomingInvoiceAmount: null,
    };
  } catch {
    if (!active) return empty;
    return {
      planName: active.productName,
      status: formatStatus(active.status),
      billingFrequency: "Monthly",
      nextBillingDate: formatDate(active.currentPeriodEnd),
      membershipStartDate: null,
      lastPaymentDate: null,
      lastPaymentAmount: null,
      upcomingInvoiceAmount: null,
    };
  }
}

/** Product ids the user already holds an active subscription/membership for. */
export async function getActivePurchasedProductIds(
  userId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!isSupabaseConfigured() || !userId) return ids;

  const tenantClient = isMa5DeploymentConfigured()
    ? createMa5TenantServiceClient()
    : null;
  const supabase = tenantClient?.supabase ?? createServiceClient();
  const tenantId = tenantClient?.ctx.tenantId ?? null;

  const tables = [MA5_TABLES.memberships, MA5_TABLES.subscriptions] as const;
  for (const table of tables) {
    let query = supabase
      .from(table)
      .select("product_id")
      .eq("user_id", userId)
      .in("status", [...ACTIVE_STATUSES])
      .not("product_id", "is", null);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data } = await query;
    for (const row of data ?? []) {
      const pid = row.product_id as string | null;
      if (pid) ids.add(pid);
    }
  }
  return ids;
}
