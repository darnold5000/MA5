import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createOffering,
  listOfferings,
  syncMissingStripeOfferings,
} from "@/lib/billing";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { hasCapability } from "@/lib/permissions/roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).nullable().optional(),
  productType: z.enum(["membership", "package", "drop_in", "addon"]),
  category: z.string().max(80).nullable().optional(),
  paymentType: z.enum(["one_time", "subscription"]),
  priceCents: z.number().int().min(0).max(10_000_000),
  currency: z.string().length(3).optional(),
  billingInterval: z.enum(["month", "one_time"]).nullable().optional(),
  sessionCredits: z.number().int().min(0).max(10_000).nullable().optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  if (!hasCapability(auth.roles, "manage_memberships")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is required for offerings" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "1";
  const syncStripe = searchParams.get("syncStripe") === "1";

  if (syncStripe) {
    const result = await syncMissingStripeOfferings();
    return NextResponse.json({
      offerings: await listOfferings({
        includeArchived,
        useServiceRole: true,
      }),
      stripeSync: result,
    });
  }

  const offerings = await listOfferings({
    includeArchived,
    useServiceRole: true,
  });

  return NextResponse.json({ offerings });
}

export async function POST(request: Request) {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  if (!hasCapability(auth.roles, "manage_memberships")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is required for offerings" },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offering" }, { status: 400 });
  }

  try {
    const offering = await createOffering(parsed.data);
    return NextResponse.json({ offering }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 400 },
    );
  }
}
