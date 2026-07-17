import { NextResponse } from "next/server";

import { formatUnreadBadge } from "@/features/messaging/types";
import { getUnreadBadgeCount } from "@/features/messaging/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin, hasCapability } from "@/lib/permissions/roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  const staff = Boolean(
    session &&
      canAccessAdmin(session.roles) &&
      hasCapability(session.roles, "message_clients"),
  );

  const count = await getUnreadBadgeCount({ staff });
  return NextResponse.json({
    count,
    label: formatUnreadBadge(count),
  });
}
