import { NextResponse } from "next/server";

import { getCoachWorkoutReview } from "@/features/programs/queries";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions/roles";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || !canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const clientUserId = url.searchParams.get("clientUserId")?.trim() ?? "";
  const calendarEntryId = url.searchParams.get("calendarEntryId")?.trim() ?? "";
  const clientName = url.searchParams.get("clientName")?.trim();

  if (!clientUserId || !calendarEntryId) {
    return NextResponse.json(
      { error: "clientUserId and calendarEntryId are required" },
      { status: 400 },
    );
  }

  try {
    const review = await getCoachWorkoutReview(
      clientUserId,
      calendarEntryId,
      clientName,
    );
    if (!review) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load workout review",
      },
      { status: 500 },
    );
  }
}
