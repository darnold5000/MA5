import {
  defaultCommunityState,
  loadDemoCommunityState,
} from "@/features/community/demo-store";
import type {
  CommunityBoardState,
  CommunityPost,
} from "@/features/community/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type PostRow = {
  id: string;
  author_user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};

export async function loadCommunityBoard(): Promise<CommunityBoardState> {
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (!session || !isSupabaseConfigured()) {
    return loadDemoCommunityState(session?.id ?? "client-alex");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.communityPosts)
      .select("id, author_user_id, body, parent_id, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as PostRow[];
    const authorIds = [...new Set(rows.map((r) => r.author_user_id))];
    const nameMap = new Map<string, string>();

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from(MA5_TABLES.profiles)
        .select("id, full_name")
        .in("id", authorIds);
      for (const p of profiles ?? []) {
        nameMap.set(
          String(p.id),
          (p.full_name as string | null)?.trim() || "Member",
        );
      }
    }

    const byId = new Map<string, CommunityPost>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        authorUserId: row.author_user_id,
        authorName: nameMap.get(row.author_user_id) ?? "Member",
        body: row.body,
        parentId: row.parent_id,
        createdAt: row.created_at,
        isMine: row.author_user_id === session.id,
        replies: [],
      });
    }

    const roots: CommunityPost[] = [];
    for (const post of byId.values()) {
      if (post.parentId && byId.has(post.parentId)) {
        byId.get(post.parentId)!.replies.push(post);
      } else if (!post.parentId) {
        roots.push(post);
      }
    }

    roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const root of roots) {
      root.replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    return { posts: roots };
  } catch (err) {
    console.error("[community] load failed, using demo", err);
    return loadDemoCommunityState(session.id);
  }
}

export function emptyCommunityBoard(): CommunityBoardState {
  return defaultCommunityState();
}
