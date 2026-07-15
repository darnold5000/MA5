import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  FALLBACK_SESSIONS,
  type BookingItem,
  type SessionItem,
} from "@/features/scheduling/fallback-data";
import { getCatalogProducts } from "@/features/memberships/catalog";
import type { ProductItem, MembershipItem } from "@/features/scheduling/fallback-data";

export async function listPublishedSessions(): Promise<SessionItem[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_SESSIONS.filter((s) => s.status === "published" || s.status === "full");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.sessions)
      .select("*")
      .in("status", ["published", "full"])
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    if (error || !data?.length) {
      return FALLBACK_SESSIONS.filter((s) => s.status === "published" || s.status === "full");
    }

    return data.map((row) => ({
      id: row.id as string,
      classTypeId: (row.class_type_id as string) ?? "",
      title: row.title as string,
      description: (row.description as string) ?? "",
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string,
      capacity: row.capacity as number,
      bookedCount: 0,
      priceCents: row.price_cents as number,
      locationName: (row.location_name as string) ?? "MA5 Performance",
      status: row.status as SessionItem["status"],
      coachName: (row.coach_name as string) ?? "MA5 Coach",
      source: "database" as const,
    }));
  } catch {
    return FALLBACK_SESSIONS.filter((s) => s.status === "published" || s.status === "full");
  }
}

export async function getSessionById(id: string): Promise<SessionItem | null> {
  const sessions = await listPublishedSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function listProducts(): Promise<ProductItem[]> {
  return getCatalogProducts();
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

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatSessionWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date(iso));
}
