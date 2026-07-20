"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  label?: string;
  redirectTo?: string;
  showIcon?: boolean;
};

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function SignOutButton({
  className,
  label = "Sign out",
  redirectTo = "/",
  showIcon = false,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign(redirectTo);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={signOut}
      className={cn(
        "text-left transition disabled:opacity-50",
        showIcon && "inline-flex items-center gap-2",
        className,
      )}
    >
      {showIcon ? <SignOutIcon className="h-5 w-5 shrink-0" /> : null}
      {pending ? "Signing out…" : label}
    </button>
  );
}
