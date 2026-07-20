import type { MembershipSummary } from "@/lib/billing/membership-summary";
import { siteConfig } from "@/content/site-config";

export function MembershipSection({
  membership,
}: {
  membership: MembershipSummary;
}) {
  const rows = [
    { label: "Current membership", value: membership.planName },
    { label: "Status", value: membership.status },
    { label: "Billing frequency", value: membership.billingFrequency ?? "—" },
    { label: "Next billing date", value: membership.nextBillingDate ?? "—" },
    {
      label: "Membership start date",
      value: membership.membershipStartDate ?? "—",
    },
    { label: "Last payment", value: membership.lastPaymentAmount ?? "—" },
    { label: "Last payment date", value: membership.lastPaymentDate ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-l-2 border-brand pl-4 text-sm leading-relaxed text-muted">
        Need to make changes to your membership? Please contact MA5 at{" "}
        <a
          href={`mailto:${siteConfig.contact.email}?subject=Membership%20change%20request`}
          className="text-brand hover:underline"
        >
          {siteConfig.contact.email}
        </a>{" "}
        and we&apos;ll be happy to assist you.
      </p>
    </div>
  );
}
