import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNITY_COOKIE,
  defaultCommunityState,
  parseCommunityState,
  serializeCommunityState,
} from "@/features/community";
import type {
  CommunityBoardState,
  CommunityPost,
} from "@/features/community/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  isMa5DeploymentConfigured,
  requireMa5DeploymentContext,
  withTenantId,
} from "@/lib/tenant/deployment";
import { allowDemoFallbacks } from "@/lib/tenant/runtime-data";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().min(1).nullable().optional(),
});

const deleteSchema = z.object({
  postId: z.string().min(1),
});

function demoResponse(state: CommunityBoardState, body: unknown) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: COMMUNITY_COOKIE,
    value: serializeCommunityState(state),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function removePost(posts: CommunityPost[], postId: string): CommunityPost[] {
  return posts
    .filter((p) => p.id !== postId)
    .map((p) => ({
      ...p,
      replies: removePost(p.replies, postId),
    }));
}

function allowDemoCommunityFallback(): boolean {
  return allowDemoFallbacks() && !isMa5DeploymentConfigured();
}

function isMissingTableError(err: unknown): boolean {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err ?? "");
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /ma5_community_posts/i.test(message) ||
    /does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}

async function postToDemoCookie(input: {
  body: string;
  parentId: string | null;
  authorUserId: string;
  authorName: string;
}) {
  const jar = await import("next/headers").then((m) => m.cookies());
  const cookieStore = await jar;
  const state = parseCommunityState(
    cookieStore.get(COMMUNITY_COOKIE)?.value,
    defaultCommunityState(),
  );

  if (input.parentId) {
    const root = state.posts.find((p) => p.id === input.parentId);
    if (!root) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
  }

  const now = new Date().toISOString();
  const post: CommunityPost = {
    id: `community-${Date.now()}`,
    authorUserId: input.authorUserId,
    authorName: input.authorName,
    body: input.body,
    parentId: input.parentId,
    createdAt: now,
    isMine: true,
    replies: [],
  };

  const next: CommunityBoardState = input.parentId
    ? {
        posts: state.posts.map((p) =>
          p.id === input.parentId
            ? { ...p, replies: [...p.replies, post] }
            : p,
        ),
      }
    : { posts: [post, ...state.posts] };

  return demoResponse(next, { ok: true, postId: post.id, demo: true });
}

export async function GET() {
  const { loadCommunityBoard } = await import("@/features/community");
  const state = await loadCommunityBoard();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  const parentId = parsed.data.parentId ?? null;
  const body = parsed.data.body;

  if (!session) {
    if (!allowDemoCommunityFallback()) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    return postToDemoCookie({
      body,
      parentId,
      authorUserId: "client-alex",
      authorName: "You",
    });
  }

  try {
    const supabase = await createClient();
    const ctx = isMa5DeploymentConfigured()
      ? requireMa5DeploymentContext()
      : null;

    if (parentId) {
      let parentQuery = supabase
        .from(MA5_TABLES.communityPosts)
        .select("id, parent_id")
        .eq("id", parentId);
      if (ctx) {
        parentQuery = parentQuery.eq("tenant_id", ctx.tenantId);
      }
      const { data: parent, error: parentError } = await parentQuery.maybeSingle();
      if (parentError && allowDemoCommunityFallback() && isMissingTableError(parentError)) {
        return postToDemoCookie({
          body,
          parentId,
          authorUserId: session.id,
          authorName: session.profile?.full_name?.trim() || "You",
        });
      }
      if (parentError) {
        console.error("[api/community] parent lookup", parentError);
        return NextResponse.json(
          { error: "Could not post reply", detail: parentError.message },
          { status: 500 },
        );
      }
      if (!parent || parent.parent_id) {
        return NextResponse.json(
          { error: "You can only reply to top-level posts" },
          { status: 400 },
        );
      }
    }

    const baseRow = {
      author_user_id: session.id,
      body,
      ...(parentId ? { parent_id: parentId } : {}),
    };
    const insertRow = ctx ? withTenantId(ctx, baseRow) : baseRow;

    const { data, error } = await supabase
      .from(MA5_TABLES.communityPosts)
      .insert(insertRow)
      .select("id")
      .single();

    if (error) {
      if (allowDemoCommunityFallback() && isMissingTableError(error)) {
        return postToDemoCookie({
          body,
          parentId,
          authorUserId: session.id,
          authorName: session.profile?.full_name?.trim() || "You",
        });
      }
      console.error("[api/community] insert", error);
      return NextResponse.json(
        {
          error: "Could not post message.",
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, postId: data.id });
  } catch (err) {
    console.error("[api/community]", err);
    if (allowDemoCommunityFallback() && isMissingTableError(err)) {
      return postToDemoCookie({
        body,
        parentId,
        authorUserId: session.id,
        authorName: session.profile?.full_name?.trim() || "You",
      });
    }
    return NextResponse.json(
      { error: "Could not post message" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunityState(
      cookieStore.get(COMMUNITY_COOKIE)?.value,
      defaultCommunityState(),
    );
    return demoResponse(
      { posts: removePost(state.posts, parsed.data.postId) },
      { ok: true },
    );
  }

  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const ctx = isMa5DeploymentConfigured()
      ? requireMa5DeploymentContext()
      : null;

    let deleteQuery = supabase
      .from(MA5_TABLES.communityPosts)
      .delete()
      .eq("id", parsed.data.postId);
    if (ctx) {
      deleteQuery = deleteQuery.eq("tenant_id", ctx.tenantId);
    }

    const { error } = await deleteQuery;
    if (error) {
      if (allowDemoCommunityFallback() && isMissingTableError(error)) {
        const jar = await import("next/headers").then((m) => m.cookies());
        const cookieStore = await jar;
        const state = parseCommunityState(
          cookieStore.get(COMMUNITY_COOKIE)?.value,
          defaultCommunityState(),
        );
        return demoResponse(
          { posts: removePost(state.posts, parsed.data.postId) },
          { ok: true, demo: true },
        );
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/community DELETE]", err);
    return NextResponse.json(
      { error: "Could not delete message" },
      { status: 500 },
    );
  }
}
