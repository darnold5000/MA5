import type { Metadata } from "next";

import { OfferingsManager } from "@/components/admin/offerings-manager";
import { listOfferings } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Offerings · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminOfferingsPage() {
  let offerings: Awaited<ReturnType<typeof listOfferings>> = [];
  if (isSupabaseConfigured()) {
    try {
      offerings = await listOfferings({
        includeArchived: true,
        useServiceRole: true,
      });
    } catch {
      offerings = [];
    }
  }

  return (
    <OfferingsManager
      key={offerings.map((o) => `${o.id}:${o.updatedAt}`).join("|")}
      initialOfferings={offerings}
    />
  );
}
