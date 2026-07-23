"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { MemberDirectoryRow } from "@/features/auth/types";
import {
  allowedActionsForStatus,
  clientStatusLabel,
  type MemberLifecycleAction,
} from "@/lib/auth/client-lifecycle";

type AdminClientsManagerProps = {
  members: MemberDirectoryRow[];
};

const ACTION_LABELS: Record<MemberLifecycleAction, string> = {
  revoke_invite: "Revoke invitation",
  restore_invitation: "Restore invitation",
  pause_access: "Pause access",
  restore_access: "Restore access",
  delete: "Remove",
  restore_deleted: "Restore client",
};

const CONFIRM_MESSAGES: Partial<Record<MemberLifecycleAction, string>> = {
  revoke_invite:
    "Revoke this invitation?\n\nThe current invitation will no longer work. The client will not be given portal access. You can restore the invitation later and send a new one.",
  pause_access:
    "Pause this client’s access?\n\nThey will temporarily lose access to the client portal, but their records and history will remain available.",
  delete:
    "Remove this client from the directory?\n\nThey will lose portal access and disappear from this list. Their billing and attendance history is kept.\n\nTo bring them back later, invite the same email again — their history will stay linked.",
  restore_invitation:
    "Restore this invitation?\n\nThe client will return to invited status. Send a new invitation email after restoring.",
  restore_access:
    "Restore this client’s portal access?\n\nThey will be able to sign in again immediately.",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusBadgeClass(status: MemberDirectoryRow["clientStatus"]): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-700";
    case "invited":
      return "bg-sky-500/10 text-sky-700";
    case "paused":
      return "bg-amber-500/10 text-amber-800";
    case "invite_revoked":
      return "bg-rose-500/10 text-rose-700";
    case "deleted":
      return "bg-muted/20 text-muted";
    default:
      return "bg-muted/20 text-muted";
  }
}

export function AdminClientsManager({
  members,
}: AdminClientsManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [role, setRole] = useState<"client" | "coach">("client");

  const visibleMembers = useMemo(
    () => members.filter((member) => member.clientStatus !== "deleted"),
    [members],
  );

  async function sendInvite(resendEmail?: string, resendName?: string) {
    setPending(true);
    setError(null);
    setMessage(null);

    const payload = resendEmail
      ? {
          email: resendEmail,
          fullName: resendName || resendEmail,
          role: "client" as const,
          resend: true,
        }
      : {
          fullName,
          email,
          phone,
          notes,
          role,
        };

    const res = await fetch("/api/admin/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send invitation");
      return;
    }

    setMessage(data.message ?? "Invitation sent");
    if (!resendEmail) {
      setFullName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setRole("client");
      setShowNewClient(false);
    }
    router.refresh();
  }

  async function runLifecycleAction(
    memberId: string,
    action: MemberLifecycleAction,
  ) {
    const confirmMessage = CONFIRM_MESSAGES[action];
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, action }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }

    if (action === "restore_invitation") {
      setMessage("Invitation restored — send a new invite email when ready.");
    } else if (action === "restore_access") {
      setMessage("Client access restored.");
    } else if (action === "revoke_invite") {
      setMessage("Invitation revoked.");
    } else if (action === "pause_access") {
      setMessage("Client access paused.");
    } else if (action === "delete") {
      setMessage("Client removed from directory.");
    } else {
      setMessage("Updated.");
    }
    router.refresh();
  }

  function renderActions(member: MemberDirectoryRow) {
    const actions = allowedActionsForStatus(member.clientStatus);
    const buttons: ReactNode[] = [];

    if (
      member.clientStatus === "invited"
    ) {
      buttons.push(
        <button
          key="resend"
          type="button"
          disabled={pending}
          onClick={() => void sendInvite(member.email, member.fullName)}
          className="inline-flex min-h-9 items-center border border-border px-2.5 text-[11px] font-semibold tracking-wide uppercase"
        >
          Resend invite
        </button>,
      );
    }

    for (const action of actions) {
      buttons.push(
        <button
          key={action}
          type="button"
          disabled={pending}
          onClick={() => void runLifecycleAction(member.id, action)}
          className="inline-flex min-h-9 items-center border border-border px-2.5 text-[11px] font-semibold tracking-wide uppercase"
        >
          {ACTION_LABELS[action]}
        </button>,
      );
    }

    return buttons;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Invite members by email. New accounts are invitation-only.
        </p>
        <button
          type="button"
          onClick={() => setShowNewClient((open) => !open)}
          className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          {showNewClient ? "Close" : "New client"}
        </button>
      </div>

      {showNewClient ? (
        <div className="grid gap-3 border border-border bg-surface p-5 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Full name
            </span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Phone
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Role
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "client" | "coach")}
              className="min-h-11 w-full border border-border bg-background px-3"
            >
              <option value="client">Member (client)</option>
              <option value="coach">Coach</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Notes
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <button
            type="button"
            disabled={pending || !fullName || !email}
            onClick={() => void sendInvite()}
            className="inline-flex min-h-11 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50 sm:col-span-2"
          >
            {pending ? "Sending…" : "Send invitation"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Invited</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No members yet. Send an invitation to add the first account.
                </td>
              </tr>
            ) : (
              visibleMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium">{member.fullName}</td>
                  <td className="px-4 py-3 text-muted">{member.email}</td>
                  <td className="px-4 py-3 text-muted">{member.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${statusBadgeClass(member.clientStatus)}`}
                    >
                      {clientStatusLabel(member.clientStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(member.invitedAt)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(member.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {renderActions(member)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
