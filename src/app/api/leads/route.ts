import { NextResponse } from "next/server";
import { z } from "zod";

import { readAttributionFromCookies } from "@/lib/attribution/cookies";
import { isSupabasePublicConfigured } from "@/lib/env";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const leadSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
  sourcePath: z.string().max(500).optional(),
});

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

  const { visitorId, firstTouch } = await readAttributionFromCookies();
  const emailNorm = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();

  if (
    !isSupabasePublicConfigured() ||
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Thanks — we received your message (demo mode).",
    });
  }

  try {
    const admin = createServiceClient();

    // Ensure visitor session exists so FK succeeds — never overwrite first-touch
    if (visitorId && firstTouch) {
      const { data: existing } = await admin
        .from(MA5_TABLES.visitorSessions)
        .select("visitor_id")
        .eq("visitor_id", visitorId)
        .maybeSingle();

      if (!existing) {
        await admin.from(MA5_TABLES.visitorSessions).insert({
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
        });
      } else {
        await admin
          .from(MA5_TABLES.visitorSessions)
          .update({ last_seen: new Date().toISOString() })
          .eq("visitor_id", visitorId);
      }
    }

    const { data: lead, error } = await admin
      .from(MA5_TABLES.leads)
      .insert({
        visitor_id: visitorId,
        name,
        email: emailNorm,
        phone: parsed.data.phone?.trim() || null,
        message: parsed.data.message?.trim() || null,
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
      .select("id")
      .single();

    if (error) {
      console.error("[api/leads]", error);
      return NextResponse.json(
        { error: "Could not save your message. Please try email instead." },
        { status: 500 },
      );
    }

    // Optional email notify — reserved env; fail soft
    const to = process.env.CONTACT_TO_EMAIL?.trim();
    if (to && process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MA5 Contact <onboarding@resend.dev>",
            to: [to],
            subject: `New lead: ${name}`,
            text: [
              `Name: ${name}`,
              `Email: ${emailNorm}`,
              `Phone: ${parsed.data.phone ?? "—"}`,
              `Campaign: ${firstTouch?.utmCampaign ?? "—"}`,
              `Source: ${firstTouch?.utmSource ?? "—"} / ${firstTouch?.utmMedium ?? "—"}`,
              "",
              parsed.data.message ?? "",
            ].join("\n"),
          }),
        });
      } catch (mailErr) {
        console.error("[api/leads] notify", mailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      message: "Thanks — we will be in touch soon.",
    });
  } catch (err) {
    console.error("[api/leads]", err);
    return NextResponse.json(
      { error: "Could not save your message" },
      { status: 500 },
    );
  }
}
