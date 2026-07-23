import { cookies } from "next/headers";

import { defaultCommunityState as emptyCommunityState } from "@/features/community/defaults";
import type { CommunityBoardState, CommunityPost } from "@/features/community/types";
import { allowDemoFallbacks } from "@/lib/tenant/runtime-data";

export const COMMUNITY_COOKIE = "ma5_community_v1";

export function buildDemoCommunityState(): CommunityBoardState {
  const now = Date.now();
  const rootId = "community-post-1";
  return {
    posts: [
      {
        id: rootId,
        authorUserId: "coach-robert",
        authorName: "Robert Anderson",
        body: "Welcome to the MA5 community board — leave a shout-out, ask a question, or cheer on a teammate.",
        parentId: null,
        createdAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
        isMine: false,
        replies: [
          {
            id: "community-reply-1",
            authorUserId: "client-alex",
            authorName: "Alex Rivera",
            body: "Excited to be here. Crushing week 1!",
            parentId: rootId,
            createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
            isMine: false,
            replies: [],
          },
        ],
      },
    ],
  };
}

export function serializeCommunityState(state: CommunityBoardState): string {
  return encodeURIComponent(JSON.stringify(state));
}

export function parseCommunityState(
  raw: string | undefined,
  fallback: CommunityBoardState,
): CommunityBoardState {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CommunityBoardState;
    if (!parsed || !Array.isArray(parsed.posts)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export async function loadDemoCommunityState(
  viewerId?: string | null,
): Promise<CommunityBoardState> {
  if (!allowDemoFallbacks()) return emptyCommunityState();
  const jar = await cookies();
  const state = parseCommunityState(
    jar.get(COMMUNITY_COOKIE)?.value,
    buildDemoCommunityState(),
  );
  return markMine(state, viewerId ?? null);
}

function markMine(
  state: CommunityBoardState,
  viewerId: string | null,
): CommunityBoardState {
  const mapPost = (post: CommunityPost): CommunityPost => ({
    ...post,
    isMine: Boolean(viewerId) && post.authorUserId === viewerId,
    replies: post.replies.map(mapPost),
  });
  return { posts: state.posts.map(mapPost) };
}
