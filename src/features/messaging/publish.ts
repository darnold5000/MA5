import { deliverExternalSafely } from "@/features/messaging/delivery";
import { createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

/** Resolve audience and materialize recipients + in-app notifications. */
export async function publishAnnouncementRecipients(
  supabase: SupabaseLike,
  announcementId: string,
  audienceType: string,
  audienceFilter: Record<string, unknown> | null,
  content: { title: string; body: string },
): Promise<number> {
  let clientIds: string[] = [];

  if (audienceType === "all_active_clients") {
    const { data: roles } = await supabase
      .from(MA5_TABLES.userRoles)
      .select("user_id")
      .eq("role", "client");
    const ids = [...new Set((roles ?? []).map((r) => String(r.user_id)))];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from(MA5_TABLES.profiles)
        .select("id")
        .in("id", ids)
        .eq("active", true);
      clientIds = (profiles ?? []).map((p) => String(p.id));
    }
  } else if (audienceType === "selected_clients") {
    const selected = audienceFilter?.clientIds;
    if (Array.isArray(selected)) {
      clientIds = selected.map(String);
    }
  } else if (audienceType === "team" && audienceFilter?.teamId) {
    const { data: members } = await supabase
      .from(MA5_TABLES.teamMembers)
      .select("user_id")
      .eq("team_id", String(audienceFilter.teamId));
    clientIds = (members ?? []).map((m) => String(m.user_id));
  } else if (audienceType === "program" && audienceFilter?.programId) {
    const { data: assigns } = await supabase
      .from(MA5_TABLES.programAssignments)
      .select("client_user_id")
      .eq("program_id", String(audienceFilter.programId));
    clientIds = [
      ...new Set((assigns ?? []).map((a) => String(a.client_user_id))),
    ];
  }

  const now = new Date().toISOString();
  if (clientIds.length === 0) return 0;

  const rows = clientIds.map((id) => ({
    announcement_id: announcementId,
    client_id: id,
    user_id: id,
    delivered_at: now,
  }));

  const { error } = await supabase
    .from(MA5_TABLES.announcementRecipients)
    .upsert(rows, { onConflict: "announcement_id,client_id" });
  if (error) throw error;

  const notifs = clientIds.map((id) => ({
    user_id: id,
    type: "announcement",
    title: content.title,
    body: content.body.slice(0, 240),
    href: "/app/announcements",
    entity_type: "announcement",
    entity_id: announcementId,
  }));

  await supabase.from(MA5_TABLES.notifications).insert(notifs);

  const { data: prefs } = await supabase
    .from(MA5_TABLES.profiles)
    .select("id, email, notify_coach_messages")
    .in("id", clientIds);

  for (const p of prefs ?? []) {
    void deliverExternalSafely({
      userId: String(p.id),
      email: p.email as string | undefined,
      title: content.title,
      body: content.body.slice(0, 240),
      actionUrl: "/app/announcements",
      allowExternal: Boolean(p.notify_coach_messages ?? true),
    });
  }

  return clientIds.length;
}
