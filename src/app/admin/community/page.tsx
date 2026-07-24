import type { Metadata } from "next";

import { CommunityBoard } from "@/components/community/community-board";
import { loadCommunityBoard } from "@/features/community";
import { HUB_COMMUNITY_BOARD_TITLE } from "@/features/community/hub-copy";

export const metadata: Metadata = {
  title: `${HUB_COMMUNITY_BOARD_TITLE} · Admin`,
  robots: { index: false, follow: false },
};

export default async function AdminCommunityPage() {
  const state = await loadCommunityBoard();

  return (
    <CommunityBoard
      posts={state.posts}
      canDelete
      title={HUB_COMMUNITY_BOARD_TITLE}
    />
  );
}
