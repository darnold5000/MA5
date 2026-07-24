import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CommunityBoard } from "@/components/community/community-board";
import { loadCommunityBoard } from "@/features/community";
import { HUB_COMMUNITY_BOARD_TITLE } from "@/features/community/hub-copy";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${HUB_COMMUNITY_BOARD_TITLE} · MA5`,
  robots: { index: false, follow: false },
};

export default async function ClientCommunityPage() {
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (isSupabasePublicConfigured() && isSupabaseConfigured() && !session) {
    redirect("/login?next=/app/community");
  }

  const state = await loadCommunityBoard();

  return (
    <CommunityBoard
      posts={state.posts}
      canDelete={false}
      title={HUB_COMMUNITY_BOARD_TITLE}
    />
  );
}
