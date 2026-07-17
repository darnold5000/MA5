import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_PERSONA_COOKIE } from "@/content/demo-persona";
import {
  canAccessAdmin,
  PLATFORM_ROLES,
  type PlatformRole,
} from "@/lib/permissions/roles";
import { MA5_TABLES } from "@/lib/supabase/tables";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional().nullable(),
});

function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

/**
 * Server-side password login so Auth uses runtime env on Vercel Preview.
 * Browser sign-in only works when NEXT_PUBLIC_* were present at build time.
 */
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.",
      },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const pendingCookies: {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const userId = signIn.user?.id;
  let roles: PlatformRole[] = ["client"];
  if (userId) {
    const { data: roleRows } = await supabase
      .from(MA5_TABLES.userRoles)
      .select("role")
      .eq("user_id", userId);
    const parsedRoles = (roleRows ?? [])
      .map((r) => r.role as string)
      .filter(isPlatformRole);
    if (parsedRoles.length > 0) roles = parsedRoles;
  }

  const next = parsed.data.next;
  let redirectTo = "/app";
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirectTo = next;
  } else if (canAccessAdmin(roles)) {
    redirectTo = "/admin";
  }

  const response = NextResponse.json({ ok: true, redirectTo, roles });
  for (const c of pendingCookies) {
    response.cookies.set(c.name, c.value, c.options);
  }
  // Clear any leftover demo persona cookie.
  response.cookies.set(DEMO_PERSONA_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
