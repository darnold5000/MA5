import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StickyBookButton } from "@/components/shared/sticky-book-button";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <StickyBookButton />
    </>
  );
}
