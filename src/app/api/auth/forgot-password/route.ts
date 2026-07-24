import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deliverPasswordResetRequestEmail,
  requireAuthEmailStack,
} from "@/lib/email/auth-email-flows";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * Always returns a generic success response so callers cannot probe which
 * emails are registered. Delivery uses AuthLinkService + EmailService (Resend).
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (
    isSupabaseConfigured() &&
    isMa5DeploymentConfigured() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const tenantId = process.env.MA5_TENANT_ID?.trim();
    if (tenantId) {
      try {
        const admin = createServiceClient();
        const stack = requireAuthEmailStack(tenantId, admin);
        await deliverPasswordResetRequestEmail({
          stack,
          emailNorm: email,
        });
      } catch (err) {
        console.error("[api/auth/forgot-password] email stack", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
