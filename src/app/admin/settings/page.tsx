import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings · Operations",
  robots: { index: false, follow: false },
};

const LINKS = [
  {
    href: "/admin/products",
    title: "Products & pricing",
    body: "Memberships and session products.",
  },
  {
    href: "/admin/bookings",
    title: "Check-in roster",
    body: "Walk-ins and session attendance.",
  },
  {
    href: "/admin/schedule",
    title: "Schedule tools",
    body: "Publish and edit sessions.",
  },
  {
    href: "/admin/programs/library",
    title: "Library",
    body: "Programs, sessions, and exercises — create, edit, delete.",
  },
] as const;

const LATER = [
  {
    title: "Analytics",
    body: "Business health and AI insights — hidden from nav until ready.",
  },
] as const;

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Facility tools that don’t need a top-level nav item yet.
        </p>
      </div>

      <div className="divide-y divide-border border border-border bg-surface">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-5 py-4 transition hover:bg-background"
          >
            <p className="font-display text-lg tracking-wide uppercase">
              {item.title}
            </p>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </Link>
        ))}
      </div>

      <section className="border border-border bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Coming later
        </p>
        <ul className="mt-4 space-y-3">
          {LATER.map((item) => (
            <li key={item.title}>
              <p className="text-sm text-foreground">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
