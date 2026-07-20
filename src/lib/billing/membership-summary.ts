import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

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

function formatBillingInterval(interval: string | null | undefined) {
  if (!interval || interval === "one_time") return null;
  if (interval === "month") return "Monthly";
  return interval;
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
    const supabase = createServiceClient();
    const [{ data: membership }, { data: subscription }, { data: lastPayment }] =
      await Promise.all([
        supabase
          .from(MA5_TABLES.memberships)
          .select(
            "status, current_period_end, created_at, ma5_products(name, billing_interval)",
          )
          .eq("user_id", userId)
          .in("status", ["active", "trialing", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from(MA5_TABLES.subscriptions)
          .select("status, current_period_end, current_period_start, created_at")
          .eq("user_id", userId)
          .in("status", ["active", "trialing", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from(MA5_TABLES.payments)
          .select("amount_cents, currency, created_at")
          .eq("user_id", userId)
          .eq("status", "succeeded")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const product = membership?.ma5_products as
      | { name?: string; billing_interval?: string | null }
      | { name?: string; billing_interval?: string | null }[]
      | null;
    const prod = Array.isArray(product) ? product[0] : product;

    const planName =
      prod?.name ?? active?.productName ?? empty.planName;
    const status = formatStatus(
      (subscription?.status as string) ??
        (membership?.status as string) ??
        active?.status ??
        "inactive",
    );

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

    return {
      planName,
      status,
      billingFrequency: formatBillingInterval(prod?.billing_interval),
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
