import { env } from "@/lib/env";
import { siteConfig } from "@/content/site-config";

type BookingFallbackProps = {
  directBookingUrl?: string;
  phone?: string;
  email?: string;
};

export function BookingFallback({
  directBookingUrl = env.mindbodyBookingUrl,
  phone = siteConfig.contact.phone,
  email = siteConfig.contact.email,
}: BookingFallbackProps) {
  return (
    <div
      role="status"
      className="border border-border bg-surface p-6"
    >
      <h2 className="font-display text-2xl tracking-wide uppercase">
        Need help booking?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Having trouble loading the schedule? Open the secure MA5 booking page or
        contact us and we will help you schedule your session.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={directBookingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          Open booking page
        </a>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex min-h-11 items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Call MA5
          </a>
        ) : null}
        <a
          href={`mailto:${email}`}
          className="inline-flex min-h-11 items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Email MA5
        </a>
      </div>
    </div>
  );
}
