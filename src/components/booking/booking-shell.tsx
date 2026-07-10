import Link from "next/link";

import { bookingFaqs } from "@/content/faqs";
import { bookingOptions } from "@/content/booking";
import { cn } from "@/lib/utils";

type BookingShellProps = {
  children: React.ReactNode;
  activeQuery: string;
};

export function BookingShell({ children, activeQuery }: BookingShellProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap gap-2">
        {bookingOptions.map((option) => {
          const href = `/book?type=${option.query}`;
          const isActive = option.query === activeQuery;

          return (
            <Link
              key={option.query}
              href={href}
              className={cn(
                "inline-flex min-h-11 items-center border px-4 text-xs font-semibold tracking-wide uppercase transition",
                isActive
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border text-muted hover:border-brand hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <div className="border border-border bg-surface p-6">
            <h2 className="font-display text-2xl tracking-wide uppercase">
              Before you book
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              <li>New clients usually start with a fitness assessment.</li>
              <li>Existing Mindbody accounts work here.</li>
              <li>If the calendar stalls, use the fallback booking link.</li>
              {/* TODO: Confirm cancellation policy wording with MA5. */}
              <li>Review cancellation details before confirming your session.</li>
            </ul>
          </div>

          <div className="border border-border bg-surface p-6">
            <h2 className="font-display text-2xl tracking-wide uppercase">
              Booking FAQ
            </h2>
            <dl className="mt-4 space-y-4">
              {bookingFaqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-sm font-semibold text-foreground">
                    {faq.question}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
