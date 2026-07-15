import type { Metadata } from "next";

import { formatMoney, listProducts } from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Admin products",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  const products = await listProducts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          Products & memberships
        </h2>
        <p className="mt-2 text-sm text-muted">
          Sourced from the verified Mindbody pricing catalog in{" "}
          <code>src/content/pricing.ts</code>.
        </p>
      </div>
      <div className="overflow-x-auto border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Billing</th>
              <th className="px-4 py-3">Stripe price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted">{p.slug}</div>
                </td>
                <td className="px-4 py-3 uppercase">{p.productType}</td>
                <td className="px-4 py-3">{formatMoney(p.priceCents)}</td>
                <td className="px-4 py-3">{p.billingInterval ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.stripePriceConfigured ? "Configured" : "Missing env"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
