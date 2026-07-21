import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNITY_COOKIE,
  defaultCommunityState,
  parseCommunityState,
  serializeCommunityState,
} from "@/features/community";
import type { CommunityBoardState, CommunityPost } from "@/features/community/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

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

function removePost(
  posts: CommunityPost[],
  postId: string,
): CommunityPost[] {
  return posts
    .filter((p) => p.id !== postId)
    .map((p) => ({
      ...p,
      replies: removePost(p.replies, postId),
    }));
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
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunityState(
      cookieStore.get(COMMUNITY_COOKIE)?.value,
      defaultCommunityState(),
    );

    if (parentId) {
      const root = state.posts.find((p) => p.id === parentId);
      if (!root) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }

    const now = new Date().toISOString();
    const post: CommunityPost = {
      id: `community-${Date.now()}`,
      authorUserId: "client-alex",
      authorName: "You",
      body,
      parentId,
      createdAt: now,
      isMine: true,
      replies: [],
    };

    let next: CommunityBoardState;
    if (parentId) {
      next = {
        posts: state.posts.map((p) =>
          p.id === parentId ? { ...p, replies: [...p.replies, post] } : p,
        ),
      };
    } else {
      next = { posts: [post, ...state.posts] };
    }
    return demoResponse(next, { ok: true, postId: post.id });
  }

  try {
    const supabase = await createClient();

    if (parentId) {
      const { data: parent } = await supabase
        .from(MA5_TABLES.communityPosts)
        .select("id, parent_id")
        .eq("id", parentId)
        .maybeSingle();
      if (!parent || parent.parent_id) {
        return NextResponse.json(
          { error: "You can only reply to top-level posts" },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .from(MA5_TABLES.communityPosts)
      .insert({
        author_user_id: session.id,
        body,
        parent_id: parentId,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, postId: data.id });
  } catch (err) {
    console.error("[api/community]", err);
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
    const next = {
      posts: removePost(state.posts, parsed.data.postId),
    };
    return demoResponse(next, { ok: true });
  }

  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(MA5_TABLES.communityPosts)
      .delete()
      .eq("id", parsed.data.postId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/community DELETE]", err);
    return NextResponse.json(
      { error: "Could not delete message" },
      { status: 500 },
    );
  }
}
