import type { Metadata } from "next";

import { AdminClientsManager } from "@/components/admin/clients-manager";
import { readOpsState } from "@/features/admin/ops-store";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

export default async function AdminClientsPage() {
  const ops = await readOpsState();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Clients
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Member directory
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add clients, deactivate accounts, and keep contact notes for the front
          desk.
        </p>
      </div>
      <AdminClientsManager clients={ops.clients} />
    </div>
  );
}
