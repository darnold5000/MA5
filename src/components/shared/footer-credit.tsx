type CreditVariant = "by" | "designed-and-maintained";

type FooterCreditProps = {
  clientName: string;
  signalWorksUrl?: string;
  /**
   * "by" → Website by Signal Works
   * "designed-and-maintained" → Website designed & maintained by Signal Works
   */
  variant?: CreditVariant;
  className?: string;
};

const DEFAULT_SIGNAL_WORKS_URL = "https://hiresignalworks.com";

const creditPrefix: Record<CreditVariant, string> = {
  by: "Website by",
  "designed-and-maintained": "Website designed & maintained by",
};

export function FooterCredit({
  clientName,
  signalWorksUrl = DEFAULT_SIGNAL_WORKS_URL,
  variant = "by",
  className,
}: FooterCreditProps) {
  return (
    <p
      className={
        className ??
        "text-[11px] leading-relaxed text-muted/80"
      }
    >
      <span className="sr-only">{clientName} website. </span>
      {creditPrefix[variant]}{" "}
      <a
        href={signalWorksUrl}
        target="_blank"
        rel="noreferrer"
        title="Professional websites, software & AI solutions."
        className="underline-offset-2 transition-colors duration-200 hover:text-foreground hover:underline hover:opacity-100"
      >
        Signal Works
      </a>
    </p>
  );
}
