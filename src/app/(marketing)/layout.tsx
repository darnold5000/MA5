import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StickyBookButton } from "@/components/shared/sticky-book-button";
import { hasFitnessHubAccess } from "@/lib/auth/hub-access";

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hubAccess = await hasFitnessHubAccess();

  return (
    <>
      <SiteHeader hubAccess={hubAccess} />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <StickyBookButton />
    </>
  );
}
