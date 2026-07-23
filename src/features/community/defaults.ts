import type { CommunityBoardState } from "@/features/community/types";

export function defaultCommunityState(): CommunityBoardState {
  return { posts: [] };
}
