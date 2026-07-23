import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { defaultLocationLabel } from "@/features/settings/locations";
import { mergeSessions, readOpsState } from "@/features/admin/ops-store";
import type { BookingItem, SessionItem } from "@/features/scheduling/fallback-data";
import { listActiveOfferings } from "@/lib/billing/catalog";
import type { ProductItem, MembershipItem } from "@/features/scheduling/fallback-data";
import { durationFromRange } from "@/features/scheduling/format";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

type SessionRow = {
  id: string;
  class_type_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  status: SessionItem["status"];
  coach_name: string | null;
  ma5_locations: { name: string } | { name: string }[] | null;
};

function locationNameFromRow(
  row: SessionRow,
  fallback = defaultLocationLabel(),
): string {
  const loc = row.ma5_locations;
  if (!loc) return fallback;
  if (Array.isArray(loc)) return loc[0]?.name ?? fallback;
  return loc.name ?? fallback;
}

export async function listAllSessions(): Promise<SessionItem[]> {
  if (!isSupabaseConfigured()) {
    const state = await readOpsState();
    return mergeSessions(state);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.sessions)
      .select(
        "id, class_type_id, title, description, starts_at, ends_at, capacity, price_cents, status, coach_name, ma5_locations(name)",
      )
      .order("starts_at", { ascending: true });

    if (error || !data?.length) {
      if (isMa5DeploymentConfigured()) {
        return [];
      }
      const state = await readOpsState();
      return mergeSessions(state);
    }

    return (data as SessionRow[]).map((row) => {
      const startsAt = row.starts_at;
      const endsAt = row.ends_at;
      return {
        id: row.id,
        classTypeId: row.class_type_id ?? "",
        title: row.title,
        description: row.description ?? "",
        startsAt,
        endsAt,
        durationMinutes: durationFromRange(startsAt, endsAt),
        capacity: row.capacity,
        bookedCount: 0,
        priceCents: row.price_cents,
        locationName: locationNameFromRow(row),
        status: row.status,
        coachName: row.coach_name ?? "MA5 Coach",
        source: "database" as const,
      };
    });
  } catch {
    if (isMa5DeploymentConfigured()) {
      return [];
    }
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
    if (isMa5DeploymentConfigured()) return [];
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
      if (isMa5DeploymentConfigured()) return [];
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
    if (isMa5DeploymentConfigured()) return [];
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
