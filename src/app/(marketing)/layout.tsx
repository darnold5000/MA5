import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AttributionTracker } from "@/components/marketing/attribution-tracker";
import { StickyBookButton } from "@/components/shared/sticky-book-button";
import { resolveHubPortalLink } from "@/lib/auth/hub-access";

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hub = await resolveHubPortalLink();

  return (
    <>
      <AttributionTracker />
      <SiteHeader hubHref={hub.href} />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <StickyBookButton />
    </>
  );
}
