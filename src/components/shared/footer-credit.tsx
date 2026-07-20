import Image from "next/image";

type CreditVariant = "by" | "designed-and-maintained";

type FooterCreditProps = {
  clientName: string;
  signalWorksUrl?: string;
  signalWorksIconSrc?: string;
  /**
   * "by" → Website by Signal Works
   * "designed-and-maintained" → Website designed & maintained by Signal Works
   */
  variant?: CreditVariant;
  className?: string;
};

const DEFAULT_SIGNAL_WORKS_URL = "https://hiresignalworks.com";
const DEFAULT_SIGNAL_WORKS_ICON = "/signal-works-icon.png";

const creditPrefix: Record<CreditVariant, string> = {
  by: "Website by",
  "designed-and-maintained": "Website designed & maintained by",
};

export function FooterCredit({
  clientName,
  signalWorksUrl = DEFAULT_SIGNAL_WORKS_URL,
  signalWorksIconSrc = DEFAULT_SIGNAL_WORKS_ICON,
  variant = "by",
  className,
}: FooterCreditProps) {
  return (
    <div className={className ?? "flex flex-wrap items-center justify-end gap-2.5"}>
      <span className="sr-only">{clientName} website. </span>
      <span className="text-sm leading-snug text-muted">
        {creditPrefix[variant]}
      </span>
      <a
        href={signalWorksUrl}
        target="_blank"
        rel="noreferrer"
        title="Professional websites, software & AI solutions."
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 transition-colors hover:border-foreground/20 hover:bg-surface"
      >
        <Image
          src={signalWorksIconSrc}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded-md"
        />
        <span className="text-sm font-semibold text-foreground">Signal Works</span>
      </a>
    </div>
  );
}
