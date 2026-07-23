import { NextResponse } from "next/server";
import { z } from "zod";

import { isBotUserAgent } from "@/lib/attribution/bots";
import { readAttributionFromCookies } from "@/lib/attribution/cookies";
import { isValidVisitorId } from "@/lib/attribution/parse";
import { maybeSampledTenantVisitorPurge } from "@/lib/attribution/sampled-purge";
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

const bodySchema = z.object({
  path: z.string().max(2000).optional(),
});

/**
 * Persist anonymous visitor session from first/last-touch cookies.
 * Does not store PII — identity only attaches on lead form submit.
 * Bots are recorded with is_bot=true and excluded from unique-visitor KPIs.
 */
export async function POST(request: Request) {
  if (
    !isSupabasePublicConfigured() ||
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    if (shouldUseMa5LiveData()) {
      return NextResponse.json(
        { error: "Attribution tracking is not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, persisted: false });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { visitorId, firstTouch, lastTouch } = await readAttributionFromCookies();
  if (!isValidVisitorId(visitorId) || !firstTouch) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const userAgent = request.headers.get("user-agent");
  const isBot = isBotUserAgent(userAgent);

  try {
    const { supabase: admin, ctx } = isMa5DeploymentConfigured()
      ? createMa5TenantServiceClient()
      : { supabase: createServiceClient(), ctx: null };
    const now = new Date().toISOString();
    const path = parsed.data.path?.slice(0, 2000) ?? firstTouch.landingPage;

    let existingQuery = admin
      .from(MA5_TABLES.visitorSessions)
      .select("visitor_id, page_views, is_bot")
      .eq("visitor_id", visitorId);
    if (ctx) existingQuery = existingQuery.eq("tenant_id", ctx.tenantId);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      const patch: Record<string, unknown> = {
        last_seen: now,
        page_views: (existing.page_views ?? 1) + 1,
        user_agent: userAgent?.slice(0, 500) ?? null,
        is_bot: existing.is_bot || isBot,
      };

      if (lastTouch) {
        patch.last_landing_page = lastTouch.landingPage ?? path;
        patch.last_referrer = lastTouch.referrer;
        patch.last_utm_source = lastTouch.utmSource;
        patch.last_utm_medium = lastTouch.utmMedium;
        patch.last_utm_campaign = lastTouch.utmCampaign;
        patch.last_utm_term = lastTouch.utmTerm;
        patch.last_utm_content = lastTouch.utmContent;
      }

      let updateQuery = admin
        .from(MA5_TABLES.visitorSessions)
        .update(patch)
        .eq("visitor_id", visitorId);
      if (ctx) updateQuery = updateQuery.eq("tenant_id", ctx.tenantId);
      await updateQuery;
    } else {
      const base = {
        visitor_id: visitorId,
        first_seen: firstTouch.capturedAt || now,
        last_seen: now,
        landing_page: firstTouch.landingPage ?? path,
        referrer: firstTouch.referrer,
        utm_source: firstTouch.utmSource,
        utm_medium: firstTouch.utmMedium,
        utm_campaign: firstTouch.utmCampaign,
        utm_term: firstTouch.utmTerm,
        utm_content: firstTouch.utmContent,
        last_landing_page: lastTouch?.landingPage ?? path,
        last_referrer: lastTouch?.referrer ?? firstTouch.referrer,
        last_utm_source: lastTouch?.utmSource ?? firstTouch.utmSource,
        last_utm_medium: lastTouch?.utmMedium ?? firstTouch.utmMedium,
        last_utm_campaign: lastTouch?.utmCampaign ?? firstTouch.utmCampaign,
        last_utm_term: lastTouch?.utmTerm ?? firstTouch.utmTerm,
        last_utm_content: lastTouch?.utmContent ?? firstTouch.utmContent,
        page_views: 1,
        is_bot: isBot,
        user_agent: userAgent?.slice(0, 500) ?? null,
      };
      await admin
        .from(MA5_TABLES.visitorSessions)
        .insert(ctx ? withTenantId(ctx, base) : base);
    }

    if (!isBot) {
      maybeSampledTenantVisitorPurge(
        ctx ? { admin, tenantId: ctx.tenantId } : null,
      );
    }

    return NextResponse.json({
      ok: true,
      persisted: true,
      isBot,
    });
  } catch (err) {
    console.error("[api/attribution/visit]", err);
    if (shouldUseMa5LiveData()) {
      return NextResponse.json(
        { error: "Could not persist visit" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, persisted: false });
  }
}
