"use client";

import { useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import type {
  ClientProfileSettings,
  ClientWaiver,
} from "@/features/settings/types";
import { PasswordField } from "@/components/ui/password-field";
import { cn } from "@/lib/utils";

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full border border-border bg-background px-3"
      />
    </label>
  );
}

function SaveBar({
  pending,
  message,
  error,
  onSave,
}: {
  pending: boolean;
  message: string | null;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {message ? <p className="text-sm hub-text-success">{message}</p> : null}
      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function patchProfile(body: Record<string, unknown>) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not save");
  return data as { ok: boolean; warning?: string };
}

export function ProfileContactForm({
  initial,
}: {
  initial: Pick<
    ClientProfileSettings,
    "fullName" | "preferredName" | "email" | "phone"
  >;
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [fullName, setFullName] = useState(initial.fullName);
  const [preferredName, setPreferredName] = useState(initial.preferredName);
  const [phone, setPhone] = useState(initial.phone);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const data = await patchProfile({ fullName, preferredName, phone });
      setMessage(data.warning ? "Saved (demo store)" : "Saved");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput label="Full name" value={fullName} onChange={setFullName} />
        <FieldInput
          label="Preferred name"
          value={preferredName}
          onChange={setPreferredName}
        />
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Email
          </span>
          <input
            value={initial.email}
            disabled
            className="min-h-11 w-full border border-border bg-background px-3 text-muted"
          />
        </label>
        <FieldInput label="Phone" value={phone} onChange={setPhone} />
      </div>
      <SaveBar
        pending={pending}
        message={message}
        error={error}
        onSave={save}
      />
    </div>
  );
}

export function ProfileEmergencyForm({
  initial,
}: {
  initial: Pick<
    ClientProfileSettings,
    | "emergencyName"
    | "emergencyRelationship"
    | "emergencyPhone"
    | "emergencyNotes"
  >;
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [emergencyName, setEmergencyName] = useState(initial.emergencyName);
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    initial.emergencyRelationship,
  );
  const [emergencyPhone, setEmergencyPhone] = useState(initial.emergencyPhone);
  const [emergencyNotes, setEmergencyNotes] = useState(initial.emergencyNotes);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const data = await patchProfile({
        emergencyName,
        emergencyRelationship,
        emergencyPhone,
        emergencyNotes,
      });
      setMessage(data.warning ? "Saved (demo store)" : "Saved");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          label="Name"
          value={emergencyName}
          onChange={setEmergencyName}
        />
        <FieldInput
          label="Relationship"
          value={emergencyRelationship}
          onChange={setEmergencyRelationship}
        />
        <FieldInput
          label="Phone"
          value={emergencyPhone}
          onChange={setEmergencyPhone}
        />
        <FieldInput
          label="Notes"
          value={emergencyNotes}
          onChange={setEmergencyNotes}
        />
      </div>
      <SaveBar
        pending={pending}
        message={message}
        error={error}
        onSave={save}
      />
    </div>
  );
}

export function ProfileNotificationsForm({
  initial,
}: {
  initial: Pick<
    ClientProfileSettings,
    | "notifyCoachMessages"
    | "notifySessionReminders"
    | "notifyProgramUpdates"
    | "notifyBillingAlerts"
  >;
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [notifyCoachMessages, setNotifyCoachMessages] = useState(
    initial.notifyCoachMessages,
  );
  const [notifySessionReminders, setNotifySessionReminders] = useState(
    initial.notifySessionReminders,
  );
  const [notifyProgramUpdates, setNotifyProgramUpdates] = useState(
    initial.notifyProgramUpdates,
  );
  const [notifyBillingAlerts, setNotifyBillingAlerts] = useState(
    initial.notifyBillingAlerts,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = [
    {
      label: "Coach messages",
      description: "Email when your coach sends a message",
      value: notifyCoachMessages,
      set: setNotifyCoachMessages,
    },
    {
      label: "Session reminders",
      description: "Reminders before booked facility sessions",
      value: notifySessionReminders,
      set: setNotifySessionReminders,
    },
    {
      label: "Program updates",
      description: "When a new workout is published",
      value: notifyProgramUpdates,
      set: setNotifyProgramUpdates,
    },
    {
      label: "Billing alerts",
      description: "Failed payments and renewal notices",
      value: notifyBillingAlerts,
      set: setNotifyBillingAlerts,
    },
  ] as const;

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const data = await patchProfile({
        notifyCoachMessages,
        notifySessionReminders,
        notifyProgramUpdates,
        notifyBillingAlerts,
      });
      setMessage(data.warning ? "Saved (demo store)" : "Saved");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {rows.map((row) => (
        <label
          key={row.label}
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
            checked={row.value}
            onChange={(e) => row.set(e.target.checked)}
            className="mt-1 size-4 accent-[var(--brand)]"
          />
        </label>
      ))}
      <SaveBar
        pending={pending}
        message={message}
        error={error}
        onSave={save}
      />
    </div>
  );
}

export function ProfileWaiversList({ waivers }: { waivers: ClientWaiver[] }) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sign(key: ClientWaiver["key"]) {
    setPendingKey(key);
    setError(null);
    try {
      await patchProfile({ signWaiverKey: key });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-border">
        {waivers.map((w) => (
          <li
            key={w.key}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="text-sm text-foreground">{w.label}</p>
              <p className="mt-0.5 text-xs text-muted">
                {w.signedAt ?? "Not signed"}
              </p>
            </div>
            {w.status === "signed" ? (
              <span className="text-xs font-semibold tracking-wide hub-text-success uppercase">
                Signed
              </span>
            ) : (
              <button
                type="button"
                disabled={pendingKey === w.key}
                onClick={() => sign(w.key)}
                className="inline-flex min-h-9 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase disabled:opacity-50"
              >
                {pendingKey === w.key ? "Signing…" : "Sign now"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-2 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ProfilePasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function save() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update");
      setMessage(
        data.demo
          ? "Demo mode — password change simulated"
          : "Password updated",
      );
      setPassword("");
      setConfirm("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Signed in as <span className="text-foreground">{email}</span>
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
        >
          Change password
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordField
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            minLength={8}
          />
          <SaveBar
            pending={pending}
            message={message}
            error={error}
            onSave={save}
          />
        </div>
      )}
      {!open && message ? (
        <p className={cn("mt-3 text-sm hub-text-success")}>{message}</p>
      ) : null}
      {!open && error ? (
        <p className="mt-3 text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
