type StatusBannerProps = {
  tone?: "info" | "warning";
  title: string;
  children: React.ReactNode;
};

export function StatusBanner({
  tone = "info",
  title,
  children,
}: StatusBannerProps) {
  const border =
    tone === "warning"
      ? "border-accent-gold/50 bg-surface"
      : "border-border bg-surface";

  return (
    <div className={`border p-5 ${border}`} role="status">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        {title}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}
