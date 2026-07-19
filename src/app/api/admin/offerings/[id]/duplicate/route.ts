import { NextResponse } from "next/server";

import { duplicateOffering } from "@/lib/billing";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { hasCapability } from "@/lib/permissions/roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
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

  try {
    const offering = await duplicateOffering(id);
    return NextResponse.json({ offering }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Duplicate failed" },
      { status: 400 },
    );
  }
}
