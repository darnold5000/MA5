import { NextResponse } from "next/server";

import {
  readValidatedInviteGeneration,
  resolveInviteAccess,
} from "@/lib/auth/invite-access";

export async function GET() {
  const inviteGeneration = await readValidatedInviteGeneration();
  const access = await resolveInviteAccess(inviteGeneration);

  const response = NextResponse.json(access);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
