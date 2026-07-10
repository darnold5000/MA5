"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { BookingFallback } from "@/components/booking/booking-fallback";
import { trackEvent } from "@/lib/analytics";

type MindbodyWidgetProps = {
  /**
   * Official Mindbody script URL from the generated embed code.
   * Leave undefined until MA5 supplies Branded Web Tools markup.
   */
  scriptSrc?: string;
  /**
   * Exact widget element markup from Mindbody Branded Web Manager.
   * Never accept arbitrary HTML from end users.
   */
  widgetMarkup?: string;
  serviceLabel: string;
};

export function MindbodyWidget({
  scriptSrc,
  widgetMarkup,
  serviceLabel,
}: MindbodyWidgetProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    trackEvent("booking_widget_view", { service: serviceLabel });

    if (!scriptSrc || !widgetMarkup) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHasTimedOut(true);
      trackEvent("booking_widget_timeout", { service: serviceLabel });
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [scriptSrc, widgetMarkup, serviceLabel]);

  const showFallback = !scriptSrc || !widgetMarkup || hasTimedOut || scriptFailed;

  return (
    <section aria-labelledby="booking-heading" className="space-y-6">
      <div>
        <h1
          id="booking-heading"
          className="font-display text-4xl tracking-wide uppercase sm:text-5xl"
        >
          Book with MA5 Performance
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Choose your service and available time. Scheduling is powered by
          Mindbody so your account, purchases, and bookings stay in sync.
        </p>
      </div>

      {scriptSrc ? (
        <Script
          src={scriptSrc}
          strategy="afterInteractive"
          onError={() => {
            setScriptFailed(true);
            trackEvent("booking_widget_error", { service: serviceLabel });
          }}
          onLoad={() => {
            trackEvent("booking_widget_loaded", { service: serviceLabel });
          }}
        />
      ) : null}

      <div
        id="mindbody-widget-container"
        className="min-h-[28rem] border border-border bg-surface p-4"
      >
        {widgetMarkup ? (
          <div
            // TODO: Replace with exact official Mindbody widget markup once provided.
            // Sanitize or hardcode only trusted embed HTML from Mindbody.
            dangerouslySetInnerHTML={{ __html: widgetMarkup }}
          />
        ) : (
          <div className="flex h-full min-h-[26rem] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="font-display text-2xl tracking-wide uppercase">
              Booking calendar coming soon
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              {/* TODO: Insert official Mindbody Branded Web Tools embed code. */}
              The live Mindbody widget will load here after MA5 provides the
              official Branded Web Tools embed script and markup. Until then,
              use the secure booking fallback below.
            </p>
          </div>
        )}
      </div>

      {showFallback ? <BookingFallback /> : null}
    </section>
  );
}
