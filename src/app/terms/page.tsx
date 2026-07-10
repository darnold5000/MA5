import type { Metadata } from "next";

import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        title="Terms and Conditions"
        description="The current site uses placeholder terms language. Replace this with a reviewed agreement before launch."
      />
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          By using the {siteConfig.name} website and booking services, you agree
          to follow facility rules, cancellation policies, and any membership
          terms communicated at purchase or booking time.
        </p>
        <p>
          Scheduling and payments may be processed through Mindbody. Questions:
          {" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-foreground hover:text-brand"
          >
            {siteConfig.contact.email}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
