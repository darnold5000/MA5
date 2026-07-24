import { NextResponse } from "next/server";

import { formatUnreadBadge } from "@/features/messaging/types";
import { getUnreadBadgeCount } from "@/features/messaging/queries";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin, hasCapability } from "@/lib/permissions/roles";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ count: 0, label: formatUnreadBadge(0) });
  }

  const wantsStaff = new URL(request.url).searchParams.get("staff") === "1";
  const staff = Boolean(
    wantsStaff &&
      canAccessAdmin(session.roles) &&
      hasCapability(session.roles, "message_clients"),
  );

  const count = await getUnreadBadgeCount({ staff });
  return NextResponse.json({
    count,
    label: formatUnreadBadge(count),
  });
}
