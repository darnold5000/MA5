import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Programs · Operations",
  robots: { index: false, follow: false },
};

export default function AdminProgramsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Programs
        </h1>
        <p className="mt-2 text-sm text-muted">
          Assign and track training programs. Full program builder ships on the
          MA5 programs demo branch.
        </p>
      </div>
      <div className="border border-border bg-surface p-5">
        <p className="font-display text-xl tracking-wide uppercase">
          MA5 Foundations
        </p>
        <p className="mt-2 text-sm text-muted">12 active assignments · demo</p>
        <Link
          href="/app/programs"
          className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Preview client view →
        </Link>
      </div>
    </div>
  );
}
