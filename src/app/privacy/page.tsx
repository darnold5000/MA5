import type { Metadata } from "next";

import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        title="Privacy Policy"
        description="The current MA5 website lists privacy policy content as coming soon. This page will be replaced with a reviewed policy before launch."
      />
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          {siteConfig.name} uses Mindbody to power scheduling, account creation,
          purchases, and bookings. When you book through this website, your
          information may be processed by Mindbody according to their policies.
        </p>
        <p>
          Contact{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-foreground hover:text-brand"
          >
            {siteConfig.contact.email}
          </a>{" "}
          with privacy questions.
        </p>
      </div>
    </div>
  );
}
