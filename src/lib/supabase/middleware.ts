import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DEMO_PERSONA_COOKIE, isDemoPersona } from "@/content/demo-persona";

/**
 * Refresh the Auth session on (almost) every navigation so clients stay signed
 * in until they explicitly sign out. Redirects only apply to /app and /admin.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const demoPersonaRaw = request.cookies.get(DEMO_PERSONA_COOKIE)?.value;
  const demoPersona = isDemoPersona(demoPersonaRaw) ? demoPersonaRaw : null;
  const hasDemoAccess = Boolean(demoPersona);
  const hasDemoStaffAccess = demoPersona === "staff";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let user: { id: string } | null = null;

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

    // Touches / refreshes the session cookie on every matched request.
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  }

  const pathname = request.nextUrl.pathname;
  const isAppRoute = pathname.startsWith("/app");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  if (isAppRoute && !user && !hasDemoAccess) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const nextTarget = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute && !user && !hasDemoStaffAccess) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const nextTarget = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    const next = request.nextUrl.searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      const dest = new URL(next, request.nextUrl.origin);
      redirectUrl.pathname = dest.pathname;
      redirectUrl.search = dest.search;
    } else {
      redirectUrl.pathname = "/app";
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
