"use client";

import { useRef, useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";
import Image from "next/image";

import type { CoachRosterEntry, FacilitySettings } from "@/features/settings/types";
import { uploadLogoFromBrowser } from "@/lib/assets/browser-upload";

const DEMO_LOGO_KEY = "ma5_demo_logo";

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full border border-border bg-background px-3"
      />
    </label>
  );
}

export function FacilitySettingsForm({
  initial,
  coaches,
}: {
  initial: FacilitySettings;
  coaches: CoachRosterEntry[];
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initial);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    if (initial.logoUrl && initial.logoUrl !== "local:logo") {
      return initial.logoUrl;
    }
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEMO_LOGO_KEY);
    }
    return null;
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [roster, setRoster] = useState(coaches);

  function set<K extends keyof FacilitySettings>(
    key: K,
    value: FacilitySettings[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(partial?: Partial<FacilitySettings>) {
    setPending(true);
    setError(null);
    setMessage(null);
    const body = partial ?? form;
    try {
      const res = await fetch("/api/admin/facility-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setMessage(data.warning ? "Saved (demo store)" : "Saved");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadLogoFromBrowser({ file });
      if ("path" in uploaded) {
        await save({ logoStoragePath: uploaded.path });
        setLogoPreview(uploaded.url);
        localStorage.removeItem(DEMO_LOGO_KEY);
        setMessage("Logo saved");
        return;
      }
      if (uploaded.demoDataUrl) {
        localStorage.setItem(DEMO_LOGO_KEY, uploaded.demoDataUrl);
        setLogoPreview(uploaded.demoDataUrl);
        await save({ logoStoragePath: "local:logo" });
        setMessage(
          uploaded.error === "demo"
            ? "Logo saved on this device (demo)"
            : `Saved locally — ${uploaded.error}`,
        );
        return;
      }
      throw new Error(uploaded.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setPending(false);
    }
  }

  async function inviteCoach() {
    setInvitePending(true);
    setInviteError(null);
    setInviteMessage(null);
    try {
      const res = await fetch("/api/admin/coaches/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: inviteName,
          email: inviteEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invite failed");
      if (data.coach) {
        setRoster((prev) => [...prev, data.coach as CoachRosterEntry]);
      }
      setInviteMessage(data.message ?? "Invite sent");
      setInviteName("");
      setInviteEmail("");
      refresh();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInvitePending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Gym information
        </p>
        <p className="mt-2 text-sm text-muted">
          How MA5 shows up to clients and on the public site.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FieldInput
            label="Name"
            value={form.gymName}
            onChange={(v) => set("gymName", v)}
          />
          <FieldInput
            label="Legal name"
            value={form.legalName}
            onChange={(v) => set("legalName", v)}
          />
          <div className="sm:col-span-2">
            <FieldInput
              label="Address"
              value={form.addressLine}
              onChange={(v) => set("addressLine", v)}
            />
          </div>
          <FieldInput
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            save({
              gymName: form.gymName,
              legalName: form.legalName,
              addressLine: form.addressLine,
              email: form.email,
            })
          }
          className="mt-5 inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save gym info"}
        </button>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Business hours
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FieldInput
            label="Open gym"
            value={form.openGymHours}
            onChange={(v) => set("openGymHours", v)}
          />
          <FieldInput
            label="Coaching"
            value={form.coachingHours}
            onChange={(v) => set("coachingHours", v)}
          />
          <div className="sm:col-span-2">
            <FieldInput
              label="Summary"
              value={form.hoursSummary}
              onChange={(v) => set("hoursSummary", v)}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            save({
              openGymHours: form.openGymHours,
              coachingHours: form.coachingHours,
              hoursSummary: form.hoursSummary,
            })
          }
          className="mt-5 inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save hours"}
        </button>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Coaches
            </p>
            <p className="mt-2 text-sm text-muted">
              Invite staff who can publish programs and run sessions.
            </p>
          </div>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {roster.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4"
            >
              <div>
                <p className="font-display text-lg tracking-wide uppercase">
                  {c.fullName}
                </p>
                <p className="mt-1 text-sm text-muted">{c.roleLabel}</p>
                {c.status === "invited" ? (
                  <p className="mt-0.5 text-xs hub-text-warning">Invite pending</p>
                ) : null}
              </div>
              <p className="text-sm text-muted">{c.email}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <FieldInput
            label="Full name"
            value={inviteName}
            onChange={setInviteName}
          />
          <FieldInput
            label="Email"
            value={inviteEmail}
            onChange={setInviteEmail}
          />
        </div>
        <button
          type="button"
          disabled={invitePending || !inviteName || !inviteEmail}
          onClick={inviteCoach}
          className="mt-4 inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {invitePending ? "Inviting…" : "Invite coach"}
        </button>
        {inviteMessage ? (
          <p className="mt-2 text-sm hub-text-success">{inviteMessage}</p>
        ) : null}
        {inviteError ? (
          <p className="mt-2 text-sm text-brand" role="alert">
            {inviteError}
          </p>
        ) : null}
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Branding
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="relative size-16 overflow-hidden rounded-full border border-border bg-background">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="" className="size-full object-cover" />
            ) : (
              <Image
                src="/images/brand/ma5-logo.jpeg"
                alt=""
                width={64}
                height={64}
                className="size-16 object-cover"
              />
            )}
          </div>
          <div className="space-y-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase disabled:opacity-50"
            >
              {pending ? "Uploading…" : "Replace logo"}
            </button>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide uppercase">
                Brand color
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandPrimary}
                  onChange={(e) => set("brandPrimary", e.target.value)}
                  className="h-11 w-14 border border-border bg-background"
                />
                <input
                  value={form.brandPrimary}
                  onChange={(e) => set("brandPrimary", e.target.value)}
                  className="min-h-11 w-28 border border-border bg-background px-3 font-mono text-sm"
                />
              </div>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => save({ brandPrimary: form.brandPrimary })}
              className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save brand color"}
            </button>
          </div>
        </div>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Notification settings
        </p>
        <div className="mt-3">
          {(
            [
              {
                key: "notifyFailedPayments" as const,
                label: "Failed payment alerts",
                description: "Email owners when a membership charge fails",
              },
              {
                key: "notifyNewSignups" as const,
                label: "New client signups",
                description: "Notify when someone joins or buys a plan",
              },
              {
                key: "notifyMessageDigest" as const,
                label: "Unread message digest",
                description: "Morning summary of unanswered client messages",
              },
              {
                key: "notifyCapacityWarnings" as const,
                label: "Capacity warnings",
                description: "Alert when a class is nearly full",
              },
            ] as const
          ).map((row) => (
            <label
              key={row.key}
              className="flex cursor-pointer items-start justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <span>
                <span className="block text-sm text-foreground">{row.label}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {row.description}
                </span>
              </span>
              <input
                type="checkbox"
                checked={form[row.key]}
                onChange={(e) => set(row.key, e.target.checked)}
                className="mt-1 size-4 accent-[var(--brand)]"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            save({
              notifyFailedPayments: form.notifyFailedPayments,
              notifyNewSignups: form.notifyNewSignups,
              notifyMessageDigest: form.notifyMessageDigest,
              notifyCapacityWarnings: form.notifyCapacityWarnings,
            })
          }
          className="mt-5 inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save notifications"}
        </button>
      </section>

      {message ? <p className="text-sm hub-text-success">{message}</p> : null}
      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
