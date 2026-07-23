import type { Metadata } from "next";

import { AdminClientsManager } from "@/components/admin/clients-manager";
import { CoachTrainingProgress } from "@/components/programs/coach-training-progress";
import { listDirectoryMembers } from "@/features/auth/members";
import { listCoachClientProgress } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Clients · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminClientsPage() {
  const [members, progressRows] = await Promise.all([
    listDirectoryMembers(),
    listCoachClientProgress(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Clients
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Member directory
        </h1>
        <p className="mt-2 text-sm text-muted">
          Invite members by email, track invitation status, and manage platform
          access. New accounts are invitation-only.
        </p>
      </div>

      <CoachTrainingProgress rows={progressRows} />

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Directory
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
            Invitations & access
          </h2>
        </div>
        <AdminClientsManager members={members} />
      </section>
    </div>
  );
}
