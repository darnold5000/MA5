import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { mergeSessions, readOpsState } from "@/features/admin/ops-store";
import type { BookingItem, SessionItem } from "@/features/scheduling/fallback-data";
import { listActiveOfferings } from "@/lib/billing/catalog";
import type { ProductItem, MembershipItem } from "@/features/scheduling/fallback-data";
import { durationFromRange } from "@/features/scheduling/format";

export async function listAllSessions(): Promise<SessionItem[]> {
  if (!isSupabaseConfigured()) {
    const state = await readOpsState();
    return mergeSessions(state);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.sessions)
      .select("*")
      .order("starts_at", { ascending: true });

    if (error || !data?.length) {
      const state = await readOpsState();
      return mergeSessions(state);
    }

    return data.map((row) => {
      const startsAt = row.starts_at as string;
      const endsAt = row.ends_at as string;
      return {
        id: row.id as string,
        classTypeId: (row.class_type_id as string) ?? "",
        title: row.title as string,
        description: (row.description as string) ?? "",
        startsAt,
        endsAt,
        durationMinutes: durationFromRange(startsAt, endsAt),
        capacity: row.capacity as number,
        bookedCount: 0,
        priceCents: row.price_cents as number,
        locationName: (row.location_name as string) ?? "MA5 Performance",
        status: row.status as SessionItem["status"],
        coachName: (row.coach_name as string) ?? "MA5 Coach",
        source: "database" as const,
      };
    });
  } catch {
    const state = await readOpsState();
    return mergeSessions(state);
  }
}

export async function listPublishedSessions(): Promise<SessionItem[]> {
  const all = await listAllSessions();
  return all.filter((s) => s.status === "published" || s.status === "full");
}

export async function getSessionById(id: string): Promise<SessionItem | null> {
  const sessions = await listPublishedSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function listProducts(): Promise<ProductItem[]> {
  try {
    const offerings = await listActiveOfferings();
    return offerings.map((o) => ({
      id: o.id,
      slug: o.slug,
      name: o.name,
      description: o.description ?? "",
      productType: o.productType,
      priceCents: o.priceCents,
      billingInterval: o.billingInterval,
      sessionCredits: o.sessionCredits,
      stripePriceConfigured: Boolean(o.currentStripePriceId),
      source: "database" as const,
    }));
  } catch {
    return [];
  }
}

export async function listUserBookings(userId: string | null): Promise<BookingItem[]> {
  if (!userId || !isSupabaseConfigured()) {
    const { FALLBACK_BOOKINGS } = await import("@/features/scheduling/fallback-data");
    return FALLBACK_BOOKINGS;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.bookings)
      .select("*, ma5_sessions(title, starts_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      const { FALLBACK_BOOKINGS } = await import("@/features/scheduling/fallback-data");
      return FALLBACK_BOOKINGS;
    }

    return data.map((row) => {
      const session = row.ma5_sessions as
        | { title?: string; starts_at?: string }
        | null;
      return {
        id: row.id as string,
        sessionId: row.session_id as string,
        sessionTitle: session?.title ?? "Session",
        startsAt: session?.starts_at ?? "",
        confirmationNumber: row.confirmation_number as string,
        status: row.status as string,
        paymentStatus: row.payment_status as string,
        amountCents: row.amount_cents as number,
        source: "database" as const,
      };
    });
  } catch {
    const { FALLBACK_BOOKINGS } = await import("@/features/scheduling/fallback-data");
    return FALLBACK_BOOKINGS;
  }
}

export async function listUserMemberships(
  userId: string | null,
): Promise<MembershipItem[]> {
  if (!userId || !isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.memberships)
      .select("*, ma5_products(name, slug)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => {
      const product = row.ma5_products as { name?: string; slug?: string } | null;
      return {
        id: row.id as string,
        productName: product?.name ?? "Membership",
        productSlug: product?.slug ?? "",
        status: row.status as string,
        currentPeriodEnd: (row.current_period_end as string) ?? null,
        source: "database" as const,
      };
    });
  } catch {
    return [];
  }
}

export { formatMoney, formatSessionWhen } from "@/features/scheduling/format";
