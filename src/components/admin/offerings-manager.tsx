"use client";

import { useMemo, useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import {
  CUSTOM_OFFERING_CATEGORY,
  formatOfferingCategory,
  isPresetOfferingCategory,
  normalizeOfferingCategory,
  OFFERING_CATEGORY_PRESETS,
} from "@/lib/billing/offering-categories";
import {
  OFFERING_LIFECYCLE_CONFIRM,
  offeringStatusLabel,
  type OfferingLifecycleAction,
} from "@/lib/billing/offering-lifecycle";
import type { Offering, PaymentType, ProductType } from "@/lib/billing/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "ma5-select mt-1 w-full border border-border bg-background px-3 py-2 disabled:opacity-70";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type FormState = {
  name: string;
  description: string;
  productType: ProductType;
  categorySelect: string;
  categoryCustom: string;
  paymentType: PaymentType;
  priceDollars: string;
  billingInterval: "month" | "one_time";
  sessionCredits: string;
  displayOrder: string;
};

type ListTab = "active" | "archived";

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  productType: "membership",
  categorySelect: "small_group",
  categoryCustom: "",
  paymentType: "subscription",
  priceDollars: "",
  billingInterval: "month",
  sessionCredits: "",
  displayOrder: "0",
});

function categoryToForm(category: string | null): Pick<FormState, "categorySelect" | "categoryCustom"> {
  if (!category || isPresetOfferingCategory(category)) {
    return {
      categorySelect: category || "small_group",
      categoryCustom: "",
    };
  }
  return {
    categorySelect: CUSTOM_OFFERING_CATEGORY,
    categoryCustom: formatOfferingCategory(category),
  };
}

function categoryFromForm(form: FormState): string | null {
  if (form.categorySelect === CUSTOM_OFFERING_CATEGORY) {
    const normalized = normalizeOfferingCategory(form.categoryCustom);
    return normalized || null;
  }
  return form.categorySelect;
}

function offeringToForm(o: Offering): FormState {
  return {
    name: o.name,
    description: o.description ?? "",
    productType: o.productType,
    ...categoryToForm(o.category),
    paymentType: o.paymentType,
    priceDollars: (o.priceCents / 100).toFixed(o.priceCents % 100 === 0 ? 0 : 2),
    billingInterval: o.billingInterval === "one_time" ? "one_time" : "month",
    sessionCredits:
      o.sessionCredits === null || o.sessionCredits === undefined
        ? ""
        : String(o.sessionCredits),
    displayOrder: String(o.displayOrder),
  };
}

function formToPayload(form: FormState) {
  const dollars = Number.parseFloat(form.priceDollars);
  if (Number.isNaN(dollars) || dollars < 0) {
    throw new Error("Enter a valid price");
  }
  if (
    form.categorySelect === CUSTOM_OFFERING_CATEGORY &&
    !form.categoryCustom.trim()
  ) {
    throw new Error("Enter a name for the new category");
  }
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    productType: form.productType,
    category: categoryFromForm(form),
    paymentType: form.paymentType,
    priceCents: Math.round(dollars * 100),
    billingInterval:
      form.paymentType === "one_time" ? ("one_time" as const) : form.billingInterval,
    sessionCredits: form.sessionCredits.trim()
      ? Number.parseInt(form.sessionCredits, 10)
      : null,
    displayOrder: Number.parseInt(form.displayOrder || "0", 10) || 0,
  };
}

function StatusBadge({ offering }: { offering: Offering }) {
  const label = offeringStatusLabel(offering.status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-wide",
        offering.status === "active" &&
          "hub-badge-success",
        offering.status === "inactive" &&
          "border-border bg-background text-muted",
        offering.status === "archived" &&
          "border-red-500/30 bg-red-500/10 text-red-300",
        offering.status === "draft" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-300",
      )}
    >
      {label}
    </span>
  );
}

export function OfferingsManager({
  initialOfferings,
}: {
  initialOfferings: Offering[];
}) {
  const { refresh, isRefreshing } = useServerRefresh();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [tab, setTab] = useState<ListTab>("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeList = useMemo(
    () => offerings.filter((o) => o.status !== "archived"),
    [offerings],
  );
  const archivedList = useMemo(
    () => offerings.filter((o) => o.status === "archived"),
    [offerings],
  );
  const visible = tab === "archived" ? archivedList : activeList;

  const readOnly = viewingId !== null;
  const formOpen = creating || editingId !== null || viewingId !== null;

  async function loadOfferings() {
    const res = await fetch("/api/admin/offerings?includeArchived=1");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Failed to load offerings");
    setOfferings(data.offerings as Offering[]);
  }

  function closeForm() {
    setCreating(false);
    setEditingId(null);
    setViewingId(null);
    setForm(emptyForm());
  }

  async function onSyncStripe() {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        "/api/admin/offerings?includeArchived=1&syncStripe=1",
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
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function onSave() {
    if (readOnly) return;
    setError(null);
    setMessage(null);
    try {
      const payload = formToPayload(form);
      if (creating) {
        const res = await fetch("/api/admin/offerings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, status: "active" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Create failed");
        closeForm();
        await loadOfferings();
        setMessage("Offering created and published to Stripe.");
      } else if (editingId) {
        const res = await fetch(`/api/admin/offerings/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Update failed");
        closeForm();
        await loadOfferings();
        setMessage("Offering updated.");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function runLifecycle(id: string, action: OfferingLifecycleAction) {
    if (action !== "show") {
      const ok = window.confirm(OFFERING_LIFECYCLE_CONFIRM[action]);
      if (!ok) return;
    }

    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/offerings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleAction: action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");

      await loadOfferings();
      const labels: Record<OfferingLifecycleAction, string> = {
        hide: "Offering hidden from customers.",
        show: "Offering is now active and visible to customers.",
        archive: "Offering archived.",
        restore: "Offering restored as Hidden — review before showing to customers.",
      };
      setMessage(labels[action]);
      if (action === "archive") setTab("archived");
      if (action === "restore") setTab("active");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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
      await loadOfferings();
      setTab("active");
      setMessage("Offering duplicated as a draft.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  function openEdit(o: Offering) {
    setCreating(false);
    setViewingId(null);
    setEditingId(o.id);
    setForm(offeringToForm(o));
  }

  function openView(o: Offering) {
    setCreating(false);
    setEditingId(null);
    setViewingId(o.id);
    setForm(offeringToForm(o));
  }

  function renderActions(o: Offering) {
    if (o.status === "archived") {
      return (
        <>
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => openView(o)}
          >
            View
          </button>
          <button
            type="button"
            className="hover:underline"
            onClick={() => void runLifecycle(o.id, "restore")}
          >
            Restore
          </button>
          <button
            type="button"
            className="hover:underline"
            onClick={() => void onDuplicate(o.id)}
          >
            Duplicate
          </button>
        </>
      );
    }

    if (o.status === "active") {
      return (
        <>
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => openEdit(o)}
          >
            Edit
          </button>
          <button
            type="button"
            className="hover:underline"
            onClick={() => void runLifecycle(o.id, "hide")}
          >
            Hide
          </button>
          <button
            type="button"
            className="hover:underline"
            onClick={() => void onDuplicate(o.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="hover:underline"
            onClick={() => void runLifecycle(o.id, "archive")}
          >
            Archive
          </button>
        </>
      );
    }

    // Hidden (inactive) or draft
    return (
      <>
        <button
          type="button"
          className="text-brand hover:underline"
          onClick={() => openEdit(o)}
        >
          Edit
        </button>
        <button
          type="button"
          className="hover:underline"
          onClick={() => void runLifecycle(o.id, "show")}
        >
          Show
        </button>
        <button
          type="button"
          className="hover:underline"
          onClick={() => void onDuplicate(o.id)}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="hover:underline"
          onClick={() => void runLifecycle(o.id, "archive")}
        >
          Archive
        </button>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <h2 className="font-display text-3xl tracking-wide uppercase">
            Offerings
          </h2>
          <details className="group relative mt-1">
            <summary
              className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full border border-border text-sm text-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
              aria-label="Offering status help"
            >
              i
            </summary>
            <div className="absolute top-full left-0 z-10 mt-2 w-72 border border-border bg-surface p-3 text-sm leading-relaxed text-muted shadow-lg">
              Manage what customers can buy.{" "}
              <strong className="font-medium text-foreground">Active</strong>{" "}
              offerings are visible for purchase.{" "}
              <strong className="font-medium text-foreground">Hidden</strong>{" "}
              offerings are temporarily off the storefront.{" "}
              <strong className="font-medium text-foreground">Archived</strong>{" "}
              offerings are retired but all history is kept.
            </div>
          </details>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSyncStripe()}
            disabled={isRefreshing}
            className="border border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-surface"
          >
            Sync missing to Stripe
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setViewingId(null);
              setForm(emptyForm());
              setError(null);
              setTab("active");
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
            {creating
              ? "Create offering"
              : readOnly
                ? "View offering"
                : "Edit offering"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs tracking-wide text-muted uppercase">
                Name
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2 disabled:opacity-70"
                value={form.name}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {!readOnly ? (
                <span className="mt-1 block text-xs text-muted">
                  Shown to customers on checkout and your pricing page.
                </span>
              ) : null}
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs tracking-wide text-muted uppercase">
                Description
              </span>
              <textarea
                className="mt-1 w-full border border-border bg-background px-3 py-2 disabled:opacity-70"
                rows={2}
                disabled={readOnly}
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
                className={selectClassName}
                disabled={readOnly}
                value={form.productType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    productType: e.target.value as ProductType,
                  }))
                }
              >
                {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
                  <option key={type} value={type}>
                    {PRODUCT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Category
              </span>
              <select
                className={selectClassName}
                disabled={readOnly}
                value={form.categorySelect}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categorySelect: e.target.value }))
                }
              >
                {OFFERING_CATEGORY_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                <option value={CUSTOM_OFFERING_CATEGORY}>Add category…</option>
              </select>
              {form.categorySelect === CUSTOM_OFFERING_CATEGORY ? (
                <input
                  className="mt-2 w-full border border-border bg-background px-3 py-2 disabled:opacity-70"
                  disabled={readOnly}
                  placeholder="e.g. Youth training"
                  value={form.categoryCustom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryCustom: e.target.value }))
                  }
                />
              ) : null}
              <span className="mt-1 block text-xs text-muted">
                Groups this offering on your public pricing page.
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Payment
              </span>
              <select
                className={selectClassName}
                disabled={readOnly}
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
                className="mt-1 w-full border border-border bg-background px-3 py-2 disabled:opacity-70"
                disabled={readOnly}
                inputMode="decimal"
                value={form.priceDollars}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceDollars: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs tracking-wide text-muted uppercase">
                Session credits
              </span>
              <input
                className="mt-1 w-full border border-border bg-background px-3 py-2 disabled:opacity-70"
                disabled={readOnly}
                value={form.sessionCredits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sessionCredits: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly ? (
              <button
                type="button"
                onClick={() => void onSave()}
                className="bg-brand px-4 py-2 text-xs font-semibold tracking-wide text-background uppercase"
              >
                Save
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeForm}
              className="border border-border px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            >
              {readOnly ? "Close" : "Cancel"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={cn(
            "px-4 py-2 text-xs font-semibold tracking-wide uppercase",
            tab === "active"
              ? "border-b-2 border-brand text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Offerings ({activeList.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("archived")}
          className={cn(
            "px-4 py-2 text-xs font-semibold tracking-wide uppercase",
            tab === "archived"
              ? "border-b-2 border-brand text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Archived ({archivedList.length})
        </button>
      </div>

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
                  {o.category ? (
                    <div className="text-xs text-muted">
                      {formatOfferingCategory(o.category)}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {PRODUCT_TYPE_LABELS[o.productType]}
                  <div className="text-xs text-muted">
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
                  <StatusBadge offering={o} />
                  {o.archivedAt ? (
                    <div className="mt-1 text-xs text-muted">
                      {new Date(o.archivedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {o.currentStripePriceId ? (
                    <span className="hub-text-success">Linked</span>
                  ) : (
                    <span className="text-amber-300">Needs sync</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wide uppercase">
                    {renderActions(o)}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {tab === "archived"
                    ? "No archived offerings."
                    : "No offerings yet. Create one to get started."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
