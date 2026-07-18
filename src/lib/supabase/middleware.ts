import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { canAccessAdmin, type PlatformRole } from "@/lib/permissions/roles";
import { MA5_TABLES } from "@/lib/supabase/tables";

type AccessState = "active" | "pending_invite" | "disabled";

function resolveAccessState(profile: {
  active: boolean;
  invitation_status?: string | null;
  access_revoked_at?: string | null;
} | null): AccessState {
  if (!profile) return "active";
  if (
    profile.invitation_status === "revoked" ||
    Boolean(profile.access_revoked_at)
  ) {
    return "disabled";
  }
  if (
    profile.invitation_status === "sent" ||
    profile.invitation_status === "pending"
  ) {
    return "pending_invite";
  }
  if (profile.active === false) return "disabled";
  return "active";
}

/**
 * Refresh the Auth session on (almost) every navigation so clients stay signed
 * in until they explicitly sign out. Redirects apply to /app and /admin.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  let user: { id: string } | null = null;
  let roles: PlatformRole[] = [];
  let access: AccessState = "active";

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
          .select("active, invitation_status, access_revoked_at")
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
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
