import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolveAccessState, resolveClientStatus, type AccessState } from "@/lib/auth/access";
import { applyAttributionCookies } from "@/lib/attribution/middleware";
import { canAccessAdmin, type PlatformRole } from "@/lib/permissions/roles";
import { MA5_TABLES } from "@/lib/supabase/tables";

function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/stripe/status" ||
    pathname.startsWith("/api/leads") ||
    pathname.startsWith("/api/attribution/")
  );
}

/**
 * Refresh the Auth session on (almost) every navigation so clients stay signed
 * in until they explicitly sign out. Redirects apply to /app and /admin.
 * Inactive / pending-invite sessions are also blocked on protected APIs.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let user: { id: string } | null = null;
  let roles: PlatformRole[] = [];
  let access: AccessState = "active";
  let clientStatus = "active" as string;

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
      const [{ data: roleRows }, profileResult] = await Promise.all([
        supabase
          .from(MA5_TABLES.userRoles)
          .select("role")
          .eq("user_id", user.id),
        supabase
          .from(MA5_TABLES.profiles)
          .select("active, invitation_status, access_revoked_at, client_status, deleted_at, invitation_accepted_at")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      roles = (roleRows ?? [])
        .map((r) => r.role as PlatformRole)
        .filter(Boolean);
      if (roles.length === 0) roles = ["client"];

      if (profileResult.error) {
        const { data: basic } = await supabase
          .from(MA5_TABLES.profiles)
          .select("active")
          .eq("id", user.id)
          .maybeSingle();
        access = basic?.active === false ? "disabled" : "active";
      } else {
        access = resolveAccessState(profileResult.data);
        clientStatus = resolveClientStatus(profileResult.data);
      }
    }
  }

  const pathname = request.nextUrl.pathname;
  const isAppRoute = pathname.startsWith("/app");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isAcceptInvite = pathname.startsWith("/auth/accept-invite");
  const isAccessDisabled = pathname.startsWith("/access-disabled");

  // Server-side API guard: revoked / pending sessions cannot call protected APIs
  // even if they still hold a valid Auth cookie.
  if (
    pathname.startsWith("/api/") &&
    user &&
    access !== "active" &&
    !isPublicApiPath(pathname)
  ) {
    return NextResponse.json(
      {
        error:
          access === "pending_invite"
            ? "Complete your invitation before using the platform"
            : "Your access has been disabled",
        code: access === "pending_invite" ? "pending_invite" : "access_disabled",
      },
      { status: 403 },
    );
  }

  if ((isAppRoute || isAdminRoute) && user) {
    if (access === "pending_invite") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/accept-invite";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
    if (access === "disabled") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/access-disabled";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("status", clientStatus);
      return NextResponse.redirect(redirectUrl);
    }
  }

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

  if (isAuthRoute && user && access === "active") {
    const next = request.nextUrl.searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    const redirectUrl = request.nextUrl.clone();
    if (canAccessAdmin(roles)) {
      // Don't trap staff on /app when they used the public Sign in CTA.
      if (
        safeNext &&
        safeNext !== "/app" &&
        !safeNext.startsWith("/app/")
      ) {
        const dest = new URL(safeNext, request.nextUrl.origin);
        redirectUrl.pathname = dest.pathname;
        redirectUrl.search = dest.search;
      } else {
        redirectUrl.pathname = "/admin";
        redirectUrl.search = "";
      }
    } else if (safeNext) {
      const dest = new URL(safeNext, request.nextUrl.origin);
      redirectUrl.pathname = dest.pathname;
      redirectUrl.search = dest.search;
    } else {
      redirectUrl.pathname = "/app";
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user && access === "pending_invite" && !isAcceptInvite) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/accept-invite";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user && access === "disabled" && !isAccessDisabled) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/access-disabled";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("status", clientStatus);
    return NextResponse.redirect(redirectUrl);
  }

  return applyAttributionCookies(request, supabaseResponse);
}
