"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Offering, OfferingStatus, PaymentType, ProductType } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type FormState = {
  name: string;
  slug: string;
  description: string;
  productType: ProductType;
  category: string;
  paymentType: PaymentType;
  priceDollars: string;
  billingInterval: "month" | "one_time";
  sessionCredits: string;
  status: OfferingStatus;
  displayOrder: string;
};

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  description: "",
  productType: "membership",
  category: "small_group",
  paymentType: "subscription",
  priceDollars: "",
  billingInterval: "month",
  sessionCredits: "",
  status: "active",
  displayOrder: "0",
});

function offeringToForm(o: Offering): FormState {
  return {
    name: o.name,
    slug: o.slug,
    description: o.description ?? "",
    productType: o.productType,
    category: o.category ?? "",
    paymentType: o.paymentType,
    priceDollars: (o.priceCents / 100).toFixed(o.priceCents % 100 === 0 ? 0 : 2),
    billingInterval: o.billingInterval === "one_time" ? "one_time" : "month",
    sessionCredits:
      o.sessionCredits === null || o.sessionCredits === undefined
        ? ""
        : String(o.sessionCredits),
    status: o.status,
    displayOrder: String(o.displayOrder),
  };
}

function formToPayload(form: FormState) {
  const dollars = Number.parseFloat(form.priceDollars);
  if (Number.isNaN(dollars) || dollars < 0) {
    throw new Error("Enter a valid price");
  }
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || null,
    productType: form.productType,
    category: form.category.trim() || null,
    paymentType: form.paymentType,
    priceCents: Math.round(dollars * 100),
    billingInterval:
      form.paymentType === "one_time" ? ("one_time" as const) : form.billingInterval,
    sessionCredits: form.sessionCredits.trim()
      ? Number.parseInt(form.sessionCredits, 10)
      : null,
    status: form.status,
    displayOrder: Number.parseInt(form.displayOrder || "0", 10) || 0,
  };
}

export function OfferingsManager({
  initialOfferings,
}: {
  initialOfferings: Offering[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      offerings.filter((o) => (showArchived ? true : o.status !== "archived")),
    [offerings, showArchived],
  );

  async function loadOfferings(includeArchived = showArchived) {
    const res = await fetch(
      `/api/admin/offerings?includeArchived=${includeArchived ? "1" : "0"}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Failed to load offerings");
    setOfferings(data.offerings as Offering[]);
  }

  async function onSyncStripe() {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/offerings?includeArchived=1&syncStripe=1`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Stripe sync failed");
      setOfferings(data.offerings as Offering[]);
      const synced = data.stripeSync?.synced ?? 0;
      const errs = data.stripeSync?.errors?.length ?? 0;
      setMessage(
        errs
          ? `Synced ${synced} offering(s); ${errs} failed.`
          : `Synced ${synced} offering(s) to Stripe.`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function onSave() {
    setError(null);
    setMessage(null);
    try {
      const payload = formToPayload(form);
      if (creating) {
        const res = await fetch("/api/admin/offerings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Create failed");
        setCreating(false);
        setEditingId(null);
        setForm(emptyForm());
        await loadOfferings(true);
        setMessage("Offering created and published to Stripe.");
      } else if (editingId) {
        const res = await fetch(`/api/admin/offerings/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Update failed");
        setEditingId(null);
        setForm(emptyForm());
        await loadOfferings(true);
        setMessage("Offering updated.");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function setStatus(id: string, status: OfferingStatus) {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/offerings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Status update failed");
      await loadOfferings(true);
      setMessage(`Marked ${status}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function onDuplicate(id: string) {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/offerings/${id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Duplicate failed");
      await loadOfferings(true);
      setMessage("Offering duplicated as draft.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  const formOpen = creating || editingId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wide uppercase">
            Offerings
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Create and manage payment offerings. Saving publishes Product and
            Price objects to Stripe automatically — no Dashboard or env Price
            IDs required.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSyncStripe()}
            disabled={pending}
            className="border border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-surface"
          >
            Sync missing to Stripe
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setForm(emptyForm());
              setError(null);
            }}
            className="bg-brand px-3 py-2 text-xs font-semibold tracking-wide text-background uppercase"
          >
            New offering
          </button>
        </div>
      </div>

      {error ? (
        <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {formOpen ? (
        <div className="space-y-4 border border-border bg-surface p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            {creating ? "Create offering" : "Edit offering"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Name
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Slug
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.slug}
                placeholder="auto from name"
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs tracking-wide text-muted uppercase">
                Description
              </span>
              <textarea
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Type
              </span>
              <select
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.productType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    productType: e.target.value as ProductType,
                  }))
                }
              >
                <option value="membership">Membership</option>
                <option value="package">Package</option>
                <option value="drop_in">Drop-in</option>
                <option value="addon">Add-on</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Category
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Payment
              </span>
              <select
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.paymentType}
                onChange={(e) => {
                  const paymentType = e.target.value as PaymentType;
                  setForm((f) => ({
                    ...f,
                    paymentType,
                    billingInterval:
                      paymentType === "one_time" ? "one_time" : "month",
                  }));
                }}
              >
                <option value="subscription">Subscription</option>
                <option value="one_time">One-time</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Price (USD)
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                inputMode="decimal"
                value={form.priceDollars}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceDollars: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Status
              </span>
              <select
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as OfferingStatus,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Session credits
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2"
                value={form.sessionCredits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sessionCredits: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSave()}
              className="bg-brand px-4 py-2 text-xs font-semibold tracking-wide text-background uppercase"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="border border-border px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => {
            setShowArchived(e.target.checked);
            void loadOfferings(e.target.checked).catch((err) =>
              setError(err instanceof Error ? err.message : "Load failed"),
            );
          }}
        />
        Show archived
      </label>

      <div className="overflow-x-auto border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{o.name}</div>
                  <div className="text-xs text-muted">{o.slug}</div>
                </td>
                <td className="px-4 py-3 uppercase">
                  {o.productType}
                  <div className="text-xs text-muted normal-case">
                    {o.paymentType === "subscription" ? "Recurring" : "One-time"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {formatMoney(o.priceCents)}
                  {o.paymentType === "subscription" ? (
                    <span className="text-muted"> / mo</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-xs font-semibold tracking-wide uppercase",
                      o.status === "active" && "text-emerald-400",
                      o.status === "draft" && "text-amber-300",
                      o.status === "inactive" && "text-muted",
                      o.status === "archived" && "text-red-300",
                    )}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {o.currentStripePriceId ? (
                    <span className="text-emerald-400">Linked</span>
                  ) : (
                    <span className="text-amber-300">Needs sync</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wide uppercase">
                    <button
                      type="button"
                      className="text-brand hover:underline"
                      onClick={() => {
                        setCreating(false);
                        setEditingId(o.id);
                        setForm(offeringToForm(o));
                      }}
                    >
                      Edit
                    </button>
                    {o.status !== "active" ? (
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => void setStatus(o.id, "active")}
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => void setStatus(o.id, "inactive")}
                      >
                        Deactivate
                      </button>
                    )}
                    {o.status !== "archived" ? (
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => void setStatus(o.id, "archived")}
                      >
                        Archive
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => void onDuplicate(o.id)}
                    >
                      Duplicate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No offerings yet. Create one to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
