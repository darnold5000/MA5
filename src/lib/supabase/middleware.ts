import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { canAccessAdmin, type PlatformRole } from "@/lib/permissions/roles";
import { MA5_TABLES } from "@/lib/supabase/tables";

/**
 * Refresh the Auth session on (almost) every navigation so clients stay signed
 * in until they explicitly sign out. Redirects only apply to /app and /admin.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let user: { id: string } | null = null;
  let roles: PlatformRole[] = [];

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
            }),
          );
        },
      },
    });

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      const { data: roleRows } = await supabase
        .from(MA5_TABLES.userRoles)
        .select("role")
        .eq("user_id", user.id);
      roles = (roleRows ?? [])
        .map((r) => r.role as PlatformRole)
        .filter(Boolean);
      if (roles.length === 0) roles = ["client"];
    }
  }

  const pathname = request.nextUrl.pathname;
  const isAppRoute = pathname.startsWith("/app");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (isAppRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const nextTarget = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "";
      const nextTarget = `${pathname}${request.nextUrl.search}`;
      redirectUrl.searchParams.set("next", nextTarget);
      return NextResponse.redirect(redirectUrl);
    }
    if (!canAccessAdmin(roles)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isAuthRoute && user) {
    const next = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      const dest = new URL(next, request.nextUrl.origin);
      redirectUrl.pathname = dest.pathname;
      redirectUrl.search = dest.search;
    } else if (canAccessAdmin(roles)) {
      redirectUrl.pathname = "/admin";
      redirectUrl.search = "";
    } else {
      redirectUrl.pathname = "/app";
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
