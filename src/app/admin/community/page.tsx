import type { Metadata } from "next";

import { CommunityBoard } from "@/components/community/community-board";
import { loadCommunityBoard } from "@/features/community";

export const metadata: Metadata = {
  title: "Community · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCommunityPage() {
  const state = await loadCommunityBoard();

  return (
    <CommunityBoard
      posts={state.posts}
      canDelete
      title="Community board"
      description="Members can leave messages and replies here. Use the trash icon to remove anything that shouldn’t stay."
    />
  );
}
