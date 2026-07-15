import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Programs",
  robots: { index: false, follow: false },
};

export default function ProgramsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Programs
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Your training plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Assigned programs and workout progress live here for members.
        </p>
      </div>
      <section className="border border-border bg-surface p-6">
        <h2 className="font-display text-2xl tracking-wide uppercase">
          MA5 Foundations
        </h2>
        <p className="mt-2 text-sm text-muted">62% complete · next workout Thursday</p>
        <div className="mt-4 h-2 w-full max-w-md bg-background">
          <div className="h-2 w-[62%] bg-brand" />
        </div>
        <Link
          href="/app/schedule"
          className="mt-6 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          Book supporting session
        </Link>
      </section>
    </div>
  );
}
