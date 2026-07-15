import type { Metadata } from "next";

import {
  formatMoney,
  formatSessionWhen,
  listPublishedSessions,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Admin schedule",
  robots: { index: false, follow: false },
};

export default async function AdminSchedulePage() {
  const sessions = await listPublishedSessions();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          Schedule
        </h2>
        <p className="mt-2 text-sm text-muted">
          Published sessions visible to clients. Create/edit forms land after
          this demo is approved.
        </p>
      </div>
      <div className="overflow-x-auto border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatSessionWhen(s.startsAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{s.title}</div>
                  <div className="text-xs text-muted">{s.coachName}</div>
                </td>
                <td className="px-4 py-3">
                  {s.bookedCount}/{s.capacity}
                </td>
                <td className="px-4 py-3">
                  {s.priceCents > 0 ? formatMoney(s.priceCents) : "—"}
                </td>
                <td className="px-4 py-3 uppercase">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
