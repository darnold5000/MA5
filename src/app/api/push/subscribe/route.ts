import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (!session) {
    return NextResponse.json(
      { error: "Sign in required to enable push notifications" },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from(MA5_TABLES.pushSubscriptions).upsert(
      {
        user_id: session.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent:
          request.headers.get("user-agent")?.slice(0, 500) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/push/subscribe]", err);
    return NextResponse.json(
      {
        error: "Could not save subscription",
        hint: "Apply migration 008_push_subscriptions.sql",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const endpoint =
    json && typeof json === "object" && "endpoint" in json
      ? String((json as { endpoint: string }).endpoint)
      : null;

  try {
    const supabase = await createClient();
    let query = supabase
      .from(MA5_TABLES.pushSubscriptions)
      .delete()
      .eq("user_id", session.id);
    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/push/subscribe DELETE]", err);
    return NextResponse.json({ error: "Could not remove subscription" }, { status: 500 });
  }
}
