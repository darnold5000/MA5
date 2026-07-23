import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  withTenantId,
  type Ma5DeploymentContext,
} from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";

export type ProgramsAdminGate = {
  supabase: SupabaseClient;
  userId: string;
  ctx: Ma5DeploymentContext | null;
};

export async function shouldUseProgramsSupabaseBackend(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const session = await getSessionUser();
  return Boolean(session && canAccessAdmin(session.roles));
}

export async function resolveProgramsAdminGate(): Promise<
  ProgramsAdminGate | { error: NextResponse }
> {
  const session = await getSessionUser();
  if (!session || !canAccessAdmin(session.roles)) {
    return {
      error: NextResponse.json({ error: "Admin access required" }, {
        status: 401,
      }),
    };
  }
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured" }, {
        status: 500,
      }),
    };
  }

  if (shouldUseMa5LiveData()) {
    const { supabase, ctx } = createMa5TenantServiceClient();
    return { supabase, userId: session.id, ctx };
  }

  const supabase = await createClient();
  return { supabase, userId: session.id, ctx: null };
}

export function programsTenantRow<T extends Record<string, unknown>>(
  gate: ProgramsAdminGate,
  row: T,
): T | (T & { tenant_id: string }) {
  return gate.ctx ? withTenantId(gate.ctx, row) : row;
}
