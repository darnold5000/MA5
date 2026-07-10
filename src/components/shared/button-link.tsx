import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-foreground hover:brightness-110 active:brightness-95",
  secondary:
    "border border-border bg-transparent text-foreground hover:border-brand hover:text-brand",
  ghost: "bg-transparent text-foreground hover:text-brand",
};

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
};

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  onClick,
}: ButtonLinkProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm font-semibold tracking-wide uppercase transition",
    variantClasses[variant],
    className,
  );

  if (isExternalHref(href)) {
    const externalProps =
      href.startsWith("http")
        ? { target: "_blank" as const, rel: "noreferrer" }
        : {};

    return (
      <a href={href} onClick={onClick} className={classes} {...externalProps}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={classes}>
      {children}
    </Link>
  );
}
