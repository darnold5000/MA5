import { NextResponse } from "next/server";
import { z } from "zod";

import {
  bookingRequestServiceLabel,
  isBookingRequestService,
} from "@/content/booking-request";
import { readAttributionFromCookies } from "@/lib/attribution/cookies";
import {
  formatStaffBookingRequestEmail,
  formatStaffLeadEmail,
  notifyStaffEmail,
} from "@/lib/email/notify-staff";
import { isSupabasePublicConfigured } from "@/lib/env";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { withTenantId } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";

const leadSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
  sourcePath: z.string().max(500).optional(),
  service: z.string().max(80).optional(),
  intent: z.enum(["contact", "booking"]).optional(),
});

function buildStoredMessage(data: {
  message?: string;
  service?: string;
  intent?: "contact" | "booking";
}): string | null {
  const body = data.message?.trim() || "";
  if (data.intent === "booking" && data.service) {
    const label = bookingRequestServiceLabel(data.service);
    const prefix = `Booking request: ${label}`;
    return body ? `${prefix}\n\n${body}` : prefix;
  }
  return body || null;
}

async function sendStaffNotification(args: {
  name: string;
  email: string;
  phone?: string;
  message?: string | null;
  service?: string;
  intent?: "contact" | "booking";
  sourcePath?: string;
  utmCampaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}) {
  const isBooking =
    args.intent === "booking" &&
    args.service &&
    isBookingRequestService(args.service);

  const payload = isBooking
    ? formatStaffBookingRequestEmail({
        name: args.name,
        email: args.email,
        phone: args.phone,
        serviceLabel: bookingRequestServiceLabel(args.service!),
        message: args.message,
        sourcePath: args.sourcePath,
        utmCampaign: args.utmCampaign,
        utmSource: args.utmSource,
        utmMedium: args.utmMedium,
      })
    : formatStaffLeadEmail({
        name: args.name,
        email: args.email,
        phone: args.phone,
        message: args.message,
        utmCampaign: args.utmCampaign,
        utmSource: args.utmSource,
        utmMedium: args.utmMedium,
      });

  await notifyStaffEmail({
    ...payload,
    replyTo: args.email,
  });
}

/**
 * Public lead capture. Associates anonymous visitor cookie with PII only
 * after voluntary form submission.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid name and email" },
      { status: 400 },
    );
  }

  if (
    parsed.data.intent === "booking" &&
    parsed.data.service &&
    !isBookingRequestService(parsed.data.service)
  ) {
    return NextResponse.json(
      { error: "Please choose a valid service" },
      { status: 400 },
    );
  }

  const { visitorId, firstTouch } = await readAttributionFromCookies();
  const emailNorm = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const storedMessage = buildStoredMessage(parsed.data);
  const isBooking = parsed.data.intent === "booking";
  const successMessage = isBooking
    ? "Thanks — your request was sent. We will follow up by email or phone to confirm your appointment."
    : "Thanks — we will be in touch soon.";

  const supabaseReady =
    isSupabasePublicConfigured() &&
    isSupabaseConfigured() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseReady) {
    if (shouldUseMa5LiveData()) {
      return NextResponse.json(
        { error: "Lead capture is not configured for this deployment" },
        { status: 503 },
      );
    }

    await sendStaffNotification({
      name,
      email: emailNorm,
      phone: parsed.data.phone,
      message: storedMessage,
      service: parsed.data.service,
      intent: parsed.data.intent,
      sourcePath: parsed.data.sourcePath,
      utmCampaign: firstTouch?.utmCampaign,
      utmSource: firstTouch?.utmSource,
      utmMedium: firstTouch?.utmMedium,
    });

    return NextResponse.json({
      ok: true,
      demo: true,
      message: successMessage,
    });
  }

  try {
    const { supabase: admin, ctx } = isMa5DeploymentConfigured()
      ? createMa5TenantServiceClient()
      : { supabase: createServiceClient(), ctx: null };

    if (visitorId && firstTouch) {
      let visitorQuery = admin
        .from(MA5_TABLES.visitorSessions)
        .select("visitor_id")
        .eq("visitor_id", visitorId);
      if (ctx) visitorQuery = visitorQuery.eq("tenant_id", ctx.tenantId);

      const { data: existing } = await visitorQuery.maybeSingle();

      if (!existing) {
        const visitorRow = ctx
          ? withTenantId(ctx, {
              visitor_id: visitorId,
              first_seen: firstTouch.capturedAt,
              last_seen: new Date().toISOString(),
              landing_page: firstTouch.landingPage,
              referrer: firstTouch.referrer,
              utm_source: firstTouch.utmSource,
              utm_medium: firstTouch.utmMedium,
              utm_campaign: firstTouch.utmCampaign,
              utm_term: firstTouch.utmTerm,
              utm_content: firstTouch.utmContent,
            })
          : {
              visitor_id: visitorId,
              first_seen: firstTouch.capturedAt,
              last_seen: new Date().toISOString(),
              landing_page: firstTouch.landingPage,
              referrer: firstTouch.referrer,
              utm_source: firstTouch.utmSource,
              utm_medium: firstTouch.utmMedium,
              utm_campaign: firstTouch.utmCampaign,
              utm_term: firstTouch.utmTerm,
              utm_content: firstTouch.utmContent,
            };
        await admin.from(MA5_TABLES.visitorSessions).insert(visitorRow);
      } else {
        let updateQuery = admin
          .from(MA5_TABLES.visitorSessions)
          .update({ last_seen: new Date().toISOString() })
          .eq("visitor_id", visitorId);
        if (ctx) updateQuery = updateQuery.eq("tenant_id", ctx.tenantId);
        await updateQuery;
      }
    }

    const leadRow = ctx
      ? withTenantId(ctx, {
          visitor_id: visitorId,
          name,
          email: emailNorm,
          phone: parsed.data.phone?.trim() || null,
          message: storedMessage,
          utm_source: firstTouch?.utmSource ?? null,
          utm_medium: firstTouch?.utmMedium ?? null,
          utm_campaign: firstTouch?.utmCampaign ?? null,
          utm_term: firstTouch?.utmTerm ?? null,
          utm_content: firstTouch?.utmContent ?? null,
          landing_page: firstTouch?.landingPage ?? null,
          referrer: firstTouch?.referrer ?? null,
          status: "new",
          source_path: parsed.data.sourcePath ?? "/contact",
        })
      : {
          visitor_id: visitorId,
          name,
          email: emailNorm,
          phone: parsed.data.phone?.trim() || null,
          message: storedMessage,
          utm_source: firstTouch?.utmSource ?? null,
          utm_medium: firstTouch?.utmMedium ?? null,
          utm_campaign: firstTouch?.utmCampaign ?? null,
          utm_term: firstTouch?.utmTerm ?? null,
          utm_content: firstTouch?.utmContent ?? null,
          landing_page: firstTouch?.landingPage ?? null,
          referrer: firstTouch?.referrer ?? null,
          status: "new",
          source_path: parsed.data.sourcePath ?? "/contact",
        };

    const { data: lead, error } = await admin
      .from(MA5_TABLES.leads)
      .insert(leadRow)
      .select("id")
      .single();

    if (error) {
      console.error("[api/leads]", error);
      return NextResponse.json(
        { error: "Could not save your message. Please try email instead." },
        { status: 500 },
      );
    }

    await sendStaffNotification({
      name,
      email: emailNorm,
      phone: parsed.data.phone,
      message: storedMessage,
      service: parsed.data.service,
      intent: parsed.data.intent,
      sourcePath: parsed.data.sourcePath,
      utmCampaign: firstTouch?.utmCampaign,
      utmSource: firstTouch?.utmSource,
      utmMedium: firstTouch?.utmMedium,
    });

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      message: successMessage,
    });
  } catch (err) {
    console.error("[api/leads]", err);
    return NextResponse.json(
      { error: "Could not save your message" },
      { status: 500 },
    );
  }
}
