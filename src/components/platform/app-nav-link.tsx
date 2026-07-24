import Link from "next/link";
import type { ComponentProps } from "react";

import {
  shouldPrefetchAdminNav,
  shouldPrefetchAppNav,
} from "@/components/platform/hub-nav-prefetch";

type HubScope = "admin" | "app";

export type AppNavLinkProps = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  hub: HubScope;
  prefetch?: boolean;
};

export function AppNavLink({
  hub,
  href,
  prefetch,
  ...rest
}: AppNavLinkProps) {
  const path = typeof href === "string" ? href : (href.pathname ?? "");
  const resolvedPrefetch =
    prefetch ??
    (hub === "admin"
      ? shouldPrefetchAdminNav(path)
      : shouldPrefetchAppNav(path));

  return <Link href={href} prefetch={resolvedPrefetch} {...rest} />;
}
