import type { Metadata } from "next";

import { AdminClientsManager } from "@/components/admin/clients-manager";
import { CoachTrainingProgress } from "@/components/programs/coach-training-progress";
import { listDirectoryMembers } from "@/features/auth/members";
import { listCoachClientProgress } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Clients · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const params = await searchParams;
  const showDeleted = params.deleted === "1";
  const [members, progressRows] = await Promise.all([
    listDirectoryMembers({ includeDeleted: showDeleted }),
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Directory
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
              {showDeleted ? "Deleted clients" : "Invitations & access"}
            </h2>
          </div>
          <a
            href={showDeleted ? "/admin/clients" : "/admin/clients?deleted=1"}
            className="text-sm font-medium underline underline-offset-2"
          >
            {showDeleted ? "Back to active directory" : "View deleted clients"}
          </a>
        </div>
        <AdminClientsManager members={members} showDeleted={showDeleted} />
      </section>
    </div>
  );
}
