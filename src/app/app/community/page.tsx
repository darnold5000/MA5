import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CommunityBoard } from "@/components/community/community-board";
import { loadCommunityBoard } from "@/features/community";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Community · MA5",
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
      title="Community"
      description="Leave a message for coaches and teammates — reply to keep the conversation going."
    />
  );
}
