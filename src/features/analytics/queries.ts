import { DEMO_BUSINESS_REPORTS, DEMO_DAILY_OPS } from "@/features/analytics/demo-data";
import { formatCompactMoney } from "@/features/analytics/format";
import type {
  ActivityItem,
  BusinessReports,
  ChartPoint,
  DailyOpsDashboard,
  FeeSnapshot,
  HealthMetric,
  HealthStatus,
  PaymentRow,
  PeriodMetric,
  SignupRow,
} from "@/features/analytics/types";
import {
  addDays,
  formatRelativeWhen,
  formatTimeOfDay,
  monthShortLabel,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
  zonedDayStart,
  zonedParts,
} from "@/features/analytics/time";
import { countStaffUnreadReplies } from "@/features/messaging/demo-store";
import { loadCommunicationState } from "@/features/messaging/queries";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type PaymentRowDb = {
  amount_cents: number;
  created_at: string;
  status: string;
};

const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "waitlisted",
  "attended",
  "no_show",
] as const;

function sumCents(rows: { amount_cents: number }[]): number {
  return rows.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function healthFromPctChange(change: number | null): HealthStatus {
  if (change == null) return "watch";
  if (change >= 5) return "good";
  if (change <= -5) return "alert";
  return "watch";
}

function formatPctBadge(change: number | null): string {
  if (change == null) return "—";
  const arrow = change >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(change)}%`;
}

async function fetchPaymentsBetween(
  from: Date,
  to: Date,
  statuses: string[],
): Promise<PaymentRowDb[]> {
  const supabase = await createClient();
  const rows: PaymentRowDb[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(MA5_TABLES.payments)
      .select("amount_cents, created_at, status")
      .in("status", statuses)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as PaymentRowDb[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function sumRevenueBetween(from: Date, to: Date): Promise<number> {
  const rows = await fetchPaymentsBetween(from, to, ["succeeded"]);
  return sumCents(rows);
}

async function countPaymentsBetween(
  from: Date,
  to: Date,
  statuses: string[],
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(MA5_TABLES.payments)
    .select("id", { count: "exact", head: true })
    .in("status", statuses)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (error) throw error;
  return count ?? 0;
}

async function sumOutstandingInvoices(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.invoices)
    .select("amount_due_cents, amount_paid_cents, status")
    .in("status", ["open", "payment_failed"]);

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => {
    const due = (row.amount_due_cents as number) ?? 0;
    const paid = (row.amount_paid_cents as number) ?? 0;
    return sum + Math.max(due - paid, 0);
  }, 0);
}

async function countRefundsThisMonth(): Promise<number> {
  const supabase = await createClient();
  const monthStart = startOfMonth();
  const { count, error } = await supabase
    .from(MA5_TABLES.refunds)
    .select("id", { count: "exact", head: true })
    .eq("status", "succeeded")
    .gte("created_at", monthStart.toISOString());

  if (error) throw error;
  return count ?? 0;
}

async function buildRevenueChart(): Promise<ChartPoint[]> {
  const now = new Date();
  const { year, month } = zonedParts(now);
  const points: ChartPoint[] = [];

  for (let m = 1; m <= month; m++) {
    const from = zonedDayStart(year, m, 1);
    const end =
      m === month
        ? now
        : new Date(zonedDayStart(year, m + 1, 1).getTime() - 1);
    const revenue = await sumRevenueBetween(from, end);
    points.push({
      label: monthShortLabel(year, m),
      value: Math.round(revenue / 100),
    });
  }

  return points;
}

async function fetchMembershipSnapshot() {
  const supabase = await createClient();
  const monthStart = startOfMonth();
  const now = new Date();

  const [
    { count: active },
    { count: newThisMonth },
    { count: cancelled },
    { count: atRisk },
    { count: expired },
  ] = await Promise.all([
    supabase
      .from(MA5_TABLES.subscriptions)
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
    supabase
      .from(MA5_TABLES.subscriptions)
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString())
      .in("status", ["active", "trialing", "past_due"]),
    supabase
      .from(MA5_TABLES.subscriptions)
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("canceled_at", monthStart.toISOString()),
    supabase
      .from(MA5_TABLES.subscriptions)
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
    supabase
      .from(MA5_TABLES.subscriptions)
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("canceled_at", addDays(now, -30).toISOString()),
  ]);

  const activeN = active ?? 0;
  const newN = newThisMonth ?? 0;
  const cancelledN = cancelled ?? 0;

  return {
    active: activeN,
    newThisMonth: newN,
    cancelled: cancelledN,
    netGrowth: newN - cancelledN,
    atRisk: atRisk ?? 0,
    expired: expired ?? 0,
  };
}

async function fetchBookingMetrics() {
  const supabase = await createClient();
  const today = startOfToday();
  const now = new Date();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const yearStart = startOfYear();

  const { data: sessions, error } = await supabase
    .from(MA5_TABLES.sessions)
    .select("id, starts_at")
    .gte("starts_at", yearStart.toISOString())
    .lte("starts_at", now.toISOString());

  if (error) throw error;
  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) {
    return {
      periods: [
        { id: "today", label: "Today", value: "0" },
        { id: "week", label: "This week", value: "0" },
        { id: "month", label: "This month", value: "0" },
        { id: "year", label: "This year", value: "0" },
      ] satisfies PeriodMetric[],
      weekChart: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
        (label) => ({ label, value: 0 }),
      ),
      attendance: { ratePercent: 0, missedSessions: 0, averageAttendance: 0 },
      sessionsToday: 0,
      sessionsWeek: 0,
      bookingsMonth: 0,
    };
  }

  const { data: bookings, error: bookingErr } = await supabase
    .from(MA5_TABLES.bookings)
    .select("session_id, status")
    .in("session_id", sessionIds)
    .not("status", "eq", "cancelled");

  if (bookingErr) throw bookingErr;

  const sessionStart = new Map(
    (sessions ?? []).map((s) => [s.id as string, s.starts_at as string]),
  );

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let yearCount = 0;
  const weekBuckets = [0, 0, 0, 0, 0, 0, 0];
  let attended = 0;
  let missed = 0;
  let sessionsToday = 0;
  let sessionsWeek = 0;
  const sessionBookingCounts = new Map<string, number>();

  const weekEnd = addDays(weekStart, 7);
  const thirtyDaysAgo = addDays(now, -30);

  for (const session of sessions ?? []) {
    const startsAt = new Date(session.starts_at as string);
    if (startsAt >= today && startsAt < addDays(today, 1)) sessionsToday += 1;
    if (startsAt >= weekStart && startsAt < weekEnd) sessionsWeek += 1;
  }

  for (const booking of bookings ?? []) {
    const startsAtRaw = sessionStart.get(booking.session_id as string);
    if (!startsAtRaw) continue;
    const startsAt = new Date(startsAtRaw);
    const status = booking.status as string;

    sessionBookingCounts.set(
      booking.session_id as string,
      (sessionBookingCounts.get(booking.session_id as string) ?? 0) + 1,
    );

    if (startsAt >= today && startsAt < addDays(today, 1)) todayCount += 1;
    if (startsAt >= weekStart && startsAt < weekEnd) {
      weekCount += 1;
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Indiana/Indianapolis",
        weekday: "short",
      }).format(startsAt);
      const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const idx = order.indexOf(weekday);
      if (idx >= 0) weekBuckets[idx] += 1;
    }
    if (startsAt >= monthStart && startsAt <= now) monthCount += 1;
    if (startsAt >= yearStart && startsAt <= now) yearCount += 1;

    if (startsAt >= thirtyDaysAgo && startsAt <= now) {
      if (status === "attended") attended += 1;
      if (status === "no_show") missed += 1;
    }
  }

  const decided = attended + missed;
  const ratePercent = decided > 0 ? Math.round((attended / decided) * 100) : 0;
  const avgAttendance =
    sessionBookingCounts.size > 0
      ? Math.round(
          [...sessionBookingCounts.values()].reduce((a, b) => a + b, 0) /
            sessionBookingCounts.size,
        )
      : 0;

  return {
    periods: [
      { id: "today", label: "Today", value: String(todayCount) },
      { id: "week", label: "This week", value: String(weekCount) },
      { id: "month", label: "This month", value: String(monthCount) },
      { id: "year", label: "This year", value: String(yearCount) },
    ] satisfies PeriodMetric[],
    weekChart: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (label, i) => ({ label, value: weekBuckets[i] ?? 0 }),
    ),
    attendance: {
      ratePercent,
      missedSessions: missed,
      averageAttendance: avgAttendance,
    },
    sessionsToday,
    sessionsWeek,
    bookingsMonth: monthCount,
  };
}

async function fetchCapacityRows() {
  const supabase = await createClient();
  const now = new Date();
  const horizon = addDays(now, 7);

  const { data: sessions, error } = await supabase
    .from(MA5_TABLES.sessions)
    .select("id, title, starts_at, capacity")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(8);

  if (error) throw error;
  if (!sessions?.length) return { rows: [], averagePercent: 0 };

  const ids = sessions.map((s) => s.id as string);
  const { data: bookings } = await supabase
    .from(MA5_TABLES.bookings)
    .select("session_id")
    .in("session_id", ids)
    .in("status", [...ACTIVE_BOOKING_STATUSES]);

  const counts = new Map<string, number>();
  for (const b of bookings ?? []) {
    const sid = b.session_id as string;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }

  const rows = sessions.map((s) => {
    const startsAt = s.starts_at as string;
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "America/Indiana/Indianapolis",
    }).format(new Date(startsAt));
    const time = formatTimeOfDay(startsAt);
    const capacity = (s.capacity as number) ?? 0;
    const booked = counts.get(s.id as string) ?? 0;
    return {
      id: s.id as string,
      label: `${day} ${time} · ${s.title as string}`,
      booked,
      capacity,
    };
  });

  const averagePercent =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, r) => {
            if (r.capacity <= 0) return sum;
            return sum + (r.booked / r.capacity) * 100;
          }, 0) / rows.length,
        )
      : 0;

  return { rows, averagePercent };
}

async function fetchTopPrograms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.programAssignments)
    .select("program_id, ma5_programs(id, title)")
    .eq("status", "active");

  if (error) throw error;

  const counts = new Map<string, { id: string; name: string; members: number }>();
  for (const row of data ?? []) {
    const program = row.ma5_programs as
      | { id: string; title: string }
      | { id: string; title: string }[]
      | null;
    const prog = Array.isArray(program) ? program[0] : program;
    if (!prog?.id) continue;
    const current = counts.get(prog.id) ?? {
      id: prog.id,
      name: prog.title ?? "Program",
      members: 0,
    };
    current.members += 1;
    counts.set(prog.id, current);
  }

  return [...counts.values()]
    .sort((a, b) => b.members - a.members)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      name: p.name,
      members: p.members,
      changePercent: 0,
    }));
}

async function fetchRecentPayments(): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.payments)
    .select(
      "id, amount_cents, status, created_at, user_id, product_id, ma5_profiles(full_name, email), ma5_products(name)",
    )
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.ma5_profiles as
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[]
      | null;
    const product = row.ma5_products as
      | { name: string }
      | { name: string }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const prod = Array.isArray(product) ? product[0] : product;
    const status = row.status as string;
    const paymentStatus: PaymentRow["status"] =
      status === "succeeded"
        ? "paid"
        : status === "failed"
          ? "failed"
          : status === "pending"
            ? "pending"
            : "refunded";

    return {
      id: row.id as string,
      clientName: p?.full_name?.trim() || p?.email || "Member",
      amountCents: row.amount_cents as number,
      status: paymentStatus,
      when: formatRelativeWhen(row.created_at as string),
      product: prod?.name ?? "Payment",
    };
  });
}

async function fetchRecentSignups(): Promise<SignupRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.subscriptions)
    .select("created_at, user_id, ma5_profiles(full_name, email), ma5_products(name)")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.ma5_profiles as
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[]
      | null;
    const product = row.ma5_products as
      | { name: string }
      | { name: string }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const prod = Array.isArray(product) ? product[0] : product;
    return {
      id: row.user_id as string,
      clientName: p?.full_name?.trim() || p?.email || "Member",
      plan: prod?.name ?? "Membership",
      when: formatRelativeWhen(row.created_at as string),
    };
  });
}

async function fetchTodaySchedule() {
  const supabase = await createClient();
  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  const { data: sessions, error } = await supabase
    .from(MA5_TABLES.sessions)
    .select("id, title, starts_at, capacity, coach_name")
    .gte("starts_at", today.toISOString())
    .lt("starts_at", tomorrow.toISOString())
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  if (error) throw error;
  if (!sessions?.length) return [];

  const ids = sessions.map((s) => s.id as string);
  const { data: bookings } = await supabase
    .from(MA5_TABLES.bookings)
    .select("session_id")
    .in("session_id", ids)
    .in("status", [...ACTIVE_BOOKING_STATUSES]);

  const counts = new Map<string, number>();
  for (const b of bookings ?? []) {
    const sid = b.session_id as string;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }

  return sessions.map((s) => ({
    id: s.id as string,
    time: formatTimeOfDay(s.starts_at as string),
    title: s.title as string,
    coach: (s.coach_name as string | null)?.trim() || "—",
    booked: counts.get(s.id as string) ?? 0,
    capacity: (s.capacity as number) ?? 0,
    href: "/admin/bookings",
  }));
}

async function fetchActivityFeed(): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const items: { at: string; text: string; id: string }[] = [];

  const [{ data: payments }, { data: profiles }, { data: bookings }] =
    await Promise.all([
      supabase
        .from(MA5_TABLES.payments)
        .select("id, created_at, amount_cents, status, ma5_profiles(full_name, email)")
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from(MA5_TABLES.profiles)
        .select("id, full_name, email, invitation_accepted_at")
        .not("invitation_accepted_at", "is", null)
        .order("invitation_accepted_at", { ascending: false })
        .limit(5),
      supabase
        .from(MA5_TABLES.bookings)
        .select("id, created_at, ma5_profiles(full_name, email), ma5_sessions(title)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  for (const p of payments ?? []) {
    const profile = p.ma5_profiles as
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[]
      | null;
    const prof = Array.isArray(profile) ? profile[0] : profile;
    const name = prof?.full_name?.trim() || prof?.email || "Member";
    items.push({
      id: `pay-${p.id}`,
      at: p.created_at as string,
      text: `${name} completed payment`,
    });
  }

  for (const profile of profiles ?? []) {
    const name =
      (profile.full_name as string | null)?.trim() ||
      (profile.email as string) ||
      "Member";
    items.push({
      id: `join-${profile.id}`,
      at: profile.invitation_accepted_at as string,
      text: `${name} joined MA5`,
    });
  }

  for (const b of bookings ?? []) {
    const profile = b.ma5_profiles as
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[]
      | null;
    const session = b.ma5_sessions as
      | { title: string }
      | { title: string }[]
      | null;
    const prof = Array.isArray(profile) ? profile[0] : profile;
    const sess = Array.isArray(session) ? session[0] : session;
    const name = prof?.full_name?.trim() || prof?.email || "Member";
    items.push({
      id: `book-${b.id}`,
      at: b.created_at as string,
      text: `${name} booked ${sess?.title ?? "a session"}`,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      text: item.text,
      when: formatRelativeWhen(item.at),
    }));
}

function ytdNote(): string {
  const { year, month } = zonedParts();
  if (month === 1) return `Jan ${year}`;
  return `Jan–${monthShortLabel(year, month)} ${year}`;
}

const EMPTY_FEES: FeeSnapshot = {
  feesThisMonthCents: 0,
  grossThisMonthCents: 0,
  netThisMonthCents: 0,
  effectiveFeeRatePercent: 0,
  byMethod: [],
};

async function fetchFeeSnapshot(): Promise<FeeSnapshot> {
  const supabase = await createClient();
  const monthStart = startOfMonth();
  const now = new Date();

  const { data, error } = await supabase
    .from(MA5_TABLES.payments)
    .select(
      "amount_cents, processing_fee_cents, net_amount_cents, payment_method_type, status",
    )
    .eq("status", "succeeded")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", now.toISOString());

  if (error) throw error;

  let grossThisMonthCents = 0;
  let feesThisMonthCents = 0;
  let netThisMonthCents = 0;
  const byMethodMap = new Map<string, { feeCents: number; grossCents: number }>();

  for (const row of data ?? []) {
    const gross = (row.amount_cents as number) ?? 0;
    const fee = Math.abs((row.processing_fee_cents as number) ?? 0);
    const net =
      (row.net_amount_cents as number) ?? Math.max(gross - fee, 0);
    const method = (row.payment_method_type as string | null)?.trim() || "Unknown";

    grossThisMonthCents += gross;
    feesThisMonthCents += fee;
    netThisMonthCents += net;

    const bucket = byMethodMap.get(method) ?? { feeCents: 0, grossCents: 0 };
    bucket.feeCents += fee;
    bucket.grossCents += gross;
    byMethodMap.set(method, bucket);
  }

  const effectiveFeeRatePercent =
    grossThisMonthCents > 0
      ? Math.round((feesThisMonthCents / grossThisMonthCents) * 1000) / 10
      : 0;

  const byMethod = [...byMethodMap.entries()]
    .map(([method, values]) => ({
      method,
      feeCents: values.feeCents,
      grossCents: values.grossCents,
      effectiveRatePercent:
        values.grossCents > 0
          ? Math.round((values.feeCents / values.grossCents) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.feeCents - a.feeCents);

  return {
    feesThisMonthCents,
    grossThisMonthCents,
    netThisMonthCents,
    effectiveFeeRatePercent,
    byMethod,
  };
}

export async function getBusinessReports(): Promise<BusinessReports> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return { ...DEMO_BUSINESS_REPORTS, isDemo: true };
  }

  try {
    const now = new Date();
    const today = startOfToday();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    const yearStart = startOfYear();
    const lastYear = zonedParts().year - 1;
    const lastYearStart = zonedDayStart(lastYear, 1, 1);
    const lastYearEnd = new Date(zonedDayStart(lastYear + 1, 1, 1).getTime() - 1);

    const [
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueYtd,
      revenueLastYear,
      revenueChart,
      memberships,
      bookingMetrics,
      capacity,
      topPrograms,
      successfulMonth,
      failedMonth,
      outstandingCents,
      refundsMonth,
      fees,
    ] = await Promise.all([
      sumRevenueBetween(today, now),
      sumRevenueBetween(weekStart, now),
      sumRevenueBetween(monthStart, now),
      sumRevenueBetween(yearStart, now),
      sumRevenueBetween(lastYearStart, lastYearEnd),
      buildRevenueChart(),
      fetchMembershipSnapshot(),
      fetchBookingMetrics(),
      fetchCapacityRows(),
      fetchTopPrograms(),
      countPaymentsBetween(monthStart, now, ["succeeded"]),
      countPaymentsBetween(monthStart, now, ["failed"]),
      sumOutstandingInvoices(),
      countRefundsThisMonth(),
      fetchFeeSnapshot(),
    ]);

    const revenuePeriods: PeriodMetric[] = [
      { id: "today", label: "Today", value: formatCompactMoney(revenueToday) },
      {
        id: "week",
        label: "This week",
        value: formatCompactMoney(revenueWeek),
      },
      {
        id: "month",
        label: "This month",
        value: formatCompactMoney(revenueMonth),
      },
      {
        id: "ytd",
        label: "YTD",
        value: formatCompactMoney(revenueYtd),
        note: ytdNote(),
      },
      {
        id: "last-year",
        label: "Last year",
        value: formatCompactMoney(revenueLastYear),
      },
    ];

    const kpis: PeriodMetric[] = [
      { id: "k1", label: "Revenue today", value: formatCompactMoney(revenueToday) },
      { id: "k2", label: "Revenue this week", value: formatCompactMoney(revenueWeek) },
      { id: "k3", label: "Revenue this month", value: formatCompactMoney(revenueMonth) },
      { id: "k4", label: "Revenue YTD", value: formatCompactMoney(revenueYtd) },
      { id: "k5", label: "Active members", value: String(memberships.active) },
      { id: "k6", label: "New members this month", value: String(memberships.newThisMonth) },
      { id: "k7", label: "Expired memberships", value: String(memberships.expired) },
      { id: "k8", label: "Members at risk", value: String(memberships.atRisk) },
      { id: "k9", label: "Today's sessions", value: String(bookingMetrics.sessionsToday) },
      { id: "k10", label: "This week's sessions", value: String(bookingMetrics.sessionsWeek) },
      { id: "k11", label: "Bookings this month", value: String(bookingMetrics.bookingsMonth) },
      { id: "k12", label: "Average attendance", value: String(bookingMetrics.attendance.averageAttendance) },
      { id: "k13", label: "Successful payments", value: String(successfulMonth) },
      { id: "k14", label: "Failed payments", value: String(failedMonth) },
      { id: "k15", label: "Outstanding balances", value: formatCompactMoney(outstandingCents) },
      { id: "k16", label: "Refunds", value: String(refundsMonth) },
    ];

    return {
      isDemo: false,
      revenuePeriods,
      revenueChart,
      bookingPeriods: bookingMetrics.periods,
      bookingsChart: bookingMetrics.weekChart,
      memberships,
      attendance: bookingMetrics.attendance,
      capacity: capacity.rows,
      averageCapacityPercent: capacity.averagePercent,
      topPrograms,
      payments: {
        successful: successfulMonth,
        failed: failedMonth,
        outstandingCents,
        refunds: refundsMonth,
      },
      fees,
      activity: await fetchActivityFeed(),
      kpis,
    };
  } catch (err) {
    console.error("[analytics] getBusinessReports", err);
    return { ...DEMO_BUSINESS_REPORTS, isDemo: true };
  }
}

export async function getDailyOpsDashboard(): Promise<DailyOpsDashboard> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return { ...DEMO_DAILY_OPS, isDemo: true };
  }

  try {
    const now = new Date();
    const today = startOfToday();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeekEnd = new Date(weekStart.getTime() - 1);

    const [
      revenueToday,
      revenueThisWeek,
      revenuePrevWeek,
      memberships,
      bookingMetrics,
      failedMonth,
      recentPayments,
      recentSignups,
      todaySchedule,
      comms,
    ] = await Promise.all([
      sumRevenueBetween(today, now),
      sumRevenueBetween(weekStart, now),
      sumRevenueBetween(prevWeekStart, prevWeekEnd),
      fetchMembershipSnapshot(),
      fetchBookingMetrics(),
      countPaymentsBetween(monthStart, now, ["failed"]),
      fetchRecentPayments(),
      fetchRecentSignups(),
      fetchTodaySchedule(),
      loadCommunicationState(),
    ]);

    const revenueChange = pctChange(revenueThisWeek, revenuePrevWeek);
    const unreadMessages = countStaffUnreadReplies(comms.threads);

    const health: HealthMetric[] = [
      {
        id: "revenue",
        label: "Revenue",
        value: formatPctBadge(revenueChange),
        detail: "vs last week",
        status: healthFromPctChange(revenueChange),
      },
      {
        id: "memberships",
        label: "Memberships",
        value: memberships.netGrowth >= 0 ? `+${memberships.netGrowth}` : String(memberships.netGrowth),
        detail: "net this month",
        status: memberships.netGrowth > 0 ? "good" : memberships.netGrowth < 0 ? "alert" : "watch",
      },
      {
        id: "attendance",
        label: "Attendance",
        value: `${bookingMetrics.attendance.ratePercent}%`,
        detail: "last 30 days",
        status:
          bookingMetrics.attendance.ratePercent >= 85
            ? "good"
            : bookingMetrics.attendance.ratePercent >= 70
              ? "watch"
              : "alert",
      },
      {
        id: "failed-payments",
        label: "Failed payments",
        value: String(failedMonth),
        detail: "this month",
        status: failedMonth > 0 ? "alert" : "good",
      },
    ];

    const overview = [
      {
        id: "sessions",
        label: "Today's sessions",
        value: String(bookingMetrics.sessionsToday),
        href: "/admin/schedule",
      },
      {
        id: "revenue",
        label: "Today's revenue",
        value: formatCompactMoney(revenueToday),
        href: "/admin/reports",
      },
      {
        id: "attendance",
        label: "Attendance rate",
        value: `${bookingMetrics.attendance.ratePercent}%`,
        href: "/admin/bookings",
      },
      {
        id: "members",
        label: "Active members",
        value: String(memberships.active),
        href: "/admin/clients",
      },
      {
        id: "messages",
        label: "Unread messages",
        value: String(unreadMessages),
        href: "/admin/messages",
      },
      {
        id: "failed",
        label: "Failed payments",
        value: String(failedMonth),
        href: "/admin/reports",
      },
    ];

    const messages = comms.threads
      .filter((t) => t.lastSenderRole === "client" && t.unreadCount > 0)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        from: t.clientName,
        preview: t.lastMessagePreview ?? "New message",
        when: t.lastMessageAt ? formatRelativeWhen(t.lastMessageAt) : "",
        unread: true,
      }));

    return {
      isDemo: false,
      health,
      overview,
      schedule: todaySchedule,
      payments: recentPayments,
      signups: recentSignups,
      messages,
    };
  } catch (err) {
    console.error("[analytics] getDailyOpsDashboard", err);
    return { ...DEMO_DAILY_OPS, isDemo: true };
  }
}
