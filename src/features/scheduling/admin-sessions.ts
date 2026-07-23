import { FALLBACK_CLASS_TYPES } from "@/features/scheduling/fallback-data";
import type { SessionItem } from "@/features/scheduling/fallback-data";
import { durationFromRange } from "@/features/scheduling/format";
import { defaultLocationLabel } from "@/features/settings/locations";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { withTenantId } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function locationNameFromRow(row: SessionRow): string {
  const loc = row.ma5_locations;
  if (!loc) return defaultLocationLabel();
  if (Array.isArray(loc)) return loc[0]?.name ?? defaultLocationLabel();
  return loc.name ?? defaultLocationLabel();
}

function mapSessionRow(row: SessionRow): SessionItem {
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
    source: "database",
  };
}

const SESSION_SELECT =
  "id, class_type_id, title, description, starts_at, ends_at, capacity, price_cents, status, coach_name, ma5_locations(name)";

export async function listAdminSessionsFromDb(): Promise<SessionItem[]> {
  const { supabase, ctx } = createMa5TenantServiceClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.sessions)
    .select(SESSION_SELECT)
    .eq("tenant_id", ctx.tenantId)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as SessionRow[]).map(mapSessionRow);
}

type ClassTypeRow = {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  default_capacity: number;
  default_price_cents: number;
};

async function resolveClassType(
  classTypeId: string,
): Promise<ClassTypeRow> {
  const { supabase, ctx } = createMa5TenantServiceClient();

  let query = supabase
    .from(MA5_TABLES.classTypes)
    .select(
      "id, name, description, default_duration_minutes, default_capacity, default_price_cents",
    )
    .eq("tenant_id", ctx.tenantId);

  if (UUID_RE.test(classTypeId)) {
    query = query.eq("id", classTypeId);
  } else {
    const fallback = FALLBACK_CLASS_TYPES.find((c) => c.id === classTypeId);
    const slug = fallback?.slug ?? classTypeId.replace(/^ct-/, "");
    query = query.eq("slug", slug);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      `Class type not found for this tenant (${classTypeId}). Seed ma5_class_types or pick a valid type.`,
    );
  }
  return data as ClassTypeRow;
}

export type CreateAdminSessionInput = {
  classTypeId: string;
  startsAt: string;
  durationMinutes?: number;
  capacity?: number;
  priceCents?: number;
  coachName?: string;
  title?: string;
  description?: string;
};

export async function createAdminSession(
  input: CreateAdminSessionInput,
): Promise<SessionItem> {
  const client = createMa5TenantServiceClient();
  const { supabase, ctx } = client;

  const classType = await resolveClassType(input.classTypeId);
  const durationMinutes =
    input.durationMinutes ?? classType.default_duration_minutes;
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const { data, error } = await supabase
    .from(MA5_TABLES.sessions)
    .insert(
      withTenantId(ctx, {
        location_id: ctx.locationId,
        class_type_id: classType.id,
        title: input.title?.trim() || classType.name,
        description: input.description ?? classType.description,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        capacity: input.capacity ?? classType.default_capacity,
        price_cents: input.priceCents ?? classType.default_price_cents,
        status: "published",
        coach_name: input.coachName ?? "MA5 Coach",
      }),
    )
    .select(SESSION_SELECT)
    .single();

  if (error) throw error;
  return mapSessionRow(data as SessionRow);
}

export type UpdateAdminSessionInput = {
  sessionId: string;
  title?: string;
  description?: string;
  startsAt?: string;
  durationMinutes?: number;
  capacity?: number;
  priceCents?: number;
  coachName?: string;
  status?: SessionItem["status"];
};

export async function updateAdminSession(
  input: UpdateAdminSessionInput,
): Promise<SessionItem> {
  const { supabase, ctx } = createMa5TenantServiceClient();

  const { data: current, error: loadError } = await supabase
    .from(MA5_TABLES.sessions)
    .select("starts_at, ends_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", input.sessionId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!current) throw new Error("Session not found");

  const startsAt = input.startsAt ?? (current.starts_at as string);
  const currentDuration = durationFromRange(
    current.starts_at as string,
    current.ends_at as string,
  );
  const durationMinutes = input.durationMinutes ?? currentDuration;
  const endsAt = new Date(
    new Date(startsAt).getTime() + durationMinutes * 60_000,
  ).toISOString();

  const patch: Record<string, unknown> = {
    starts_at: startsAt,
    ends_at: endsAt,
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
  if (input.coachName !== undefined) patch.coach_name = input.coachName;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from(MA5_TABLES.sessions)
    .update(patch)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", input.sessionId)
    .select(SESSION_SELECT)
    .single();

  if (error) throw error;
  return mapSessionRow(data as SessionRow);
}
