import type { MemberAttribution } from "@/features/marketing/types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value?.trim() || "—"}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function MemberAttributionSection({
  attribution,
}: {
  attribution: MemberAttribution | null;
}) {
  if (!attribution) return null;

  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        Marketing attribution
      </p>
      <p className="mt-2 text-sm text-muted">
        Where you originally found MA5 — recorded when you reached out. Read-only.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Original source" value={attribution.originalSource} />
        <Field label="Original medium" value={attribution.originalMedium} />
        <Field label="Original campaign" value={attribution.originalCampaign} />
        <Field label="Lead date" value={formatDate(attribution.leadDate)} />
        <div className="sm:col-span-2">
          <Field label="Landing page" value={attribution.landingPage} />
        </div>
      </div>
    </section>
  );
}
