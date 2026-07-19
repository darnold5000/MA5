import { NextResponse } from "next/server";
import { z } from "zod";

import {
  archiveOffering,
  getOfferingById,
  hideOffering,
  restoreOffering,
  showOffering,
  syncOfferingToStripe,
  updateOffering,
} from "@/lib/billing";
import type { OfferingLifecycleAction } from "@/lib/billing/offering-lifecycle";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { hasCapability } from "@/lib/permissions/roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  slug: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).nullable().optional(),
  productType: z.enum(["membership", "package", "drop_in", "addon"]).optional(),
  category: z.string().max(80).nullable().optional(),
  paymentType: z.enum(["one_time", "subscription"]).optional(),
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  currency: z.string().length(3).optional(),
  billingInterval: z.enum(["month", "one_time"]).nullable().optional(),
  sessionCredits: z.number().int().min(0).max(10_000).nullable().optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  syncStripe: z.boolean().optional(),
  lifecycleAction: z.enum(["hide", "show", "archive", "restore"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

async function applyLifecycleAction(
  id: string,
  action: OfferingLifecycleAction,
) {
  switch (action) {
    case "hide":
      return hideOffering(id);
    case "show":
      return showOffering(id);
    case "archive":
      return archiveOffering(id);
    case "restore": {
      const offering = await restoreOffering(id);
      if (!offering.stripeProductId || !offering.currentStripePriceId) {
        return syncOfferingToStripe(id);
      }
      return offering;
    }
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  if (!hasCapability(auth.roles, "manage_memberships")) {
    return NextResponse.json(
      {
        error:
          "Offerings require the manage_memberships capability (owner, admin, or coach).",
      },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required" }, { status: 503 });
  }

  const offering = await getOfferingById(id, { useServiceRole: true });
  if (!offering) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ offering });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  if (!hasCapability(auth.roles, "manage_memberships")) {
    return NextResponse.json(
      {
        error:
          "Offerings require the manage_memberships capability (owner, admin, or coach).",
      },
      { status: 403 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required" }, { status: 503 });
  }

  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  try {
    const { syncStripe, lifecycleAction, ...fields } = parsed.data;

    if (lifecycleAction) {
      let offering = await applyLifecycleAction(id, lifecycleAction);
      const hasFieldUpdates = Object.values(fields).some((v) => v !== undefined);
      if (hasFieldUpdates) {
        offering = await updateOffering(id, fields);
      }
      if (syncStripe) {
        offering = await syncOfferingToStripe(id);
      }
      return NextResponse.json({ offering });
    }

    const hasFieldUpdates = Object.values(fields).some((v) => v !== undefined);

    let offering = hasFieldUpdates
      ? await updateOffering(id, fields)
      : await getOfferingById(id, { useServiceRole: true });

    if (!offering) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (syncStripe) {
      offering = await syncOfferingToStripe(id);
    } else if (
      hasFieldUpdates &&
      (!offering.stripeProductId || !offering.currentStripePriceId)
    ) {
      offering = await syncOfferingToStripe(id);
    }

    return NextResponse.json({ offering });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 },
    );
  }
}
